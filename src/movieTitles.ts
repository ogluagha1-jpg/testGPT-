// Remove recognizable provider/release tags, not arbitrary words or numbers.
const tag =
  /^(?:(?:EN|ENG|FR|FRA|AR|ARA|DE|GER|ES|SPA|IT|ITA|PT|POR|TR|TUR|RU|RUS|MULTI|VOSTFR|VF|VFF|VOST|SUB|DUBBED|MOVIE|VOD|4K|UHD|FHD|HD|SD|HDR10?\+?|DOLBY VISION|DV|2160P|1080P|720P|480P|WEB[ .-]?DL|WEBRIP|BLURAY|BLU-RAY|BRRIP|HDRIP|REMUX|HEVC|X26[45]|H[ .]?26[45]|AAC(?:[ .]?\d(?:\.\d)?)?|DDP?(?:[ .]?\d(?:\.\d)?)?|DTS)(?:\s+|$))+$/i;
export function cleanMovieTitle(raw: string): string {
  let title = raw.trim();
  title = title.replace(/\[([^\]]+)\]|\(([^)]+)\)/g, (whole, square, round) =>
    tag.test((square ?? round).trim()) ? " " : whole,
  );
  // Delimited provider prefixes such as "EN |", "4K:" or "FR -".
  for (let i = 0; i < 6; i++) {
    const match = title.match(/^\s*([^|:]+?)\s*(?:\||:| - )\s*/);
    if (!match || !tag.test(match[1].trim())) break;
    title = title.slice(match[0].length);
  }
  title = title.replace(/\.(?:mkv|mp4|avi|mov|m4v|ts)$/i, "");
  // A technical release suffix is safe to remove only after a title and separator.
  title = title.replace(
    /[ ._\-]+(?:2160p|1080p|720p|480p|WEB[ .-]?DL|WEBRip|BluRay|BRRip|HDRip|REMUX|x26[45]|HEVC)\b.*$/i,
    "",
  );
  title = title.replace(
    /(?:\s*[|–-]\s*|\s+)(?:4K|UHD|FHD|HD|SD|MULTI|VOSTFR|VFF|VF|DUBBED)\s*$/i,
    "",
  );
  // Avoid altering initials such as E.T. or titles that deliberately contain dots.
  if (
    /\b(?:19|20)\d{2}\b/.test(title) &&
    title.split(".").length > 2 &&
    !title.includes(" ")
  ) {
    title = title.replace(/\./g, " ").replace(/\s+(?:19|20)\d{2}$/, "");
  }
  title = title.replace(/_/g, " ").replace(/\s+\((?:19|20)\d{2}\)\s*$/, "");
  title = title
    .replace(/^[\s|:–-]+|[\s|:–-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return title || raw.trim();
}
