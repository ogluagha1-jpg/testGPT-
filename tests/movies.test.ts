import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { cleanMovieTitle } from "../src/movieTitles";
import {
  loadMovieDetails,
  parseMovieDetails,
  parseStreams,
  playbackUrl,
} from "../src/xtream";
const fetchBefore = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchBefore;
});
test("removes recognizable provider and release tags while preserving meaningful titles", () => {
  const cases = new Map([
    ["EN | The Matrix (1999) [FHD]", "The Matrix"],
    ["FR - The.Matrix.1999.1080p.WEB-DL.x264-GROUP.mkv", "The Matrix"],
    ["[4K] [EN] Dune: Part Two (2024)", "Dune: Part Two"],
    ["1917", "1917"],
    ["2001: A Space Odyssey", "2001: A Space Odyssey"],
    ["Blade Runner 2049", "Blade Runner 2049"],
    ["Class of 1984", "Class of 1984"],
    ["E.T. the Extra-Terrestrial", "E.T. the Extra-Terrestrial"],
    ["[REC]", "[REC]"],
    ["Amélie", "Amélie"],
    ["الرسالة (1976)", "الرسالة"],
    ["[HD]", "[HD]"],
  ]);
  for (const [raw, expected] of cases)
    assert.equal(cleanMovieTitle(raw), expected, raw);
});
test("movie title cleanup preserves IDs, stream URLs, and channel names", () => {
  const rows = [
    {
      stream_id: 72,
      name: "EN | The Matrix (1999) [FHD]",
      container_extension: "mkv",
    },
  ];
  const movie = parseStreams(rows, "movie")[0];
  assert.equal(movie.name, "The Matrix");
  assert.equal(parseStreams(rows, "live")[0].name, rows[0].name);
  assert.equal(
    playbackUrl(
      { server: "https://example.com", username: "u", password: "p" },
      movie,
    ),
    "https://example.com/movie/u/p/72.mkv",
  );
});
test("parses movie metadata and ignores invalid values and unsafe artwork URLs", () => {
  const result = parseMovieDetails({
    info: {
      name: "[HD] Movie (2024)",
      plot: "<p>A story &amp; a journey.</p>",
      releasedate: "2024-02-03",
      duration_secs: "7200",
      genre: "Drama",
      cast: "A, B",
      director: "C",
      rating: "8.2",
      movie_image: "file:///secret",
    },
  });
  assert.deepEqual(result, {
    title: "Movie",
    plot: "A story & a journey.",
    year: "2024",
    duration: "120 min",
    genre: "Drama",
    cast: "A, B",
    director: "C",
    rating: "8.2/10",
    image: undefined,
  });
  assert.equal(
    parseMovieDetails({ info: { rating: "0", duration_secs: "bad" } }).rating,
    undefined,
  );
  assert.equal(
    parseMovieDetails({ info: [], movie_data: { name: "Fallback" } }).title,
    "Fallback",
  );
  assert.throws(() => parseMovieDetails(null));
});
test("loads details using the original VOD ID and handles provider failure", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("action"), "get_vod_info");
    assert.equal(url.searchParams.get("vod_id"), "72");
    return Response.json({ info: { plot: "Synopsis" } });
  };
  assert.equal(
    (
      await loadMovieDetails(
        { server: "https://example.com", username: "u", password: "p" },
        "72",
      )
    ).plot,
    "Synopsis",
  );
  globalThis.fetch = async () => new Response("", { status: 503 });
  await assert.rejects(
    loadMovieDetails(
      { server: "https://example.com", username: "u", password: "p" },
      "72",
    ),
    /HTTP 503/,
  );
});
