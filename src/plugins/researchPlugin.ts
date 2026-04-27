import type { Plugin } from "@elizaos/core";
import { marketResearchAction } from "../actions/marketResearch.js";
import { competitorAnalysisAction } from "../actions/competitorAnalysis.js";
import { industryReportAction } from "../actions/industryReport.js";
import { trendAnalysisAction } from "../actions/trendAnalysis.js";
import { webSearchProvider } from "../providers/webSearchProvider.js";
import { newsProvider } from "../providers/newsProvider.js";
import { financialDataProvider } from "../providers/financialDataProvider.js";
import { sourceQualityEvaluator } from "../evaluators/sourceQualityEvaluator.js";
import { researchDepthEvaluator } from "../evaluators/researchDepthEvaluator.js";

// -------------------------------------------------------------------------
// Deep Research Plugin
// Registers all research actions, providers, and evaluators with the runtime.
// -------------------------------------------------------------------------

export const researchPlugin: Plugin = {
  name: "deep-research",
  description:
    "Deep Research Analyst plugin — provides market research, competitor analysis, industry reports, and trend analysis with real-time web data, news, and financial intelligence.",
  actions: [
    marketResearchAction,
    competitorAnalysisAction,
    industryReportAction,
    trendAnalysisAction,
  ],
  providers: [
    webSearchProvider,
    newsProvider,
    financialDataProvider,
  ],
  evaluators: [
    sourceQualityEvaluator,
    researchDepthEvaluator,
  ],
};
