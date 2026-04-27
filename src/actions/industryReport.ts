import type { Action, IAgentRuntime, Memory, State, HandlerCallback, ActionResult } from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import { tavilySearch } from "../providers/webSearchProvider.js";
import { fetchNews } from "../providers/newsProvider.js";
import { fetchMarketNewsSentiment } from "../providers/financialDataProvider.js";
import { compileResearchContext, searchResultsToSources, newsToSources } from "../utils/dataFormatter.js";
import { buildReport, saveReport } from "../utils/reportGenerator.js";
import { buildIndustryReportPrompt } from "../templates/industryReportTemplate.js";

export const industryReportAction: Action = {
  name: "INDUSTRY_REPORT",
  similes: ["GENERATE_INDUSTRY_REPORT", "INDUSTRY_ANALYSIS", "SECTOR_REPORT", "SECTOR_ANALYSIS", "WRITE_INDUSTRY_REPORT"],
  description:
    "Generates a comprehensive industry report covering market size, value chain, technology landscape, regulatory environment, investment activity, and future outlook. Use when the user requests a full industry or sector analysis.",
  parameters: [
    {
      name: "industry",
      description: "The industry or sector to analyze (e.g., 'fintech', 'healthcare AI', 'clean energy')",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "focusAreas",
      description: "Specific aspects to emphasize (e.g., 'investment activity, regulation')",
      required: false,
      schema: { type: "string" },
    },
  ],
  examples: [
    [
      { user: "{{user1}}", content: { text: "Generate an industry report on fintech" } },
      { user: "ResearchAnalyst", content: { text: "Generating a comprehensive fintech industry report.", actions: ["INDUSTRY_REPORT"] } },
    ],
    [
      { user: "{{user1}}", content: { text: "Give me a full analysis of the healthcare AI sector" } },
      { user: "ResearchAnalyst", content: { text: "Preparing an in-depth healthcare AI industry report.", actions: ["INDUSTRY_REPORT"] } },
    ],
  ],
  validate: async (_r: IAgentRuntime, _m: Memory) => !!process.env.OPENAI_API_KEY && !!process.env.TAVILY_API_KEY,
  handler: async (runtime, message, _state, options, callback) => {
    const params = (options as { parameters?: { industry?: string; focusAreas?: string } })?.parameters;
    const industry = params?.industry ?? message.content?.text ?? "unknown industry";

    runtime.logger.info(`[IndustryReport] Generating report: ${industry}`);
    if (callback) await callback({ text: `�� Generating **${industry}** industry report... This may take a moment.` });

    const [searchRes, newsRes, sentimentRes] = await Promise.allSettled([
      tavilySearch(`${industry} industry analysis market size trends 2024 2025`, { maxResults: 8, searchDepth: "advanced" }),
      fetchNews(`${industry} industry news investment 2025`),
      fetchMarketNewsSentiment(undefined, industry.toLowerCase().replace(/\s+/g, "_")),
    ]);

    const webData = searchRes.status === "fulfilled" ? searchRes.value : { results: [], answer: undefined };
    const news = newsRes.status === "fulfilled" ? newsRes.value : [];

    let context = compileResearchContext(webData.results, news, webData.answer);
    if (sentimentRes.status === "fulfilled" && sentimentRes.value?.feed?.length) {
      context += "\n\n### Market Sentiment Headlines\n" +
        sentimentRes.value.feed.slice(0, 5).map(f => `- ${f.title} (${f.overall_sentiment_label})`).join("\n");
    }

    const prompt = buildIndustryReportPrompt(industry, context);
    const reportContent = await runtime.useModel(ModelType.TEXT_LARGE, { prompt, maxTokens: 4000, temperature: 0.3 }) as string;

    const sources = [...searchResultsToSources(webData.results), ...newsToSources(news.slice(0, 5))];
    const report = buildReport("industry_report", industry, reportContent, sources);

    let savedPath: string | undefined;
    try { savedPath = await saveReport(report); } catch { /* disk write optional */ }

    const responseText = `${reportContent}\n\n---\n_📄 Saved: \`${savedPath ?? "reports/"}\`_ | _Sources: ${sources.length}_`;
    if (callback) await callback({ text: responseText });
    return { success: true, text: responseText, data: { report, savedPath } };
  },
};
