import type { ResearchSource, TavilySearchResult, NewsArticle } from "../types/index.js";

// -------------------------------------------------------------------------
// Data Formatter — converts raw API data into clean report content
// -------------------------------------------------------------------------

export function searchResultsToSources(results: TavilySearchResult[]): ResearchSource[] {
  return results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content.slice(0, 200),
    publishedAt: r.published_date,
    relevanceScore: r.score,
  }));
}

export function newsToSources(articles: NewsArticle[]): ResearchSource[] {
  return articles.map((a) => ({
    title: a.title,
    url: a.url,
    snippet: a.description ?? a.content?.slice(0, 200) ?? "",
    publishedAt: a.publishedAt,
    source: a.source.name,
  }));
}

export function formatSourceList(sources: ResearchSource[]): string {
  if (!sources.length) return "No sources available.";
  return sources
    .map((s, i) => {
      const date = s.publishedAt
        ? ` (${new Date(s.publishedAt).toLocaleDateString()})`
        : "";
      const src = s.source ? ` — ${s.source}` : "";
      return `${i + 1}. [${s.title}${date}${src}](${s.url})`;
    })
    .join("\n");
}

export function compileResearchContext(
  webResults: TavilySearchResult[],
  newsArticles: NewsArticle[],
  webAnswer?: string
): string {
  const parts: string[] = [];

  if (webAnswer) {
    parts.push(`### AI-Generated Web Summary\n${webAnswer}`);
  }

  if (webResults.length) {
    parts.push(
      "### Web Research Findings\n" +
        webResults
          .map((r) => `**${r.title}**\n${r.content.slice(0, 400)}`)
          .join("\n\n")
    );
  }

  if (newsArticles.length) {
    parts.push(
      "### Recent News Coverage\n" +
        newsArticles
          .slice(0, 8)
          .map(
            (a) =>
              `**${a.title}** (${a.source.name})\n${a.description ?? ""}`
          )
          .join("\n\n")
    );
  }

  return parts.join("\n\n---\n\n");
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
