// =========================================================================
// Deep Research Agent — Core Types
// =========================================================================

// --- External API Response Types ---

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
}

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  source: { name: string };
  publishedAt: string;
  content: string | null;
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export interface AlphaVantageOverview {
  Symbol: string;
  Name: string;
  Description: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  PERatio: string;
  EPS: string;
  RevenueGrowthYOY?: string;
  ProfitMargin?: string;
  "52WeekHigh"?: string;
  "52WeekLow"?: string;
}

export interface AlphaVantageNewsSentiment {
  feed?: Array<{
    title: string;
    url: string;
    summary: string;
    overall_sentiment_label: string;
    overall_sentiment_score: number;
  }>;
}

// --- Research Domain Types ---

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  source?: string;
  relevanceScore?: number;
}

export interface MarketResearchParams {
  topic: string;
  timeframe?: string;
  region?: string;
}

export interface CompetitorAnalysisParams {
  company: string;
  competitors?: string[];
  industry?: string;
}

export interface IndustryReportParams {
  industry: string;
  focusAreas?: string[];
}

export interface TrendAnalysisParams {
  topic: string;
  timeframe?: string;
  categories?: string[];
}

export interface ResearchData {
  query: string;
  webResults: TavilySearchResult[];
  newsArticles: NewsArticle[];
  financialData?: AlphaVantageOverview | null;
  answer?: string;
}

export interface GeneratedReport {
  title: string;
  type: "market_research" | "competitor_analysis" | "industry_report" | "trend_analysis";
  generatedAt: string;
  query: string;
  content: string;
  sources: ResearchSource[];
}

export interface ResearchResult<T = GeneratedReport> {
  success: boolean;
  data?: T;
  error?: string;
}