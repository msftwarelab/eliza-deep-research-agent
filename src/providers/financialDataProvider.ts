import axios from "axios";
import type { IAgentRuntime, Memory, State, Provider, ProviderResult } from "@elizaos/core";
import type { AlphaVantageOverview, AlphaVantageNewsSentiment } from "../types/index.js";
import { ALPHA_VANTAGE_URL, DEFAULT_TIMEOUT } from "../constants/index.js";
import { withRetry } from "../utils/rateLimiter.js";

// -------------------------------------------------------------------------
// Alpha Vantage Financial Data Provider
// Fetches company overviews and market news sentiment.
// -------------------------------------------------------------------------

export async function fetchCompanyOverview(symbol: string): Promise<AlphaVantageOverview | null> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) return null;

  try {
    const response = await withRetry(() =>
      axios.get<AlphaVantageOverview & { Note?: string; Information?: string }>(ALPHA_VANTAGE_URL, {
        params: { function: "OVERVIEW", symbol, apikey: apiKey },
        timeout: DEFAULT_TIMEOUT,
      })
    );
    // Alpha Vantage returns a rate-limit message in "Note" or "Information"
    if (response.data.Note || response.data.Information) return null;
    return response.data.Symbol ? response.data : null;
  } catch {
    return null;
  }
}

export async function fetchMarketNewsSentiment(
  tickers?: string,
  topics?: string
): Promise<AlphaVantageNewsSentiment | null> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) return null;

  try {
    const response = await withRetry(() =>
      axios.get<AlphaVantageNewsSentiment & { Note?: string }>(ALPHA_VANTAGE_URL, {
        params: {
          function: "NEWS_SENTIMENT",
          ...(tickers ? { tickers } : {}),
          ...(topics ? { topics } : {}),
          limit: 10,
          apikey: apiKey,
        },
        timeout: DEFAULT_TIMEOUT,
      })
    );
    if (response.data.Note) return null;
    return response.data;
  } catch {
    return null;
  }
}

export function formatCompanyOverview(data: AlphaVantageOverview): string {
  return [
    `**${data.Name} (${data.Symbol})**`,
    `Sector: ${data.Sector} | Industry: ${data.Industry}`,
    `Market Cap: $${parseInt(data.MarketCapitalization).toLocaleString()}`,
    `P/E: ${data.PERatio} | EPS: $${data.EPS}`,
    data.ProfitMargin ? `Profit Margin: ${(parseFloat(data.ProfitMargin) * 100).toFixed(1)}%` : "",
    `52W High: $${data["52WeekHigh"]} | 52W Low: $${data["52WeekLow"]}`,
    "",
    data.Description?.slice(0, 400),
  ]
    .filter(Boolean)
    .join("\n");
}

// ElizaOS Provider — injects financial data into agent state
export const financialDataProvider: Provider = {
  name: "FINANCIAL_DATA",
  description:
    "Provides company financial overviews and market sentiment data using Alpha Vantage.",
  dynamic: true,
  position: 3,
  get: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    const text = message.content?.text ?? "";
    if (!process.env.ALPHA_VANTAGE_KEY) return { text: "" };

    // Try to extract a ticker symbol (e.g. AAPL, TSLA) from the query
    const tickerMatch = text.match(/\b([A-Z]{2,5})\b/g);
    if (!tickerMatch) return { text: "" };

    const symbol = tickerMatch[0];
    try {
      const overview = await fetchCompanyOverview(symbol);
      if (!overview) return { text: "" };

      return {
        text: `## Financial Overview — ${symbol}\n${formatCompanyOverview(overview)}`,
        data: { financialOverview: overview },
      };
    } catch {
      return { text: "" };
    }
  },
};