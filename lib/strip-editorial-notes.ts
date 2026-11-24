// Claude Sonnet 5.5 sometimes ends a post with a note addressed to the person
// publishing it — "작성자 참고 메모", a "최종 이미지 5종 정리" list that repeats
// the image suggestions, a "게시 시에는 … 삭제하세요" instruction. Nothing in
// the pipeline removed those, so they were stored in blog_posts.content and
// rendered under the article, handing the editing work back to the reader.
//
// The system prompt now forbids them; this is the safety net for the times the
// model writes one anyway. Only text that is unmistakably addressed to the
// writer is matched, so ordinary reader-facing lines stay put — a "참고:" line
// or a medical disclaimer is not an editorial note.
const EDITORIAL_NOTE_TRIGGERS: RegExp[] = [
  /작성자\s*(?:참고\s*)?메모/,
  /최종\s*이미지\s*(?:제안\s*)?(?:5\s*종|5\s*개|6\s*종|6\s*개|정리|구성|확정|목록)/,
  /이미지\s*제안\s*(?:안내|정리|목록)/,
  /위\s*이미지\s*제안/,
  /이미지\s*(?:5|6)\s*종\s*정리/,
  /발행\s*안내/,
  /게시\s*시(?:에는)?\s*(?:본문|위|아래|\[|#|\*)/,
  /정리본을\s*(?:함께\s*)?안내/,
];

// A single bracketed instruction sitting between the image markers, e.g.
// "[#6 삭제 없음 - CTA는 아래 이미지를 사용합니다]". That is one meta line, not
// a block: drop the line and keep whatever follows it (usually the real CTA
// marker).
const BRACKETED_META_LINE = /^\s*\[#\d+\s*(?:삭제|제외|무시|없음)/;

const SEPARATOR_LINE = /^(-{3,}|\*{3,}|_{3,})$/;
const HEADING_LINE = /^#{1,6}\s/;

function collapseBlankRuns(lines: string[]): string {
  return lines
    .filter((line, i, all) => line.trim() !== '' || (i > 0 && all[i - 1].trim() !== ''))
    .join('\n')
    .trim();
}

// Cuts trailing editor-facing blocks out of an article.
//
// Run this *after* the `[참고자료]` section has been taken off the content: the
// note can sit either side of it, and cutting from the first note line to the
// end of the text is only safe once the reference list is no longer in the way.
export function stripEditorialNotes(content: string): string {
  // Single bracketed meta lines first; they can sit in the middle of the body.
  const originalLines = content.split('\n');
  const filteredLines = originalLines.filter((line) => !BRACKETED_META_LINE.test(line));
  const text =
    filteredLines.length === originalLines.length
      ? content
      : collapseBlankRuns(filteredLines);

  const lines = text.split('\n');
  const triggerIndex = lines.findIndex((line) =>
    EDITORIAL_NOTE_TRIGGERS.some((pattern) => pattern.test(line))
  );
  if (triggerIndex < 0) return text;

  const tail = lines.slice(triggerIndex);
  // A note is the last thing in the post. If the article carries on with a
  // heading after the match, a body sentence merely looked like a note —
  // leave the text alone rather than cut the rest of the post.
  if (tail.some((line) => HEADING_LINE.test(line))) return text;

  // The note starts at its own line; pull in the blank line and `---` rule
  // that separate it from the article so no stray divider is left behind.
  let start = triggerIndex;
  while (start > 0) {
    const previous = lines[start - 1].trim();
    if (previous === '' || SEPARATOR_LINE.test(previous)) start -= 1;
    else break;
  }

  const kept = lines.slice(0, start).join('\n').trim();
  // Never publish an empty article because of this cleanup.
  if (!kept) return text;

  return kept;
}
