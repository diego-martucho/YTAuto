export { cn } from "cn";

/**
 * Normalizes text by converting to lowercase, removing accents/diacritics and trimming whitespace.
 * Example: "Canción ÉPICA!" -> "cancion epica!"
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Evaluates whether a video title satisfies a channel rule's title conditions.
 * Ignores case and accents (tildes).
 */
export function matchesTitleFilter(
  videoTitle: string,
  filterType: "all" | "title_contains" | "title_any_of" | string,
  filterValue?: string | null
): boolean {
  if (filterType === "all" || !filterValue || !filterValue.trim()) {
    return true;
  }

  const normTitle = normalizeText(videoTitle);

  if (filterType === "title_contains") {
    const normValue = normalizeText(filterValue);
    return normValue.length > 0 ? normTitle.includes(normValue) : true;
  }

  if (filterType === "title_any_of") {
    // Comma-separated list of keywords
    const keywords = filterValue
      .split(",")
      .map((k) => normalizeText(k))
      .filter((k) => k.length > 0);

    if (keywords.length === 0) return true;
    return keywords.some((keyword) => normTitle.includes(keyword));
  }

  return true;
}
