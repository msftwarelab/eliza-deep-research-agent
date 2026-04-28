import axios from "axios";
import type { IAgentRuntime } from "@elizaos/core";
import { ModelType } from "@elizaos/core";

// =========================================================================
// LLM Model Provider — AICC (api.ai.cc) using gpt-4o
// =========================================================================

const DEFAULT_TIMEOUT = 120000;
const AICC_BASE_URL = "https://api.ai.cc/v1";
const LARGE_MODEL = "gpt-4.1";
const SMALL_MODEL = "gpt-4.1-mini";

async function callLLM(
  model: string,
  prompt: string,
  temperature: number = 0.7,
  maxTokens: number = 2000,
): Promise<string> {
  const apiKey = process.env.AICCAPI_KEY;
  if (!apiKey) throw new Error("[AICC] AICCAPI_KEY is not set in environment");

  try {
    const response = await axios.post(
      `${AICC_BASE_URL}/chat/completions`,
      {
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: DEFAULT_TIMEOUT,
      },
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in LLM response");

    return content;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const body = JSON.stringify(error.response?.data ?? {});
      throw new Error(`LLM API call failed: HTTP ${status} — ${body}`);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM API call failed: ${message}`);
  }
}

/**
 * Register LLM model handlers with the runtime using the AICC gateway (gpt-4o).
 */
export function registerOpenAIModels(runtime: IAgentRuntime): void {
  if (!process.env.AICCAPI_KEY) {
    console.warn("[AICC] AICCAPI_KEY is not set — skipping model registration");
    return;
  }

  // Register TEXT_LARGE handler (gpt-4o)
  runtime.registerModel(
    ModelType.TEXT_LARGE,
    async (_runtime: IAgentRuntime, params: Record<string, unknown>) => {
      const prompt = params.prompt as string;
      const maxTokens = (params.maxTokens as number) ?? 2000;
      const temperature = (params.temperature as number) ?? 0.7;
      if (!prompt) throw new Error("prompt is required for TEXT_LARGE model");
      return await callLLM(LARGE_MODEL, prompt, temperature, maxTokens);
    },
    "aicc",
    100,
  );

  // Register TEXT_SMALL handler (gpt-4o-mini)
  runtime.registerModel(
    ModelType.TEXT_SMALL,
    async (_runtime: IAgentRuntime, params: Record<string, unknown>) => {
      const prompt = params.prompt as string;
      const maxTokens = (params.maxTokens as number) ?? 1000;
      const temperature = (params.temperature as number) ?? 0.7;
      if (!prompt) throw new Error("prompt is required for TEXT_SMALL model");
      return await callLLM(SMALL_MODEL, prompt, temperature, maxTokens);
    },
    "aicc",
    99,
  );

  console.log(`[AICC] ✅ Registered TEXT_LARGE: ${LARGE_MODEL}, TEXT_SMALL: ${SMALL_MODEL}`);
}
