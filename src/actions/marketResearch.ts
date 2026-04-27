import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ActionResult,
} from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import { tavilySearch } from "../providers/webSearchProvider.js";
import { fetchNews } from "../providers/newsProvider.js";
import { compileResearchContext, searchResultsToSources, newsToSources } from "../utils/dataFormatter.js";
import { buildReport, saveReport } from "../utils/reportGenerator.js";
import { buildMarketResearchPrompt } from "../templates/marketResearchTemplate.js";

// -------------------------------------------------------------------------
// MARKET_RESEARCH Action
// -------------------------------------------------------------------------

export const marketResearchAction: Action = {
  name: "MARKET_RESEARCH",
  similes: [
    "RESEARCH_MARKET",
    "ANALYZE_MARKET",
    "MARKET_ANALYSIS",
    "MARKET_SIZE",
    "MARKET_OVERVIEW",
    "TAM_ANALYSIS",
    "MARKET_STUDY",
  ],
  description:
    "Conducts comprehensive market research including market size, growth rates, key players, trends, opportunities, and strategic recommendations. Use when the user asks to research, analyze, or understand a market.",
  parameters: [
    {
      name: "topic",
      description: "The market or industry to research (e.g., 'AI chatbots', 'electric vehicles', 'B2B SaaS')",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "timeframe",
      description: "The time period for the research (e.g., '2024-2025', 'last 6 months')",
      required: false,
      schema: { type: "string" },
    },
    {
      name: "region",
      description: "Geographic focus (e.g., 'global', 'North America', 'Southeast Asia')",
      required: false,
      schema: { type: "string" },
    },
  ],
  examples: [
    [
      { user: "{{user1}}", content: { text: "Research the AI coding assistant market" } },
      {
        user: "ResearchAnalyst",
        content: {
          text: "I'll conduct comprehensive market research on the AI coding assistant market, including market size, key players, trends, and strategic recommendations.",
          actions: ["MARKET_RESEARCH"],
        },
      },
    ],
    [
      { user: "{{user1}}", content: { text: "What does the electric vehicle market look like?" } },
      {
        user: "ResearchAnalyst",
        content: {
          text: "Let me research the electric vehicle market for you with the latest data.",
          actions: ["MARKET_RESEARCH"],
        },
      },
    ],
  ],
  validate: async (runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    return !!process.env.OPENAI_API_KEY && !!process.env.TAVILY_API_KEY;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult | undefined> => {
    const params = (options as { parameters?: { topic?: string; timeframe?: string; region?: string } })?.parameters;
    const topic = params?.topic ?? message.content?.text ?? "unknown market";
    const timeframe = params?.timeframe ?? "2024-2025";
    const region = params?.region ?? "global";

    const searchQuery = `${topic} market size growth trends ${region} ${timeframe}`;

    runtime.logger.info(`[MarketResearch] Researching: ${topic}`);

    if (callback) {
      await callback({ text: `🔍 Researching the **${topic}** market... Gathering web data, news, and financial information.` });
    }

    // Parallel data fetch
    const [searchResponse, newsArticles] = await Promise.allSettled([
      tavilySearch(searchQuery, { maxResults: 8, searchDepth: "advanced" }),
      fetchNews(`${topic} market ${timeframe}`),
    ]);

    const webData = searchResponse.status === "fulfilled" ? searchResponse.value : { results: [], answer: undefined };
    const news = newsArticles.status === "fulfilled" ? newsArticles.value : [];

    const context = compileResearchContext(webData.results, news, webData.answer);
    const prompt = buildMarketResearchPrompt(topic, context);

    const reportContent = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
      maxTokens: 4000,
      temperature: 0.3,
    });

    const sources = [
      ...searchResultsToSources(webData.results),
      ...newsToSources(news.slice(0, 5)),
    ];

    const report = buildReport("market_research", topic, reportContent as string, sources);

    // Save report file
    let savedPath: string | undefined;
    try {
      savedPath = await saveReport(report);
      runtime.logger.info(`[MarketResearch] Report saved: ${savedPath}`);
    } catch {
      runtime.logger.warn("[MarketResearch] Could not save report to disk");
    }

    const responseText =
      `${reportContent as string}\n\n---\n_📄 Report saved to: \`${savedPath ?? "reports/"}\`_\n_Sources: ${sources.length} references_`;

    if (callback) {
      await callback({ text: responseText });
    }

    return {
      success: true,
      text: responseText,
      data: { report, savedPath },
    };
  },
};
