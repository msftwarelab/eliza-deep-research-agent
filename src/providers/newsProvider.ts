import axios from "axios";
import type { IAgentRuntime, Memory, State, Provider, ProviderResult } from "@elizaos/core";
import type { NewsApiResponse, NewsArticle } from "../types/index.js";
import { NEWS_API_URL, DEFAULT_TIMEOUT, DEFAULT_NEWS_ARTICLES } from "../constants/index.js";
import { withRetry } from "../utils/rateLimiter.js";

// -------------------------------------------------------------------------
// NewsAPI Provider
// Fetches recent news articles relevant to the query.
// -------------------------------------------------------------------------

export async function fetchNews(
  query: string,
  options: { pageSize?: number; sortBy?: "publishedAt" | "relevancy" | "popularity" } = {}
): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) throw new Error("NEWS_API_KEY is not set");

  const response = await withRetry(() =>
    axios.get<NewsApiResponse>(NEWS_API_URL, {
      params: {
        q: query,
        apiKey,
        pageSize: options.pageSize ?? DEFAULT_NEWS_ARTICLES,
        sortBy: options.sortBy ?? "publishedAt",
        language: "en",
      },
      timeout: DEFAULT_TIMEOUT,
    })
  );

  return response.data.articles ?? [];
}

export function formatNewsArticles(articles: NewsArticle[]): string {
  if (!articles.length) return "No recent news found.";
  return articles
    .slice(0, 6)
    .map(
      (a, i) =>
        `[${i + 1}] ${a.title} (${a.source.name}, ${new Date(a.publishedAt).toLocaleDateString()})\n    ${a.description ?? "No description"}`
    )
    .join("\n\n");
}

// ElizaOS Provider — injects news headlines into agent state
export const newsProvider: Provider = {
  name: "NEWS",
  description:
    "Provides recent news articles relevant to the user's research topic using NewsAPI.",
  dynamic: true,
  position: 2,
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    const query = message.content?.text;
    if (!query || !process.env.NEWS_API_KEY) {
      return { text: "" };
    }

    try {
      const articles = await fetchNews(query, { pageSize: 6 });
      const formatted = formatNewsArticles(articles);

      return {
        text: `## Recent News Headlines\n${formatted}`,
        data: { newsArticles: articles },
      };
    } catch {
      return { text: "" };
    }
  },
};