import axios from "axios";
import type { IAgentRuntime, Memory, State, Provider, ProviderResult } from "@elizaos/core";
import type { TavilySearchResponse, TavilySearchResult } from "../types/index.js";
import { TAVILY_API_URL, DEFAULT_TIMEOUT, DEFAULT_SEARCH_RESULTS } from "../constants/index.js";
import { withRetry } from "../utils/rateLimiter.js";

// -------------------------------------------------------------------------
// Tavily Web Search Provider
// Injects recent web search results into the agent's context state.
// -------------------------------------------------------------------------

export async function tavilySearch(
  query: string,
  options: { maxResults?: number; searchDepth?: "basic" | "advanced" } = {}
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

  const response = await withRetry(() =>
    axios.post<TavilySearchResponse>(
      TAVILY_API_URL,
      {
        api_key: apiKey,
        query,
        search_depth: options.searchDepth ?? "advanced",
        include_answer: true,
        include_raw_content: false,
        max_results: options.maxResults ?? DEFAULT_SEARCH_RESULTS,
      },
      { timeout: DEFAULT_TIMEOUT }
    )
  );

  return response.data;
}

export function formatSearchResults(results: TavilySearchResult[]): string {
  if (!results.length) return "No web results found.";
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.content.slice(0, 300)}...`
    )
    .join("\n\n");
}

// ElizaOS Provider — injects search context into agent state
export const webSearchProvider: Provider = {
  name: "WEB_SEARCH",
  description:
    "Provides recent web search results relevant to the user's research query using Tavily.",
  dynamic: true,
  position: 1,
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    const query = message.content?.text;
    if (!query || !process.env.TAVILY_API_KEY) {
      return { text: "" };
    }

    try {
      const searchResponse = await tavilySearch(query, { maxResults: 5 });
      const summary = searchResponse.answer
        ? `\nWeb Answer: ${searchResponse.answer}\n`
        : "";
      const resultsText = formatSearchResults(searchResponse.results);

      return {
        text: `## Recent Web Search Results\n${summary}\n${resultsText}`,
        data: { webResults: searchResponse.results },
      };
    } catch {
      return { text: "" };
    }
  },
};