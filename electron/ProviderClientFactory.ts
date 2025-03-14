// ProviderClientFactory.ts
// Unified AI client creation for all 5 providers.
// Eliminates duplicated client initialization across ProcessingHelper,
// AnswerAssistant, and TranscriptionHelper.
//
// Azure OpenAI uses the dedicated AzureOpenAI class from the openai package,
// which correctly handles deployment-based URL routing:
//   {endpoint}/openai/deployments/{model}/chat/completions?api-version=...

import { OpenAI, AzureOpenAI } from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { APIProvider } from "../shared/aiModels";
import { configHelper } from "./ConfigHelper";

export type ProviderClient =
  | { type: "openai"; client: OpenAI }
  | { type: "gemini"; apiKey: string }
  | { type: "anthropic"; client: Anthropic }
  | { type: "azure-openai"; client: AzureOpenAI; endpoint: string }
  | { type: "openrouter"; client: OpenAI };

/**
 * Creates the appropriate AI client based on current config.
 * Returns null if no API key is configured.
 */
export function createProviderClient(): ProviderClient | null {
  const config = configHelper.loadConfig();

  if (!config.apiKey || config.apiKey.trim().length === 0) {
    return null;
  }

  switch (config.apiProvider) {
    case "openai":
      return {
        type: "openai",
        client: new OpenAI({
          apiKey: config.apiKey,
          timeout: 60000,
          maxRetries: 2,
        }),
      };

    case "gemini":
      return {
        type: "gemini",
        apiKey: config.apiKey,
      };

    case "anthropic":
      return {
        type: "anthropic",
        client: new Anthropic({
          apiKey: config.apiKey,
        }),
      };

    case "azure-openai": {
      const endpoint = (config.azureEndpoint || "").replace(/\/$/, "");
      const apiVersion = config.azureApiVersion || "2025-01-01-preview";

      if (!endpoint) {
        console.error("Azure OpenAI endpoint not configured");
        return null;
      }

      // AzureOpenAI automatically constructs URLs as:
      //   {endpoint}/openai/deployments/{model}/chat/completions?api-version={version}
      // The `model` param in chat.completions.create() becomes the deployment name.
      const client = new AzureOpenAI({
        endpoint,
        apiKey: config.apiKey,
        apiVersion,
      });

      return {
        type: "azure-openai",
        client,
        endpoint,
      };
    }

    case "openrouter":
      return {
        type: "openrouter",
        client: new OpenAI({
          apiKey: config.apiKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://github.com/Scode-Njnjas/interview-assistant",
            "X-Title": "Interview Assistant",
          },
          timeout: 60000,
          maxRetries: 2,
        }),
      };

    default:
      return null;
  }
}

/**
 * Returns true if the client uses the OpenAI-compatible chat.completions API.
 * openai, azure-openai, and openrouter all share this interface.
 */
export function isOpenAICompatible(
  client: ProviderClient
): client is
  | { type: "openai"; client: OpenAI }
  | { type: "azure-openai"; client: AzureOpenAI; endpoint: string }
  | { type: "openrouter"; client: OpenAI } {
  return client.type === "openai" || client.type === "azure-openai" || client.type === "openrouter";
}

/**
 * Gets the OpenAI-compatible client from a provider.
 * Use after checking isOpenAICompatible().
 */
export function getOpenAIClient(client: ProviderClient): OpenAI | null {
  if (isOpenAICompatible(client)) {
    return client.client;
  }
  return null;
}

/**
 * Gets the provider type string from the config.
 */
export function getCurrentProviderType(): APIProvider {
  const config = configHelper.loadConfig();
  return config.apiProvider;
}
