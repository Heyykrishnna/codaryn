import type {
  DocumentSearchQuery,
  DocumentSearchResult,
  GeneratedDocument,
} from "@codaryn/contracts";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function extractSnippet(content: string, term: string, maxLength = 200): string {
  const lowerContent = content.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerContent.indexOf(lowerTerm);
  if (index === -1) {
    return content.slice(0, maxLength).trim();
  }
  const start = Math.max(0, index - 60);
  const end = Math.min(content.length, index + term.length + 100);
  let snippet = content.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";
  return snippet;
}

export function searchDocuments(
  documents: GeneratedDocument[],
  searchQuery: DocumentSearchQuery,
): DocumentSearchResult[] {
  const queryTerms = tokenize(searchQuery.query);
  if (queryTerms.length === 0) return [];

  const results: DocumentSearchResult[] = [];

  for (const doc of documents) {
    if (searchQuery.templateId && doc.templateId !== searchQuery.templateId) {
      continue;
    }

    for (const section of doc.sections) {
      const sectionText = `${section.title}\n${section.content}`;
      const lowerSectionText = sectionText.toLowerCase();

      let score = 0;
      let primaryTerm = queryTerms[0] ?? "";

      for (const term of queryTerms) {
        if (section.title.toLowerCase().includes(term)) {
          score += 10;
          primaryTerm = term;
        }
        const matches = lowerSectionText.split(term).length - 1;
        score += matches;
      }

      if (score > 0) {
        const snippet = extractSnippet(section.content, primaryTerm);
        results.push({
          templateId: doc.templateId,
          documentTitle: doc.title,
          sectionId: section.id,
          sectionTitle: section.title,
          snippet,
          score,
          evidence: section.evidence?.[0],
        });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, searchQuery.limit);
}
