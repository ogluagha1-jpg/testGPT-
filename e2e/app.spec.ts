import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("demo supports category filters, search, favorites, movies, and sign out", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Connect your playlist")).toBeVisible();
  await page.getByText("with demo mode →").click();
  await page.getByRole("tab", { name: "Live TV", exact: true }).click();
  await expect(page.getByText("World Report", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nature", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play Wild Earth", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("World Report", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add Wild Earth to favorites" })
    .click();
  await page.getByRole("tab", { name: "Favorites" }).click();
  await expect(
    page.getByRole("button", { name: "Play Wild Earth", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove Wild Earth from favorites" })
    .click();
  await expect(page.getByText("Keep the good ones close.")).toBeVisible();
  await page.getByRole("tab", { name: "Movies" }).click();
  await page.getByLabel("Search titles").fill("quiet");
  await expect(
    page.getByRole("button", {
      name: "Details for The Quiet City",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Details for Beyond the Horizon",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/currentline-movies.png",
    fullPage: true,
  });
  await page.getByLabel("Disconnect and remove saved login").click();
  await expect(page.getByText("Connect your playlist")).toBeVisible();
  expect(errors).toEqual([]);
});

test("connects to a mocked Xtream provider and reloads saved favorites", async ({
  page,
}) => {
  await page.route(
    "https://provider.example/player_api.php*",
    async (route) => {
      const action = new URL(route.request().url()).searchParams.get("action");
      const json = !action
        ? { user_info: { auth: 1, status: "Active" } }
        : action.includes("categories")
          ? [{ category_id: 1, category_name: "Test category" }]
          : [
              {
                stream_id: 17,
                name:
                  action === "get_live_streams"
                    ? "Test live channel"
                    : "Test movie",
                category_id: 1,
                container_extension: "mp4",
              },
            ];
      await route.fulfill({ json });
    },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Connect & explore" }).click();
  await expect(
    page.getByText("Enter your username and password."),
  ).toBeVisible();
  async function login() {
    await page.getByLabel("Server address").fill("https://provider.example");
    await page.getByLabel("Username", { exact: true }).fill("demo-user");
    await page.getByLabel("Password", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "Connect & explore" }).click();
    await page.getByRole("tab", { name: "Live TV", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Play Test live channel", exact: true }),
    ).toBeVisible();
  }
  await login();
  await page
    .getByRole("button", { name: "Add Test live channel to favorites" })
    .click();
  await page.getByLabel("Disconnect and remove saved login").click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await login();
  await page.getByRole("tab", { name: "Favorites" }).click();
  await expect(
    page.getByRole("button", { name: "Play Test live channel", exact: true }),
  ).toBeVisible();
});

test("cinema discovery has selectable features, responsive posters, and working sorting", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByText("with demo mode →").click();
  await expect(page.getByText("Tonight starts here.")).toBeVisible();
  await page
    .getByRole("button", { name: "Feature Northern Lights", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Details for featured Northern Lights" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add featured title to favorites" })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove featured title from favorites" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/currentline-discover.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "See all Movie night" }).click();
  await page
    .getByRole("button", { name: "Sort titles alphabetically" })
    .click();
  const titles = await page
    .getByRole("button", { name: /^Details for / })
    .allTextContents();
  expect(titles).toHaveLength(4);
  expect(titles[0]).toContain("Beyond the Horizon");
  expect(titles[3]).toContain("The Quiet City");
  const posterImage = page
    .getByRole("button", {
      name: "Details for Beyond the Horizon",
      exact: true,
    })
    .locator("img");
  await expect(posterImage).toHaveCount(1);
  expect(
    await posterImage.evaluate(
      (img) =>
        img.getBoundingClientRect().width <=
        img.closest('[role="button"]')!.getBoundingClientRect().width + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/currentline-grid.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Drama", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Details for Northern Lights",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel("Search titles").fill("no-match");
  await expect(page.getByText("No titles found.")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Details for Northern Lights",
      exact: true,
    }),
  ).toBeVisible();
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("button", {
        name: "Details for Beyond the Horizon",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/currentline-wide.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("cinema login and demo player have responsive layouts and working favorites", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Your cinema.", { exact: false })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("sample");
  await page.getByLabel("Show password").click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveJSProperty(
    "type",
    "text",
  );
  await page.getByLabel("Hide password").click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.screenshot({
    path: "test-results/currentline-login.png",
    fullPage: true,
  });
  await page.getByText("with demo mode →").click();
  await page
    .getByRole("button", { name: "Details for featured Beyond the Horizon" })
    .click();
  await expect(page.getByText("The story", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Watch Beyond the Horizon", exact: true })
    .click();
  await expect(page.getByText("PLAYER PREVIEW", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play playback" })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Save playing title to favorites" })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove playing title from favorites" }),
  ).toBeVisible();
  await page.getByText("Your next great watch.").scrollIntoViewIfNeeded();
  await expect(page.getByText("Your next great watch.")).toBeInViewport();
  await page.screenshot({
    path: "test-results/currentline-player.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to The Quiet City" }).click();
  await expect(
    page.getByText("The Quiet City", { exact: true }).last(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Watch The Quiet City", exact: true })
    .click();
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Close player" }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Close player" }).click();
  await page
    .getByRole("button", { name: "Back to library", exact: true })
    .click();
  await page.getByRole("tab", { name: "Favorites", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Details for Beyond the Horizon",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("movie player controls real browser video and handles failed live streams", async ({
  page,
}) => {
  await page.route(
    "https://provider.example/player_api.php*",
    async (route) => {
      const action = new URL(route.request().url()).searchParams.get("action");
      await route.fulfill({
        json: !action
          ? { user_info: { auth: 1, status: "Active" } }
          : action.includes("categories")
            ? []
            : [
                {
                  stream_id: 17,
                  name:
                    action === "get_live_streams" ? "Test live" : "Test movie",
                  container_extension: "mp4",
                },
              ],
      });
    },
  );
  const videoBytes = readFileSync("e2e/fixtures/playback.mp4");
  await page.route("https://provider.example/movie/**", (route) => {
    const range = route.request().headers()["range"];
    const match = range?.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = Number(match[1]);
      const end = Math.min(
        match[2] ? Number(match[2]) : videoBytes.length - 1,
        videoBytes.length - 1,
      );
      return route.fulfill({
        status: 206,
        body: videoBytes.subarray(start, end + 1),
        contentType: "video/mp4",
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${end}/${videoBytes.length}`,
        },
      });
    }
    return route.fulfill({
      body: videoBytes,
      contentType: "video/mp4",
      headers: { "Accept-Ranges": "bytes" },
    });
  });
  let failedRequests = 0;
  await page.route("https://provider.example/live/**", (route) => {
    failedRequests++;
    return route.fulfill({ status: 503, body: "Unavailable" });
  });
  await page.goto("/");
  await page.getByLabel("Server address").fill("https://provider.example");
  await page.getByLabel("Username", { exact: true }).fill("demo-user");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Connect & explore" }).click();
  await page
    .getByRole("button", { name: "Details for featured Test movie" })
    .click();
  await page
    .getByRole("button", { name: "Watch Test movie", exact: true })
    .click();
  const video = page.locator("video");
  await expect(video).toBeVisible();
  expect((await video.boundingBox())!.height).toBeGreaterThan(150);
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await expect(video).toHaveJSProperty("controls", true);
  for (const name of [
    "Play playback",
    "Pause playback",
    "Forward 10 seconds",
    "Back 10 seconds",
    "Mute",
    "Change playback speed",
    "Enter fullscreen",
  ]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  }
  // Native browser controls own playback; verify the media itself remains playable and seekable.
  await video.evaluate((element: HTMLVideoElement) => {
    element.pause();
    element.currentTime = 10;
  });
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThanOrEqual(10);
  await video.evaluate((element: HTMLVideoElement) => element.play());
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(false);
  await page.getByRole("button", { name: "Close player" }).click();
  await expect(video).toHaveCount(0);
  await page
    .getByRole("button", { name: "Back to library", exact: true })
    .click();
  await page.getByRole("tab", { name: "Live TV", exact: true }).click();
  await page
    .getByRole("button", { name: "Play Test live", exact: true })
    .click();
  await expect(page.getByText("A pause in the story.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Forward 10 seconds" }),
  ).toHaveCount(0);
  const beforeRetry = failedRequests;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect.poll(() => failedRequests).toBeGreaterThan(beforeRetry);
  await page.getByRole("button", { name: "Close player" }).click();
});

test("movie details clean provider titles, load metadata on demand, and recover from failure", async ({
  page,
}) => {
  let detailsRequests = 0;
  await page.route(
    "https://provider.example/player_api.php*",
    async (route) => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get("action");
      if (action === "get_vod_info") {
        expect(url.searchParams.get("vod_id")).toBe("72");
        detailsRequests++;
        if (detailsRequests === 1)
          return route.fulfill({ status: 503, body: "Unavailable" });
        return route.fulfill({
          json: {
            info: {
              name: "EN | The Matrix (1999) [FHD]",
              plot: "A programmer discovers an unexpected reality.",
              releasedate: "1999-03-31",
              duration_secs: 8160,
              rating: "8.7",
              genre: "Science fiction",
              cast: "Keanu Reeves, Carrie-Anne Moss",
              director: "The Wachowskis",
            },
          },
        });
      }
      await route.fulfill({
        json: !action
          ? { user_info: { auth: 1, status: "Active" } }
          : action.includes("categories")
            ? [{ category_id: 1, category_name: "Cinema" }]
            : action === "get_live_streams"
              ? []
              : [
                  {
                    stream_id: 72,
                    name: "EN | The.Matrix.1999.1080p.WEB-DL.x264-GROUP.mkv",
                    category_id: 1,
                    container_extension: "mkv",
                  },
                ],
      });
    },
  );
  await page.goto("/");
  await page.getByLabel("Server address").fill("https://provider.example");
  await page.getByLabel("Username", { exact: true }).fill("demo-user");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Connect & explore" }).click();
  await page
    .getByRole("button", {
      name: "Details for featured The Matrix",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      "The provider’s movie details could not be loaded. You can still try playing the movie.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Watch The Matrix", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("video")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Retry details", exact: true })
    .click();
  await expect(
    page.getByText("A programmer discovers an unexpected reality."),
  ).toBeVisible();
  await expect(page.getByText("136 min", { exact: true })).toBeVisible();
  await expect(page.getByText("1999", { exact: true })).toBeVisible();
  await expect(page.getByText("★ 8.7/10", { exact: true })).toBeVisible();
  await expect(page.getByText("The Wachowskis", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Save movie to favorites", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Remove movie from favorites",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/currentline-details.png",
    fullPage: true,
  });
  expect(new URL(page.url()).searchParams.has("password")).toBe(false);
  await page
    .getByRole("button", { name: "Back to library", exact: true })
    .click();
  await page.getByRole("tab", { name: "Favorites", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Details for The Matrix", exact: true }),
  ).toBeVisible();
  expect(detailsRequests).toBe(2);
});
