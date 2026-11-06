import type { Catalog } from "./xtream";
export const demoCatalog: Catalog = {
  liveCategories: [
    { id: "news", name: "News" },
    { id: "nature", name: "Nature" },
    { id: "music", name: "Music" },
  ],
  movieCategories: [
    { id: "adventure", name: "Adventure" },
    { id: "drama", name: "Drama" },
  ],
  live: [
    { id: "1", name: "World Report", category: "news" },
    { id: "2", name: "Wild Earth", category: "nature" },
    { id: "3", name: "After Hours Radio", category: "music" },
    { id: "4", name: "Ocean Life", category: "nature" },
    { id: "5", name: "City News", category: "news" },
  ].map((item) => ({ ...item, kind: "live", extension: "m3u8" })),
  movie: [
    { id: "11", name: "Beyond the Horizon", category: "adventure" },
    { id: "12", name: "The Quiet City", category: "drama" },
    { id: "13", name: "Northern Lights", category: "adventure" },
    { id: "14", name: "One More Summer", category: "drama" },
  ].map((item) => ({ ...item, kind: "movie", extension: "mp4" })),
};
