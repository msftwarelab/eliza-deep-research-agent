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
import { fetchCompanyOverview, formatCompanyOverview } from "../providers/financialDataProvider.js";
import { compileResearchContext, searchResultsToSources, newsToSources } from "../utils/dataFormatter.js";
import { buildReport, saveReport } from "../utils/reportGenerator.js";
import { buildCompetitorAnalysisPrompt } from "../templates/competitorAnalysisTemplate.js";

// -------------------------------------------------------------------------
// COMPETITOR_ANALYSIS Action
// -------------------------------------------------------------------------

export const competitorAnalysisAction: Action = {
  name: "COMPETITOR_ANALYSIS",
  similes: [
    "ANALYZE_COMPETITORS",
    "COMPETITIVE_ANALYSIS",
    "COMPETITOR_RESEARCH",
    "COMPETITIVE_LANDSCAPE",
    "COMPARE_COMPETITORS",
    "COMPETITIVE_INTELLIGENCE",
  ],
  description:
    "Produces a deep competitive analysis including competitor profiles, SWOT analysis, market positioning, feature comparisons, and strategic recommendations. Use when the user wants to understand the competitive landscape for a company, product, or market.",
  parameters: [
    {
      name: "company",
      description: "The primary company or product to analyze (e.g., 'Notion', 'Stripe', 'Tesla')",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "competitors",
      description: "Specific competitors to include in the analysis (comma-separated)",
      required: false,
      schema: { type: "string" },
    },
    {
      name: "industry",
      description: "The industry context (e.g., 'productivity software', 'fintech')",
      required: false,
      schema: { type: "string" },
    },
  ],
  examples: [
    [
      { user: "{{user1}}", content: { text: "Analyze competitors of Notion in the productivity space" } },
      {
        user: "ResearchAnalyst",
        content: {
          text: "I'll research Notion's competitive landscape including key rivals like Confluence, Coda, and Obsidian.",
          actions: ["COMPETITOR_ANALYSIS"],
        },
      },
    ],
    [
      { user: "{{user1}}", content: { text: "Who are Stripe's main competitors and how do they compare?" } },
      {
        user: "ResearchAnalyst",
        content: {
          text: "Let me conduct a comprehensive competitive analysis of Stripe against key players in the payments industry.",
          actions: ["COMPETITOR_ANALYSIS"],
        },
      },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    return !!process.env.OPENAI_API_KEY && !!process.env.TAVILY_API_KEY;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult | undefined> => {
    const params = (options as { parameters?: { company?: string; competitors?: string; industry?: string } })?.parameters;
    const company = params?.company ?? message.content?.text ?? "unknown company";
    const industry = params?.industry ?? "";
    const competitorHint = params?.competitors ?? "";

    const searchQuery = `${company} competitors ${industry} competitive analysis comparison 2024 2025`;
    const competitorQuery = competitorHint
      ? `${competitorHint} vs ${company}`
      : `${company} alternatives competitors market share`;

    runtime.logger.info(`[CompetitorAnalysis] Analyzing: ${company}`);

    if (callback) {
      await callback({ text: `🔍 Running competitive analysis on **${company}**... Gathering intelligence on competitors.` });
    }

    // Parallel data fetch
    const [mainSearch, competitorSearch, newsArticles, financialData] = await Promise.allSettled([
      tavilySearch(searchQuery, { maxResults: 8, searchDepth: "advanced" }),
      tavilySearch(competitorQuery, { maxResults: 6, searchDepth: "advanced" }),
      fetchNews(`${company} competitors market`),
      fetchCompanyOverview(company.toUpperCase().replace(/\s+/g, "")),
    ]);

    const mainResults = mainSearch.status === "fulfilled" ? mainSearch.value.results : [];
    const compResults = competitorSearch.status === "fulfilled" ? competitorSearch.value.results : [];
    const allResults = [...mainResults, ...compResults].slice(0, 12);
    const news = newsArticles.status === "fulfilled" ? newsArticles.value : [];
    const financial = financialData.status === "fulfilled" ? financialData.value : null;

    let context = compileResearchContext(allResults, news);
    if (financial) {
      context += `\n\n### Financial Data\n${formatCompanyOverview(financial)}`;
    }

    const prompt = buildCompetitorAnalysisPrompt(company, context);

    const reportContent = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
      maxTokens: 4000,
      temperature: 0.3,
    });

    const sources = [
      ...searchResultsToSources(allResults.slice(0, 8)),
      ...newsToSources(news.slice(0, 4)),
    ];

    const report = buildReport("competitor_analysis", company, reportContent as string, sources);

    let savedPath: string | undefined;
    try {
      savedPath = await saveReport(report);
    } catch {
      runtime.logger.warn("[CompetitorAnalysis] Could not save report");
    }

    const responseText = `${reportContent as string}\n\n---\n_📄 Report saved to: \`${savedPath ?? "reports/"}\`_\n_Sources: ${sources.length} references_`;

    if (callback) {
      await callback({ text: responseText });
    }

    return { success: true, text: responseText, data: { report, savedPath } };
  },
};
