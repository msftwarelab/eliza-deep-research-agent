import type {
  Evaluator,
  IAgentRuntime,
  Memory,
  State,
  ActionResult,
} from "@elizaos/core";

// -------------------------------------------------------------------------
// Source Quality Evaluator
// Runs after research actions to flag low-quality or thin research.
// -------------------------------------------------------------------------

export const sourceQualityEvaluator: Evaluator = {
  name: "SOURCE_QUALITY",
  description:
    "Evaluates whether the agent's research response is backed by sufficient, high-quality sources. Flags responses that lack citations or rely on vague information.",
  similes: ["EVALUATE_SOURCES", "CHECK_CITATION_QUALITY", "VERIFY_RESEARCH_QUALITY"],
  alwaysRun: false,
  examples: [
    {
      messages: [
        {
          user: "{{user1}}",
          content: { text: "Research the electric vehicle market" },
        },
        {
          user: "ResearchAnalyst",
          content: {
            text: "The EV market is large and growing. Tesla is the biggest player.",
          },
        },
      ],
      outcome: "Research lacks specific data points, market size figures, and cited sources. Quality: LOW.",
    },
    {
      messages: [
        {
          user: "{{user1}}",
          content: { text: "Research the electric vehicle market" },
        },
        {
          user: "ResearchAnalyst",
          content: {
            text: "The global EV market was valued at $500B in 2024 (CAGR 25%). Key players: Tesla (19% share), BYD (17%), VW Group (12%). Sources: BloombergNEF, IEA Report 2024.",
          },
        },
      ],
      outcome: "Research includes market size, growth rate, key players with data, and cited sources. Quality: HIGH.",
    },
  ],
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Only run after research-related messages
    const text = message.content?.text?.toLowerCase() ?? "";
    const researchKeywords = ["market", "research", "analysis", "industry", "competitor", "trend", "report"];
    return researchKeywords.some((kw) => text.includes(kw));
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State
  ): Promise<ActionResult | undefined> => {
    const text = message.content?.text ?? "";

    // Quality heuristics
    const hasNumbers = /\d+/.test(text);
    const hasUrls = /https?:\/\//.test(text);
    const hasBullets = text.includes("•") || text.includes("-") || text.includes("*");
    const hasSections = /#{1,3}\s/.test(text);
    const wordCount = text.split(/\s+/).length;

    const qualityScore =
      (hasNumbers ? 25 : 0) +
      (hasUrls ? 25 : 0) +
      (hasBullets ? 15 : 0) +
      (hasSections ? 20 : 0) +
      Math.min(wordCount / 20, 15); // up to 15 pts for length

    const quality =
      qualityScore >= 70 ? "HIGH" : qualityScore >= 40 ? "MEDIUM" : "LOW";

    runtime.logger.info(`[SourceQualityEvaluator] Score: ${qualityScore.toFixed(0)} (${quality})`);

    return {
      success: true,
      text: `Source quality assessment: ${quality} (score: ${qualityScore.toFixed(0)}/100)`,
      values: { sourceQualityScore: qualityScore, sourceQualityLevel: quality },
    };
  },
};
