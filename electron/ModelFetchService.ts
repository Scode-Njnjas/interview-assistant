// ModelFetchService.ts
// Fetches available models from each provider's API with caching.
// Uses models.dev as the universal catalog with pricing data,
// enriched by provider-specific APIs when available.
// Runs exclusively in the main process.

import { OpenAI } from "openai";
import * as axios from "axios";
import { APIProvider, FetchedModel, ALLOWED_MODELS } from "../shared/aiModels";

export interface ModelFetchResult {
  success: boolean;
  models: FetchedModel[];
  error?: string;
  cachedAt?: number;
  source?: "api" | "models.dev" | "static";
}

interface ModelFetchOptions {
  endpoint?: string;
  apiVersion?: string;
  forceRefresh?: boolean;
}

interface CacheEntry {
  models: FetchedModel[];
  timestamp: number;
  source: "api" | "models.dev" | "static";
}

// models.dev response types
interface ModelsDevModel {
  id: string;
  name: string;
  family?: string;
  cost: {
    input: number;   // USD per million tokens
    output: number;
    cache_read?: number;
    cache_write?: number;
  };
  limit: {
    context: number;
    output: number;
  };
  modalities?: {
    input: string[];
    output: string[];
  };
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  status?: string;
}

interface ModelsDevProvider {
  id?: string;
  name: string;
  models: Record<string, ModelsDevModel>;
}

type ModelsDevData = Record<string, ModelsDevProvider>;

export class ModelFetchService {
  private cache: Map<string, CacheEntry> = new Map();
  private modelsDevCache: { data: ModelsDevData | null; timestamp: number; etag: string | null } = {
    data: null,
    timestamp: 0,
    etag: null,
  };
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MODELS_DEV_CACHE_TTL = 60 * 60 * 1000; // 1 hour (data changes rarely)

  // Map our APIProvider to models.dev provider IDs
  private readonly PROVIDER_TO_MODELS_DEV: Record<APIProvider, string> = {
    openai: "openai",
    gemini: "google",
    anthropic: "anthropic",
    "azure-openai": "azure",
    openrouter: "", // OpenRouter uses its own API
  };

  /**
   * Fetches models for a given provider + credentials.
   * Strategy:
   * 1. Try provider-specific API first (has real-time model availability)
   * 2. Enrich with models.dev pricing data
   * 3. Fall back to models.dev catalog if API fails
   * 4. Fall back to static ALLOWED_MODELS if everything fails
   */
  public async fetchModels(
    provider: APIProvider,
    apiKey: string,
    options?: ModelFetchOptions
  ): Promise<ModelFetchResult> {
    // No API key: return models.dev catalog (no provider API call needed)
    if (!apiKey || apiKey.trim().length === 0) {
      await this.ensureModelsDevData();
      const catalogModels = this.getModelsFromModelsDev(provider);
      if (catalogModels.length > 0) {
        return { success: true, models: catalogModels, source: "models.dev" };
      }
      return { success: false, models: this.getStaticFallbackModels(provider), error: "API key is required", source: "static" };
    }

    const cacheKey = `${provider}:${this.hashKey(apiKey)}`;

    // Return cache if fresh and not forced
    if (!options?.forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return { success: true, models: cached.models, cachedAt: cached.timestamp, source: cached.source };
      }
    }

    // Pre-fetch models.dev data (non-blocking, cached for 1 hour)
    const modelsDevPromise = this.ensureModelsDevData();

    try {
      let models: FetchedModel[];
      let source: "api" | "models.dev" | "static" = "api";

      // Try provider-specific API first
      try {
        switch (provider) {
          case "openai":
            models = await this.fetchOpenAIModels(apiKey);
            break;
          case "gemini":
            models = await this.fetchGeminiModels(apiKey);
            break;
          case "anthropic":
            models = await this.fetchAnthropicModels(apiKey);
            break;
          case "azure-openai":
            models = await this.fetchAzureModels(apiKey, options?.endpoint, options?.apiVersion);
            break;
          case "openrouter":
            models = await this.fetchOpenRouterModels(apiKey);
            break;
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }
      } catch (apiError: any) {
        // API failed — fall back to models.dev
        console.warn(`Provider API failed for ${provider}: ${apiError.message}. Falling back to models.dev`);
        await modelsDevPromise;
        models = this.getModelsFromModelsDev(provider);
        source = models.length > 0 ? "models.dev" : "static";

        if (models.length === 0) {
          models = this.getStaticFallbackModels(provider);
          source = "static";
        }
      }

      // Enrich with models.dev pricing if not from OpenRouter (which has its own pricing)
      if (provider !== "openrouter") {
        await modelsDevPromise;
        models = this.enrichWithModelsDev(models, provider);
      }

      // Update cache
      this.cache.set(cacheKey, { models, timestamp: Date.now(), source });
      return { success: true, models, source };
    } catch (error: any) {
      console.error(`Failed to fetch models for ${provider}:`, error.message);
      const fallback = this.getStaticFallbackModels(provider);
      return {
        success: false,
        models: fallback,
        error: error.message || "Failed to fetch models",
        source: "static",
      };
    }
  }

  // =============================================
  // models.dev catalog
  // =============================================

  /**
   * Ensures models.dev data is loaded and cached.
   * Uses ETag for conditional requests to avoid re-downloading 1.2MB.
   */
  private async ensureModelsDevData(): Promise<void> {
    if (
      this.modelsDevCache.data &&
      Date.now() - this.modelsDevCache.timestamp < this.MODELS_DEV_CACHE_TTL
    ) {
      return; // Cache still fresh
    }

    try {
      const headers: Record<string, string> = {};
      if (this.modelsDevCache.etag) {
        headers["If-None-Match"] = this.modelsDevCache.etag;
      }

      const response = await axios.default.get("https://models.dev/api.json", {
        headers,
        timeout: 15000,
        validateStatus: (status) => status === 200 || status === 304,
      });

      if (response.status === 304) {
        // Not modified — refresh timestamp only
        this.modelsDevCache.timestamp = Date.now();
        return;
      }

      this.modelsDevCache = {
        data: response.data as ModelsDevData,
        timestamp: Date.now(),
        etag: response.headers?.etag || null,
      };

      console.log("models.dev catalog loaded:", Object.keys(response.data).length, "providers");
    } catch (error: any) {
      console.warn("Failed to fetch models.dev catalog:", error.message);
      // Keep stale cache if available
    }
  }

  /**
   * Gets models from models.dev for a provider (fallback when API is unavailable).
   * Filters to chat-capable models only.
   */
  private getModelsFromModelsDev(provider: APIProvider): FetchedModel[] {
    const data = this.modelsDevCache.data;
    if (!data) return [];

    const modelsDevId = this.PROVIDER_TO_MODELS_DEV[provider];
    if (!modelsDevId || !data[modelsDevId]) return [];

    const providerData = data[modelsDevId];
    const models = Object.values(providerData.models || {});

    return models
      .filter((m) => {
        // Exclude embeddings, deprecated
        if (m.status === "deprecated") return false;
        if (m.id.includes("embedding")) return false;
        if (m.id.includes("tts")) return false;
        // Must have meaningful output token limit (not embeddings)
        if (m.limit?.output === 0 && m.cost?.output === 0) return false;
        return true;
      })
      .map((m) => this.modelsDevToFetchedModel(m, provider))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Merges models.dev catalog into API-fetched models:
   * 1. Enriches existing API models with pricing/capabilities from models.dev
   * 2. Appends models.dev models that weren't in the API result (comprehensive catalog)
   */
  private enrichWithModelsDev(models: FetchedModel[], provider: APIProvider): FetchedModel[] {
    const data = this.modelsDevCache.data;
    if (!data) return models;

    const modelsDevId = this.PROVIDER_TO_MODELS_DEV[provider];
    if (!modelsDevId || !data[modelsDevId]) return models;

    const catalog = data[modelsDevId].models || {};
    const apiModelIds = new Set(models.map((m) => m.id));

    // Step 1: Enrich existing API models with pricing
    const enriched = models.map((model) => {
      const catalogEntry = catalog[model.id];
      if (catalogEntry) {
        return {
          ...model,
          pricing: model.pricing || {
            input: catalogEntry.cost.input,
            output: catalogEntry.cost.output,
            cacheRead: catalogEntry.cost.cache_read,
            cacheWrite: catalogEntry.cost.cache_write,
          },
          contextLength: model.contextLength || catalogEntry.limit?.context,
          capabilities: {
            ...model.capabilities,
            vision: model.capabilities?.vision || catalogEntry.modalities?.input?.includes("image"),
            audio: model.capabilities?.audio || catalogEntry.modalities?.input?.includes("audio"),
          },
        };
      }
      return model;
    });

    // Step 2: Append models from models.dev that weren't returned by the API
    const catalogModels = this.getModelsFromModelsDev(provider);
    const additional = catalogModels.filter((m) => !apiModelIds.has(m.id));

    if (additional.length > 0) {
      console.log(`Added ${additional.length} models from models.dev catalog for ${provider}`);
    }

    return [...enriched, ...additional];
  }

  private modelsDevToFetchedModel(m: ModelsDevModel, provider: APIProvider): FetchedModel {
    return {
      id: m.id,
      name: m.name || m.id,
      provider,
      pricing: {
        input: m.cost.input,
        output: m.cost.output,
        cacheRead: m.cost.cache_read,
        cacheWrite: m.cost.cache_write,
      },
      contextLength: m.limit?.context,
      capabilities: {
        chat: true,
        vision: m.modalities?.input?.includes("image"),
        audio: m.modalities?.input?.includes("audio"),
        embedding: m.id.includes("embedding"),
      },
    };
  }

  // =============================================
  // Provider-specific API fetchers
  // =============================================

  private async fetchOpenAIModels(apiKey: string): Promise<FetchedModel[]> {
    const client = new OpenAI({ apiKey, timeout: 15000 });
    const models: OpenAI.Model[] = [];
    for await (const model of client.models.list()) {
      models.push(model);
    }

    const chatPrefixes = ["gpt-4", "gpt-3.5", "gpt-5", "o1", "o3", "o4", "chatgpt-"];
    const excludePrefixes = ["text-embedding-", "whisper-", "tts-", "dall-e-", "omni-moderation-", "text-moderation-"];

    return models
      .filter((m) => {
        const id = m.id.toLowerCase();
        const isExcluded = excludePrefixes.some((p) => id.startsWith(p));
        if (isExcluded) return false;
        return chatPrefixes.some((p) => id.startsWith(p));
      })
      .map((m) => ({
        id: m.id,
        name: m.id,
        provider: "openai" as APIProvider,
        capabilities: {
          chat: true,
          vision: m.id.includes("4o") || m.id.includes("gpt-4") || m.id.includes("gpt-5"),
        },
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private async fetchGeminiModels(apiKey: string): Promise<FetchedModel[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1000`;
    const response = await axios.default.get(url, { timeout: 15000 });

    const models = response.data.models || [];
    return models
      .filter(
        (m: any) =>
          m.supportedGenerationMethods?.includes("generateContent") &&
          m.name?.includes("gemini")
      )
      .map((m: any) => ({
        id: m.name.replace("models/", ""),
        name: m.displayName || m.name.replace("models/", ""),
        provider: "gemini" as APIProvider,
        contextLength: m.inputTokenLimit,
        capabilities: {
          chat: true,
          vision: m.name.includes("pro") || m.name.includes("flash"),
        },
      }))
      .sort((a: FetchedModel, b: FetchedModel) => a.name.localeCompare(b.name));
  }

  private async fetchAnthropicModels(apiKey: string): Promise<FetchedModel[]> {
    const response = await axios.default.get("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      timeout: 15000,
    });

    const models = response.data?.data || [];
    return models
      .map((m: any) => ({
        id: m.id,
        name: m.display_name || m.id,
        provider: "anthropic" as APIProvider,
        capabilities: { chat: true },
      }))
      .sort((a: FetchedModel, b: FetchedModel) => a.name.localeCompare(b.name));
  }

  private async fetchAzureModels(
    apiKey: string,
    endpoint?: string,
    apiVersion?: string
  ): Promise<FetchedModel[]> {
    if (!endpoint) {
      throw new Error("Azure OpenAI requires an endpoint URL");
    }

    const cleanEndpoint = endpoint.replace(/\/$/, "");
    const version = apiVersion || "2025-01-01-preview";

    // Try Azure models list endpoint (may not be available on all resources)
    try {
      const url = `${cleanEndpoint}/openai/models?api-version=${version}`;
      const response = await axios.default.get(url, {
        headers: { "api-key": apiKey },
        timeout: 15000,
      });

      const models = response.data?.data || [];
      if (models.length > 0) {
        return models
          .filter(
            (m: any) =>
              m.capabilities?.chat_completion ||
              m.capabilities?.inference ||
              m.status === "succeeded"
          )
          .map((m: any) => ({
            id: m.id,
            name: m.id,
            provider: "azure-openai" as APIProvider,
            capabilities: {
              chat: !!m.capabilities?.chat_completion,
              vision: m.id.includes("4o") || m.id.includes("gpt-4") || m.id.includes("gpt-5"),
            },
          }))
          .sort((a: FetchedModel, b: FetchedModel) => a.id.localeCompare(b.id));
      }
    } catch (azureApiErr: any) {
      console.warn(`Azure models list endpoint not available: ${azureApiErr.message}`);
    }

    // Azure models list not available — fall back to models.dev
    // This is common since the /openai/models endpoint isn't supported on all Azure resources
    throw new Error("Azure models list not available, falling back to catalog");
  }

  private async fetchOpenRouterModels(apiKey: string): Promise<FetchedModel[]> {
    const response = await axios.default.get("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 15000,
    });

    const models = response.data?.data || [];
    return models
      .filter(
        (m: any) =>
          !m.id.includes("embedding") &&
          !m.id.includes("tts") &&
          !m.id.includes("whisper") &&
          !m.id.includes("dall-e")
      )
      .map((m: any) => {
        const promptCost = parseFloat(m.pricing?.prompt || "0");
        const completionCost = parseFloat(m.pricing?.completion || "0");
        return {
          id: m.id,
          name: m.name || m.id,
          provider: "openrouter" as APIProvider,
          // OpenRouter pricing is per-token; convert to per-million-tokens
          pricing: {
            input: promptCost * 1_000_000,
            output: completionCost * 1_000_000,
          },
          contextLength: m.context_length || undefined,
          capabilities: {
            chat: true,
            vision: m.architecture?.input_modalities?.includes("image"),
          },
        };
      })
      .sort((a: FetchedModel, b: FetchedModel) => a.name.localeCompare(b.name));
  }

  // =============================================
  // Fallback & utilities
  // =============================================

  private getStaticFallbackModels(provider: APIProvider): FetchedModel[] {
    const allowed = ALLOWED_MODELS[provider] || [];
    return allowed.map((id) => ({
      id,
      name: id,
      provider,
    }));
  }

  /** Simple hash to avoid storing full API keys as cache keys */
  private hashKey(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  }

  /** Clear cache for a provider or all */
  public clearCache(provider?: APIProvider): void {
    if (provider) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(provider)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
