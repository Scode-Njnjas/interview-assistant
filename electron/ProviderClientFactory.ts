// ProviderClientFactory.ts
// Unified AI SDK model factory for all providers.
// Used by ProcessingHelper, AnswerAssistant, and TranscriptionHelper (Gemini audio).
// TranscriptionHelper creates its own raw OpenAI/AzureOpenAI client for Whisper only.

import { LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAzure } from "@ai-sdk/azure";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { configHelper } from "./ConfigHelper";

export type AIModelFactory = (modelId: string) => LanguageModel;

/**
 * Creates an AI SDK model factory based on current config.
 * Use with: generateText({ model: factory(modelId), ... })
 */
export function createModelFactory(): AIModelFactory | null {
  const config = configHelper.loadConfig();

  if (!config.apiKey || config.apiKey.trim().length === 0) {
    return null;
  }

  switch (config.apiProvider) {
    case "openai": {
      const provider = createOpenAI({ apiKey: config.apiKey });
      return (modelId) => provider.chat(modelId);
    }

    case "gemini": {
      const provider = createGoogleGenerativeAI({ apiKey: config.apiKey });
      return (modelId) => provider(modelId);
    }

    case "anthropic": {
      const provider = createAnthropic({ apiKey: config.apiKey });
      return (modelId) => provider(modelId);
    }

    case "azure-openai": {
      const endpoint = (config.azureEndpoint || "").replace(/\/$/, "");
      const apiVersion = config.azureApiVersion || "2024-12-01-preview";

      if (!endpoint) {
        console.error("Azure OpenAI endpoint not configured");
        return null;
      }

      const resourceName = endpoint.replace(/^https?:\/\//, "").split(".")[0];

      const provider = createAzure({
        resourceName,
        apiKey: config.apiKey,
        apiVersion,
        useDeploymentBasedUrls: true,
      });
      return (modelId) => provider.chat(modelId);
    }

    case "openrouter": {
      const provider = createOpenRouter({
        apiKey: config.apiKey,
      });
      return (modelId) => provider.chat(modelId);
    }

    default:
      return null;
  }
}
