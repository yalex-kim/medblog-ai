import Anthropic from '@anthropic-ai/sdk';

export interface CitedSnippet {
  url: string;
  title: string | null;
  snippet: string;
}

// Anthropic attaches real citation metadata (url, title, and the exact
// quoted text used) to text blocks whenever web_search grounded a claim.
// This is ground truth from the API, unlike the model's self-written
// "[참고자료]" bullet list (see lib/parse-references.ts), which can drift
// from what was actually cited. Returns one entry per unique URL, keeping
// the first cited_text if a URL is cited more than once.
export function extractCitedSnippets(content: Anthropic.ContentBlock[]): Map<string, CitedSnippet> {
  const snippets = new Map<string, CitedSnippet>();

  for (const block of content) {
    if (block.type !== 'text' || !block.citations) continue;

    for (const citation of block.citations) {
      if (citation.type !== 'web_search_result_location') continue;
      if (!snippets.has(citation.url)) {
        snippets.set(citation.url, {
          url: citation.url,
          title: citation.title,
          snippet: citation.cited_text,
        });
      }
    }
  }

  return snippets;
}
