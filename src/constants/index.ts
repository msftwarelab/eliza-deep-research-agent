// =========================================================================
// Deep Research Agent — Constants
// =========================================================================

export const TAVILY_API_URL = "https://api.tavily.com/search";
export const NEWS_API_URL = "https://newsapi.org/v2/everything";
export const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query";

export const DEFAULT_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT ?? "15000");
export const MAX_RETRIES = parseInt(process.env.MAX_RETRIES ?? "3");
export const RETRY_DELAY = parseInt(process.env.RETRY_DELAY ?? "1000");
export const REPORTS_DIR = process.env.REPORTS_DIRECTORY ?? "./reports";
export const PORT = parseInt(process.env.PORT ?? "3000");

export const DEFAULT_SEARCH_RESULTS = 8;
export const DEFAULT_NEWS_ARTICLES = 10;
export const MAX_REPORT_TOKENS = 4000;

export const RESEARCH_ROOM_ID = "00000000-0000-0000-0000-000000000001" as const;
export const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000002" as const;