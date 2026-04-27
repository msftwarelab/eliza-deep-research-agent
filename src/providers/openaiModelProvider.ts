import axios from "axios";
import type { IAgentRuntime } from "@elizaos/core";
import { ModelType } from "@elizaos/core";

// =========================================================================
// OpenAI Model Provider — registers TEXT_LARGE and TEXT_SMALL handlers
// =========================================================================

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

async function callOpenAI(
  apiKey: string,
  prompt: string,
  model: string,
  temperature: number = 0.7,
  maxTokens: number = 2000,
): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";

  try {
    const response = await axios.post(
      url,
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
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    return content;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`OpenAI API call failed: ${message}`);
  }
}

/**
 * Register OpenAI model handlers with the runtime.
 * Handles both TEXT_LARGE (gpt-4o) and TEXT_SMALL (gpt-4o-mini) model types.
 */
export function registerOpenAIModels(runtime: IAgentRuntime): void {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("[OpenAI Model Provider] OPENAI_API_KEY not set, skipping model registration");
    return;
  }

  // Register TEXT_LARGE handler (gpt-4o)
  runtime.registerModel(
    ModelType.TEXT_LARGE,
    async (runtime: IAgentRuntime, params: Record<string, unknown>) => {
      const prompt = params.prompt as string;
      const maxTokens = (params.maxTokens as number) ?? 2000;
      const temperature = (params.temperature as number) ?? 0.7;

      if (!prompt) {
        throw new Error("prompt is required for TEXT_LARGE model");
      }

      return await callOpenAI(apiKey, prompt, "gpt-4o", temperature, maxTokens);
    },
    "openai",
    100, // High priority
  );

  // Register TEXT_SMALL handler (gpt-4o-mini)
  runtime.registerModel(
    ModelType.TEXT_SMALL,
    async (runtime: IAgentRuntime, params: Record<string, unknown>) => {
      const prompt = params.prompt as string;
      const maxTokens = (params.maxTokens as number) ?? 1000;
      const temperature = (params.temperature as number) ?? 0.7;

      if (!prompt) {
        throw new Error("prompt is required for TEXT_SMALL model");
      }

      return await callOpenAI(apiKey, prompt, "gpt-4o-mini", temperature, maxTokens);
    },
    "openai",
    99, // High priority, but lower than TEXT_LARGE
  );

  console.log("[OpenAI Model Provider] ✅ Registered TEXT_LARGE (gpt-4o) and TEXT_SMALL (gpt-4o-mini)");
}
