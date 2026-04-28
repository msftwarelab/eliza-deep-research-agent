import "dotenv/config";
import readline from "readline";
import express from "express";
import type { Request, Response } from "express";
import { ChannelType, MemoryType, stringToUuid, ModelType } from "@elizaos/core";
import type { Memory, IAgentRuntime } from "@elizaos/core";
import { loadConfig, printStartupBanner } from "./agent/agentConfig.js";
import { createResearchAgent } from "./agent/researchAgent.js";
import { PORT } from "./constants/index.js";
import { marketResearchAction } from "./actions/marketResearch.js";
import { competitorAnalysisAction } from "./actions/competitorAnalysis.js";
import { industryReportAction } from "./actions/industryReport.js";
import { trendAnalysisAction } from "./actions/trendAnalysis.js";

// =========================================================================
// Deep Research Analyst Agent — Entry Point
// =========================================================================

async function startRestApi(runtime: IAgentRuntime, port: number): Promise<void> {
  const app = express();
  app.use(express.json());

  const agentId = runtime.agentId;

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", agent: runtime.character.name, agentId });
  });

  // Generic research endpoint — POST /research { "query": "..." }
  app.post("/research", async (req: Request, res: Response) => {
    const { query } = req.body as { query?: string };
    if (!query) {
      res.status(400).json({ error: "Missing 'query' field in request body" });
      return;
    }
    try {
      const result = await processQuery(runtime, query);
      res.json({ success: true, response: result });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Typed endpoints
  const endpoints: Record<string, string> = {
    "/research/market": "research the market for",
    "/research/competitors": "analyze competitors of",
    "/research/industry": "generate an industry report for",
    "/research/trends": "analyze trends in",
  };

  for (const [path, prefix] of Object.entries(endpoints)) {
    app.post(path, async (req: Request, res: Response) => {
      const { topic, query } = req.body as { topic?: string; query?: string };
      const subject = topic ?? query;
      if (!subject) {
        res.status(400).json({ error: "Missing 'topic' or 'query' field" });
        return;
      }
      try {
        const result = await processQuery(runtime, `${prefix} ${subject}`);
        res.json({ success: true, response: result });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });
  }

  const server = app.listen(port, () => {
    console.log(`\n🌐 REST API running at http://localhost:${port}`);
    console.log(`   POST /research          { "query": "..." }`);
    console.log(`   POST /research/market   { "topic": "..." }`);
    console.log(`   POST /research/competitors { "topic": "..." }`);
    console.log(`   POST /research/industry { "topic": "..." }`);
    console.log(`   POST /research/trends   { "topic": "..." }`);
    console.log(`   GET  /health\n`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ Port ${port} is already in use.`);
      console.error(`   Run: lsof -ti:${port} | xargs kill -9`);
      console.error(`   Then restart with: npm run dev\n`);
      process.exit(1);
    }
    throw err;
  });
}

// =========================================================================
// Direct query routing — bypasses ElizaOS message service checkpoint
// validation (which requires large cloud models). Routes directly to
// the appropriate action handler based on keywords, or calls the LLM
// directly for general questions.
// =========================================================================

function detectIntent(text: string): { action: string; topic: string } {
  const lower = text.toLowerCase();

  // competitor / compare
  if (/competitor|compet|rival|vs\b|versus|benchmark|compare/i.test(lower)) {
    return { action: "competitors", topic: text.replace(/^.*(competitor[s]? (of|for|analysis)|analyze competitor[s]? of|compare)\s*/i, "").trim() || text };
  }
  // industry report
  if (/industry|sector|vertical|landscape|overview of\b/i.test(lower)) {
    return { action: "industry", topic: text.replace(/^.*(industry report (for|on)|generate.*(industry|sector) report for)\s*/i, "").trim() || text };
  }
  // trend analysis
  if (/trend|emerging|forecast|future of|growth in|trajectory/i.test(lower)) {
    return { action: "trends", topic: text.replace(/^.*(trend[s]? (in|for|of)|analyze trend[s]? in)\s*/i, "").trim() || text };
  }
  // market research (default for "research X" or "market X")
  if (/market|research|analys|size|tam|opportunity|startup|space/i.test(lower)) {
    return { action: "market", topic: text.replace(/^.*(research (the market for|market for|the)|market research (on|for)|analyze market)\s*/i, "").trim() || text };
  }

  return { action: "chat", topic: text };
}

async function buildMessage(runtime: IAgentRuntime, text: string): Promise<Memory> {
  const agentId = runtime.agentId;
  const worldId = stringToUuid("research-cli-world");
  const roomId  = stringToUuid("research-cli-room");
  const userId  = stringToUuid("cli-user");

  const existingWorld = await runtime.getWorld(worldId);
  if (!existingWorld) {
    await runtime.createWorld({ id: worldId, name: "CLI Research World", agentId, serverId: "cli" });
  }
  await runtime.ensureRoomExists({ id: roomId, name: "CLI Research Session", source: "cli", type: ChannelType.DM, worldId });
  await runtime.ensureParticipantInRoom(userId, roomId);
  await runtime.ensureParticipantInRoom(agentId, roomId);

  const message: Memory = {
    id: stringToUuid(`msg-${Date.now()}`),
    agentId,
    entityId: userId,
    roomId,
    content: { text },
    metadata: { type: MemoryType.MESSAGE, source: "cli" },
  };
  await runtime.createMemory(message, "messages");
  return message;
}

async function processQuery(runtime: IAgentRuntime, text: string): Promise<string> {
  const { action, topic } = detectIntent(text);
  const message = await buildMessage(runtime, text);
  const state = await runtime.composeState(message);
  let responseText = "";

  const callback = async (content: { text?: string }) => {
    if (content.text) responseText += content.text;
    return [];
  };

  if (action === "market") {
    await marketResearchAction.handler(runtime, message, state, { topic }, callback);
  } else if (action === "competitors") {
    await competitorAnalysisAction.handler(runtime, message, state, { company: topic }, callback);
  } else if (action === "industry") {
    await industryReportAction.handler(runtime, message, state, { industry: topic }, callback);
  } else if (action === "trends") {
    await trendAnalysisAction.handler(runtime, message, state, { topic }, callback);
  } else {
    // General chat — call LLM directly
    const prompt = `You are a helpful deep research analyst. Answer this question concisely:\n\n${text}`;
    responseText = await runtime.useModel(ModelType.TEXT_LARGE, { prompt, maxTokens: 500, temperature: 0.7 }) as string;
  }

  return responseText || "Research complete. Check the reports/ directory for the saved report.";
}

function startCliRepl(runtime: IAgentRuntime): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "\n🔬 Research > ",
  });

  rl.prompt();

  rl.on("line", async (input) => {
    const line = input.trim();
    if (!line) { rl.prompt(); return; }

    if (line === "quit" || line === "exit") {
      console.log("\n👋 Shutting down Research Agent...\n");
      process.exit(0);
    }

    if (line === "help") {
      console.log(`
Commands:
  research <topic>        — Comprehensive market research
  competitors <company>   — Deep competitor analysis
  industry <sector>       — Full industry report
  trends <topic>          — Trend analysis & forecasting
  <any question>          — Free-form research query
  quit / exit             — Exit
      `);
      rl.prompt();
      return;
    }

    // Map shorthand commands
    let query = line;
    if (line.startsWith("research ")) query = `research the market for ${line.slice(9)}`;
    else if (line.startsWith("competitors ")) query = `analyze competitors of ${line.slice(12)}`;
    else if (line.startsWith("industry ")) query = `generate an industry report for ${line.slice(9)}`;
    else if (line.startsWith("trends ")) query = `analyze trends in ${line.slice(7)}`;

    console.log(`\n⏳ Processing: "${query}"...\n`);

    try {
      const response = await processQuery(runtime, query);
      console.log("\n" + "─".repeat(70));
      console.log(response);
      console.log("─".repeat(70));
    } catch (err) {
      console.error(`\n❌ Error: ${String(err)}`);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\n👋 Goodbye!\n");
    // Only exit if stdin was a TTY (interactive session). In non-TTY mode
    // (e.g. background/piped), keep the process alive for REST API.
    if (process.stdin.isTTY) {
      process.exit(0);
    }
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  printStartupBanner(config);

  console.log("🚀 Starting Deep Research Analyst Agent...\n");

  const runtime = await createResearchAgent(config);
  console.log(`✅ Agent initialized: ${runtime.character.name} (${runtime.agentId})\n`);

  // Start REST API
  await startRestApi(runtime, config.port);

  // Start CLI REPL only in interactive (TTY) mode
  if (process.stdin.isTTY) {
    startCliRepl(runtime);
  } else {
    console.log("📡 Running in REST API mode (no TTY detected). Use http://localhost:" + config.port + "\n");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
