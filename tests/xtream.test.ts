import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import {
  apiUrl,
  loadCatalog,
  normalizeServer,
  parseStreams,
  playbackUrl,
} from "../src/xtream";
const credentials = {
  server: "https://example.com:8443/",
  username: "a+b /",
  password: "p&?/#",
};
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("normalizes server paths and rejects malformed or credential-bearing addresses", () => {
  assert.equal(
    normalizeServer(" https://example.com/base/player_api.php "),
    "https://example.com/base",
  );
  for (const value of [
    "example.com",
    "ftp://example.com",
    "https://user:pass@example.com",
    "https://example.com?password=secret",
  ])
    assert.throws(() => normalizeServer(value));
});
test("encodes credentials in API queries and playback path segments", () => {
  const url = new URL(apiUrl(credentials, "get_live_streams"));
  assert.equal(url.searchParams.get("username"), credentials.username);
  assert.equal(url.searchParams.get("password"), credentials.password);
  assert.equal(url.searchParams.get("action"), "get_live_streams");
  assert.equal(
    playbackUrl(credentials, {
      id: "42",
      name: "Test",
      kind: "live",
      category: "",
      extension: "ts",
    }),
    "https://example.com:8443/live/a%2Bb%20%2F/p%26%3F%2F%23/42.m3u8",
  );
  assert.match(
    playbackUrl(credentials, {
      id: "3",
      name: "Movie",
      kind: "movie",
      category: "",
      extension: "mkv",
    }),
    /\/movie\/.*\/3\.mkv$/,
  );
});
test("normalizes lists and excludes invalid entries and artwork schemes", () => {
  assert.deepEqual(
    parseStreams(
      [
        null,
        {},
        {
          stream_id: 4,
          name: "Movie",
          category_id: 9,
          container_extension: "../bad",
          stream_icon: "file:///secret",
        },
      ],
      "movie",
    ),
    [
      {
        id: "4",
        name: "Movie",
        kind: "movie",
        category: "9",
        image: undefined,
        extension: "mp4",
      },
    ],
  );
  assert.throws(() => parseStreams({ error: "bad" }, "live"));
});
test("authenticates and loads all four catalog endpoints", async () => {
  const actions: (string | null)[] = [];
  globalThis.fetch = async (input) => {
    const action = new URL(String(input)).searchParams.get("action");
    actions.push(action);
    return Response.json(
      !action
        ? { user_info: { auth: "1", status: "Active" } }
        : action.includes("categories")
          ? [{ category_id: 1, category_name: "News" }]
          : [{ stream_id: 2, name: "Channel", category_id: 1 }],
    );
  };
  const catalog = await loadCatalog(credentials);
  assert.equal(actions.length, 5);
  assert.equal(catalog.live[0].kind, "live");
  assert.equal(catalog.movie[0].kind, "movie");
  assert.equal(catalog.liveCategories[0].name, "News");
});
test("rejects invalid credentials before loading catalog", async () => {
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    return Response.json({ user_info: { auth: 0 } });
  };
  await assert.rejects(
    loadCatalog(credentials),
    /rejected these login details/,
  );
  assert.equal(count, 1);
});
test("rejects expired accounts", async () => {
  globalThis.fetch = async () =>
    Response.json({ user_info: { auth: 1, status: "Expired" } });
  await assert.rejects(loadCatalog(credentials), /not active/);
});
test("sanitizes transport failures rather than leaking credential-bearing URLs", async () => {
  globalThis.fetch = async () => {
    throw new Error(apiUrl(credentials));
  };
  await assert.rejects(
    loadCatalog(credentials),
    (error) =>
      error instanceof Error &&
      !error.message.includes(credentials.password) &&
      !error.message.includes("username=") &&
      error.message.includes("Could not read"),
  );
});
test("reports HTTP failures and invalid JSON", async () => {
  globalThis.fetch = async () => new Response("", { status: 503 });
  await assert.rejects(loadCatalog(credentials), /HTTP 503/);
  globalThis.fetch = async () => new Response("not-json");
  await assert.rejects(loadCatalog(credentials), /Could not read/);
});
test("cancels an in-flight connection", async () => {
  globalThis.fetch = (_input, options) =>
    new Promise((_resolve, reject) => {
      options?.signal?.addEventListener(
        "abort",
        () => reject(new Error("aborted")),
        { once: true },
      );
    });
  const controller = new AbortController();
  const result = loadCatalog(credentials, controller.signal);
  controller.abort();
  await assert.rejects(result, /cancelled/);
});
