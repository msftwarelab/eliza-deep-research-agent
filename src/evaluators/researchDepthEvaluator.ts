import type {
  Evaluator,
  IAgentRuntime,
  Memory,
  State,
  ActionResult,
} from "@elizaos/core";

// -------------------------------------------------------------------------
// Research Depth Evaluator
// Assesses whether the research covers multiple dimensions (market, financial,
// competitive, trends) rather than surface-level summaries.
// -------------------------------------------------------------------------

const DEPTH_INDICATORS = [
  "market size",
  "market share",
  "revenue",
  "growth rate",
  "cagr",
  "competitor",
  "trend",
  "opportunity",
  "risk",
  "recommendation",
  "strategy",
  "forecast",
  "valuation",
  "segment",
  "stakeholder",
  "executive summary",
  "key findings",
  "analysis",
];

export const researchDepthEvaluator: Evaluator = {
  name: "RESEARCH_DEPTH",
  description:
    "Evaluates the depth and comprehensiveness of research responses. Checks whether the response covers multiple key dimensions of the research topic.",
  similes: ["CHECK_RESEARCH_DEPTH", "EVALUATE_COMPREHENSIVENESS", "ASSESS_RESEARCH_QUALITY"],
  alwaysRun: false,
  examples: [
    {
      messages: [
        {
          user: "{{user1}}",
          content: { text: "Analyze the SaaS industry" },
        },
        {
          user: "ResearchAnalyst",
          content: { text: "SaaS is software delivered over the internet. Many companies use it." },
        },
      ],
      outcome: "Depth: SHALLOW — missing market data, competitive landscape, trends, and actionable insights.",
    },
    {
      messages: [
        {
          user: "{{user1}}",
          content: { text: "Analyze the SaaS industry" },
        },
        {
          user: "ResearchAnalyst",
          content: {
            text: "## Executive Summary\nThe global SaaS market reached $250B in 2024 (CAGR 18%). Key segments: CRM (Salesforce), DevTools (GitHub), HR (Workday). Trends: AI-native SaaS, vertical SaaS, usage-based pricing. Strategic recommendation: target vertical markets with AI differentiation.",
          },
        },
      ],
      outcome: "Depth: DEEP — covers market size, segments, competitors, trends, and recommendations.",
    },
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() ?? "";
    return text.length > 100; // Only evaluate substantial responses
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State
  ): Promise<ActionResult | undefined> => {
    const text = message.content?.text?.toLowerCase() ?? "";

    const matchedIndicators = DEPTH_INDICATORS.filter((indicator) =>
      text.includes(indicator)
    );
    const depthScore = Math.min((matchedIndicators.length / DEPTH_INDICATORS.length) * 100, 100);
    const depth =
      depthScore >= 60 ? "DEEP" : depthScore >= 30 ? "MODERATE" : "SHALLOW";

    runtime.logger.info(
      `[ResearchDepthEvaluator] Depth: ${depth} (${matchedIndicators.length}/${DEPTH_INDICATORS.length} indicators)`
    );

    return {
      success: true,
      text: `Research depth assessment: ${depth} (${matchedIndicators.length} of ${DEPTH_INDICATORS.length} key indicators present)`,
      values: {
        researchDepthScore: depthScore,
        researchDepthLevel: depth,
        matchedIndicators: matchedIndicators.join(", "),
      },
    };
  },
};
