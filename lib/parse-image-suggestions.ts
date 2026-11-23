export interface ParsedImageSuggestion {
  id: string;
  type: string;
  description: string;
  text: string;
  position: number;
  // Index just past the closing `]` of this marker, so callers can cut the
  // marker out of the article without re-running the pattern.
  end: number;
}

const IMAGE_SUGGESTION_PATTERN =
  /\[#(\d+)\s*\|\s*([A-Z]+)\s*\|\s*([^\|\]]+?)(?:\s*\|\s*(?:text\s*:\s*)?([^\]]+))?\]/g;

function parseAll(content: string): ParsedImageSuggestion[] {
  const suggestions: ParsedImageSuggestion[] = [];
  const regex = new RegExp(IMAGE_SUGGESTION_PATTERN);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    suggestions.push({
      id: match[1].trim(),
      type: match[2].trim(),
      description: match[3].trim(),
      text: match[4] ? match[4].trim() : '',
      position: match.index,
      end: match.index + match[0].length,
    });
  }

  return suggestions;
}

// The model is asked for `#1`–`#5`/`#6`, but Claude sometimes reuses an id for a
// second copy of the same suggestion (a "final image list" appended after the
// body repeats #1–#5). The first occurrence is the one that sits in the
// article, so later copies of the same id are dropped rather than counted
// twice against the limit — unless dropping them would leave the post with no
// CTA at all, which happens when the body carries #1–#5 and the only CTA is in
// the appended list. In that case the duplicate CTA takes over its id.
function dedupeById(suggestions: ParsedImageSuggestion[]): ParsedImageSuggestion[] {
  const firstById = new Map<string, ParsedImageSuggestion>();
  const duplicates: ParsedImageSuggestion[] = [];

  for (const suggestion of suggestions) {
    if (firstById.has(suggestion.id)) duplicates.push(suggestion);
    else firstById.set(suggestion.id, suggestion);
  }

  const kept = [...firstById.values()];
  if (!kept.some((suggestion) => suggestion.type === 'CTA')) {
    const duplicateCta = duplicates.find((suggestion) => suggestion.type === 'CTA');
    if (duplicateCta) {
      const replaced = kept.findIndex((suggestion) => suggestion.id === duplicateCta.id);
      if (replaced >= 0) kept[replaced] = duplicateCta;
    }
  }

  return kept.sort((a, b) => a.position - b.position);
}

// Shared with app/dashboard/page.tsx, components/ArticleBody.tsx and
// app/api/generate-blog/route.ts so the `[#id | TYPE | description | text :
// overlay]` format only needs to change here.
//
// `limit` caps how many suggestions the app actually turns into images (the
// prompt asks for 5, or 6 when the article runs long). When the model
// overshoots, taking the first `limit` blindly can drop the CTA — Claude 5.5
// tends to push the required CTA to #6 when it also writes a WARNING image —
// which leaves the post with no "visit us" image at all. So the CTA always
// survives the cap and stays in the last slot: the entry that would otherwise
// have been last is dropped, and a CTA found further down moves to the end.
//
// `limit = 0` means "every marker, in document order" and is used by
// components/ArticleBody.tsx to slice the article at each marker, so it must
// never reorder.
export function parseImageSuggestions(content: string, limit = 6): ParsedImageSuggestion[] {
  const suggestions = dedupeById(parseAll(content));

  if (limit <= 0) return suggestions;

  const head =
    suggestions.length <= limit
      ? suggestions
      : withCtaKept(suggestions, limit);

  return withCtaLast(head);
}

// Cuts the list to `limit` entries without losing the CTA.
function withCtaKept(
  suggestions: ParsedImageSuggestion[],
  limit: number
): ParsedImageSuggestion[] {
  const head = suggestions.slice(0, limit);
  if (head.some((suggestion) => suggestion.type === 'CTA')) return head;

  const cta = suggestions.find((suggestion) => suggestion.type === 'CTA');
  if (!cta) return head;

  return [...suggestions.slice(0, limit - 1), cta];
}

// The CTA image is the one that belongs at the very end of the post. The
// prompt asks for that, and this keeps it true when the model placed another
// image after it.
function withCtaLast(suggestions: ParsedImageSuggestion[]): ParsedImageSuggestion[] {
  const ctaIndex = suggestions.findIndex((suggestion) => suggestion.type === 'CTA');
  if (ctaIndex < 0 || ctaIndex === suggestions.length - 1) return suggestions;

  return [
    ...suggestions.slice(0, ctaIndex),
    ...suggestions.slice(ctaIndex + 1),
    suggestions[ctaIndex],
  ];
}

// Removes from the article every image marker that `keep` does not contain.
// The body is what the reader and the publish pipeline see, so surplus
// markers (#6 and beyond, or a duplicate list left behind) must not remain in
// the text even though only the capped set is rendered as images.
export function stripUnusedImageSuggestions(
  content: string,
  keep: ParsedImageSuggestion[]
): string {
  const all = parseAll(content);
  const keptPositions = new Set(keep.map((suggestion) => suggestion.position));
  if (all.every((suggestion) => keptPositions.has(suggestion.position))) {
    return content;
  }

  let result = '';
  let cursor = 0;
  for (const suggestion of all) {
    if (keptPositions.has(suggestion.position)) continue;
    result += content.slice(cursor, suggestion.position);
    cursor = suggestion.end;
  }
  result += content.slice(cursor);

  // A removed marker usually leaves its own line empty; collapse the runs of
  // blank lines that creates, without touching the article's own paragraph
  // breaks.
  return result
    .split('\n')
    .filter((line, i, lines) => line.trim() !== '' || (i > 0 && lines[i - 1].trim() !== ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// The CTA image is what closes the post. If the marker the model wrote for it
// lived in a block that was cut (a trailing "final image list" after
// [참고자료], an editor note), the article would lose the slot for it even
// though the suggestion itself survived. Put the marker back at the end of the
// body so the CTA is always placeable.
export function ensureCtaMarker(
  content: string,
  suggestions: ParsedImageSuggestion[]
): string {
  const cta = suggestions.find((suggestion) => suggestion.type === 'CTA');
  if (!cta) return content;
  if (parseAll(content).some((suggestion) => suggestion.type === 'CTA')) return content;

  const marker = `[#${cta.id} | CTA | ${cta.description}${cta.text ? ` | text : ${cta.text}` : ''}]`;
  return `${content.trim()}\n\n${marker}`;
}
