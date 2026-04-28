// -------------------------------------------------------------------------
// Agent Configuration — validates environment and exports config helpers
// -------------------------------------------------------------------------

export interface AgentConfig {
  aiccApiKey: string;
  tavilyApiKey: string;
  newsApiKey?: string;
  alphaVantageKey?: string;
  port: number;
  logLevel: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
}

export function loadConfig(): AgentConfig {
  const missing: string[] = [];

  if (!process.env.AICCAPI_KEY) {
    missing.push("AICCAPI_KEY");
  }
  if (!process.env.TAVILY_API_KEY) {
    missing.push("TAVILY_API_KEY");
  }

  if (missing.length > 0) {
    console.error("\n❌ Missing required environment variables:");
    missing.forEach((k) => console.error(`   • ${k}`));
    console.error("\n💡 Copy .env.example to .env and fill in your API keys:");
    console.error("   cp .env.example .env\n");
    process.exit(1);
  }

  return {
    aiccApiKey: process.env.AICCAPI_KEY ?? "",
    tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
    newsApiKey: process.env.NEWS_API_KEY,
    alphaVantageKey: process.env.ALPHA_VANTAGE_KEY,
    port: parseInt(process.env.PORT ?? "3000"),
    logLevel: (process.env.LOG_LEVEL ?? "info") as AgentConfig["logLevel"],
  };
}

export function printStartupBanner(config: AgentConfig): void {
  const hasNews = config.newsApiKey ? "✅" : "⚠️  (optional — add NEWS_API_KEY)";
  const hasAlpha = config.alphaVantageKey ? "✅" : "⚠️  (optional — add ALPHA_VANTAGE_KEY)";

  console.log(`
╔═══════════════════════════════════════════════════════╗
║       🔬 Deep Research Analyst Agent                  ║
║       Powered by ElizaOS v2                           ║
╠═══════════════════════════════════════════════════════╣
║  Services:                                            ║
║    LLM (AICC GPT-4.1)   ✅                            ║
║    Web Search (Tavily)  ✅                            ║
║    News API             ${hasNews.padEnd(28)}║
║    Financial Data       ${hasAlpha.padEnd(28)}║
╠═══════════════════════════════════════════════════════╣
║  Endpoints:                                           ║
║    CLI  → type your query below                       ║
║    REST → http://localhost:${String(config.port).padEnd(28)}║
╠═══════════════════════════════════════════════════════╣
║  Commands:                                            ║
║    research <topic>    — Market research              ║
║    competitors <co>    — Competitor analysis          ║
║    industry <sector>   — Industry report              ║
║    trends <topic>      — Trend analysis               ║
║    help                — Show commands                ║
║    quit / exit         — Exit                         ║
╚═══════════════════════════════════════════════════════╝
`);
}
