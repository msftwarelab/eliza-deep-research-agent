import type { Action, IAgentRuntime, Memory, State, HandlerCallback, ActionResult } from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import { tavilySearch } from "../providers/webSearchProvider.js";
import { fetchNews } from "../providers/newsProvider.js";
import { compileResearchContext, searchResultsToSources, newsToSources } from "../utils/dataFormatter.js";
import { buildReport, saveReport } from "../utils/reportGenerator.js";

const TREND_ANALYSIS_PROMPT = (topic: string, context: string) => `You are a Trend Forecasting Analyst specializing in identifying emerging and macro trends that matter for business strategy.

## Analysis Request
Topic: "${topic}"
Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

## Research Data
${context}

---

## Deliverable: Trend Analysis Report

### 1. Executive Summary
- Top 3 most important trends in 2 sentences each

### 2. Macro Trends (5-7 trends)
For each trend:
- **Trend Name**
- Signal strength: 🟢 Strong / 🟡 Emerging / 🔴 Speculative
- Description (2-3 sentences)
- Evidence from data
- Estimated timeline to mainstream
- Business implications

### 3. Technology Trends
- Key technology shifts enabling or disrupting the space
- Early signals and indicators

### 4. Consumer/Behavioral Trends
- How customer behavior is changing
- Generational shifts
- Demand pattern changes

### 5. Regulatory & Macro Trends
- Policy developments shaping the space
- Economic factors

### 6. Weak Signals (Early-Stage Trends to Watch)
- Nascent trends that could become significant in 2-5 years

### 7. Strategic Implications
- What to act on NOW (0-6 months)
- What to prepare for (6-18 months)
- What to monitor (18+ months)

Write in a forward-looking, analytical tone. Use specific examples and data points. Distinguish between confirmed trends and speculation.`;

export const trendAnalysisAction: Action = {
  name: "TREND_ANALYSIS",
  similes: ["ANALYZE_TRENDS", "IDENTIFY_TRENDS", "TREND_FORECAST", "EMERGING_TRENDS", "MARKET_TRENDS", "TREND_REPORT"],
  description:
    "Identifies and analyzes current and emerging trends in a market, technology area, or industry. Provides trend signals, business implications, and strategic timing. Use when the user asks about trends, what's changing, or what's next in a space.",
  parameters: [
    {
      name: "topic",
      description: "The topic, industry, or area to analyze for trends",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "timeframe",
      description: "Time horizon for trend analysis (e.g., '2025', 'next 2 years')",
      required: false,
      schema: { type: "string" },
    },
  ],
  examples: [
    [
      { user: "{{user1}}", content: { text: "What are the biggest trends in AI right now?" } },
      { user: "ResearchAnalyst", content: { text: "Analyzing current AI trends with signal strength and business implications.", actions: ["TREND_ANALYSIS"] } },
    ],
    [
      { user: "{{user1}}", content: { text: "What trends should I watch in B2B SaaS for 2025?" } },
      { user: "ResearchAnalyst", content: { text: "Conducting a B2B SaaS trend analysis for 2025.", actions: ["TREND_ANALYSIS"] } },
    ],
  ],
  validate: async (_r: IAgentRuntime, _m: Memory) => !!process.env.OPENAI_API_KEY && !!process.env.TAVILY_API_KEY,
  handler: async (runtime, message, _state, options, callback) => {
    const params = (options as { parameters?: { topic?: string; timeframe?: string } })?.parameters;
    const topic = params?.topic ?? message.content?.text ?? "technology";
    const timeframe = params?.timeframe ?? "2025";

    runtime.logger.info(`[TrendAnalysis] Analyzing trends: ${topic}`);
    if (callback) await callback({ text: `📈 Analyzing **${topic}** trends for ${timeframe}...` });

    const [searchRes, trendSearchRes, newsRes] = await Promise.allSettled([
      tavilySearch(`${topic} trends ${timeframe}`, { maxResults: 7, searchDepth: "advanced" }),
      tavilySearch(`emerging ${topic} trends future predictions ${timeframe}`, { maxResults: 5 }),
      fetchNews(`${topic} trends ${timeframe}`, { sortBy: "relevancy" }),
    ]);

    const results1 = searchRes.status === "fulfilled" ? searchRes.value.results : [];
    const results2 = trendSearchRes.status === "fulfilled" ? trendSearchRes.value.results : [];
    const news = newsRes.status === "fulfilled" ? newsRes.value : [];
    const allResults = [...results1, ...results2].slice(0, 12);

    const context = compileResearchContext(allResults, news, searchRes.status === "fulfilled" ? searchRes.value.answer : undefined);
    const prompt = TREND_ANALYSIS_PROMPT(topic, context);
    const reportContent = await runtime.useModel(ModelType.TEXT_LARGE, { prompt, maxTokens: 4000, temperature: 0.4 }) as string;

    const sources = [...searchResultsToSources(allResults.slice(0, 8)), ...newsToSources(news.slice(0, 4))];
    const report = buildReport("trend_analysis", topic, reportContent, sources);

    let savedPath: string | undefined;
    try { savedPath = await saveReport(report); } catch { /* optional */ }

    const responseText = `${reportContent}\n\n---\n_📄 Saved: \`${savedPath ?? "reports/"}\`_ | _Sources: ${sources.length}_`;
    if (callback) await callback({ text: responseText });
    return { success: true, text: responseText, data: { report, savedPath } };
  },
};
