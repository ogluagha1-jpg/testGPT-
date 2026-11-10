import { cleanMovieTitle } from "./movieTitles";
export type Credentials = {
  server: string;
  username: string;
  password: string;
};
export type Kind = "live" | "movie";
export type Category = { id: string; name: string };
export type Stream = {
  id: string;
  name: string;
  kind: Kind;
  category: string;
  image?: string;
  extension: string;
};
export type Catalog = {
  live: Stream[];
  movie: Stream[];
  liveCategories: Category[];
  movieCategories: Category[];
};

export function normalizeServer(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(
      "Enter a full server address, such as https://tv.example.com:8080.",
    );
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Use an HTTP or HTTPS server address without credentials, query parameters, or fragments.",
    );
  }
  return url
    .toString()
    .replace(/\/$/, "")
    .replace(/\/player_api\.php$/, "");
}

export function apiUrl(
  credentials: Credentials,
  action?: string,
  parameters?: Record<string, string>,
): string {
  const url = new URL(`${normalizeServer(credentials.server)}/player_api.php`);
  url.searchParams.set("username", credentials.username);
  url.searchParams.set("password", credentials.password);
  if (action) url.searchParams.set("action", action);
  for (const [name, value] of Object.entries(parameters ?? {}))
    url.searchParams.set(name, value);
  return url.toString();
}

export function playbackUrl(credentials: Credentials, stream: Stream): string {
  const extension = stream.kind === "live" ? "m3u8" : stream.extension;
  if (!/^[a-zA-Z0-9]+$/.test(extension))
    throw new Error("This stream has an invalid format.");
  return `${normalizeServer(credentials.server)}/${stream.kind === "live" ? "live" : "movie"}/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${encodeURIComponent(stream.id)}.${extension}`;
}

async function request(
  credentials: Credentials,
  action?: string,
  signal?: AbortSignal,
  parameters?: Record<string, string>,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 20000);
  try {
    const response = await fetch(apiUrl(credentials, action, parameters), {
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`Server returned HTTP ${response.status}.`);
    return await response.json();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Server returned HTTP")
    )
      throw error;
    throw new Error(
      signal?.aborted
        ? "Connection cancelled."
        : "Could not read the server response. Check the address, connection, and server availability.",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function parseStreams(data: unknown, kind: Kind): Stream[] {
  if (!Array.isArray(data))
    throw new Error("The server returned an invalid stream list.");
  return data
    .filter((item) => item && item.stream_id != null && item.name)
    .map((item) => ({
      id: String(item.stream_id),
      name:
        kind === "movie"
          ? cleanMovieTitle(String(item.name))
          : String(item.name),
      kind,
      category: String(item.category_id ?? ""),
      image:
        typeof item.stream_icon === "string" &&
        /^https?:\/\//.test(item.stream_icon)
          ? item.stream_icon
          : undefined,
      extension: /^[a-zA-Z0-9]+$/.test(item.container_extension ?? "")
        ? item.container_extension
        : "mp4",
    }));
}

function parseCategories(data: unknown): Category[] {
  if (!Array.isArray(data))
    throw new Error("The server returned an invalid category list.");
  return data
    .filter((item) => item && item.category_id != null)
    .map((item) => ({
      id: String(item.category_id),
      name: String(item.category_name ?? "Other"),
    }));
}

export async function loadCatalog(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<Catalog> {
  const auth = (await request(credentials, undefined, signal)) as {
    user_info?: { auth?: number | string; status?: string };
  } | null;
  if (Number(auth?.user_info?.auth) !== 1)
    throw new Error(
      "The server rejected these login details. Check your username and password.",
    );
  if (auth?.user_info?.status && auth.user_info.status !== "Active")
    throw new Error("This account is not active. Contact your provider.");
  const [live, movie, liveCategories, movieCategories] = await Promise.all([
    request(credentials, "get_live_streams", signal),
    request(credentials, "get_vod_streams", signal),
    request(credentials, "get_live_categories", signal),
    request(credentials, "get_vod_categories", signal),
  ]);
  return {
    live: parseStreams(live, "live"),
    movie: parseStreams(movie, "movie"),
    liveCategories: parseCategories(liveCategories),
    movieCategories: parseCategories(movieCategories),
  };
}

export type MovieDetails = {
  title?: string;
  plot?: string;
  year?: string;
  duration?: string;
  genre?: string;
  rating?: string;
  cast?: string;
  director?: string;
  image?: string;
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const textValue = (value: unknown): string | undefined => {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
  return text && !["null", "undefined", "N/A"].includes(text)
    ? text
    : undefined;
};
export function parseMovieDetails(data: unknown): MovieDetails {
  const root = record(data);
  if (!("info" in root) && !("movie_data" in root))
    throw new Error("Movie details are not available from this provider.");
  const info = record(root.info),
    movie = record(root.movie_data);
  const title = textValue(info.name) ?? textValue(movie.name);
  const date = textValue(info.releasedate ?? info.release_date ?? movie.year);
  const seconds = Number(info.duration_secs);
  const image = textValue(info.movie_image ?? info.cover_big);
  const rating = textValue(info.rating);
  return {
    title: title ? cleanMovieTitle(title) : undefined,
    plot: textValue(info.plot ?? info.description),
    year: date?.match(/\b(?:19|20)\d{2}\b/)?.[0],
    duration:
      Number.isFinite(seconds) && seconds > 0
        ? `${Math.round(seconds / 60)} min`
        : textValue(info.duration),
    genre: textValue(info.genre),
    rating:
      rating &&
      Number.isFinite(Number(rating)) &&
      Number(rating) > 0 &&
      Number(rating) <= 10
        ? `${rating}/10`
        : undefined,
    cast: textValue(info.cast ?? info.actors),
    director: textValue(info.director),
    image: image && /^https?:\/\//i.test(image) ? image : undefined,
  };
}
export async function loadMovieDetails(
  credentials: Credentials,
  id: string,
  signal?: AbortSignal,
): Promise<MovieDetails> {
  return parseMovieDetails(
    await request(credentials, "get_vod_info", signal, { vod_id: id }),
  );
}
