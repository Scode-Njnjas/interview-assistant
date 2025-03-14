// shared/aiModels.ts
// Central configuration for AI providers, models, and related helpers.
// This module is the single source of truth for:
// - Supported providers
// - Available models per provider and category
// - Default models per provider and category
// - Model validation/sanitization
// - Provider configuration metadata
//
// Changing models or providers should only require edits in this file.

export type APIProvider = "openai" | "gemini" | "anthropic" | "azure-openai" | "openrouter";

export type ModelCategoryKey =
  | "extractionModel"
  | "solutionModel"
  | "debuggingModel"
  | "answerModel";

export interface AIModel {
  id: string;
  name: string;
  description: string;
}

export interface ModelPricing {
  input: number;    // USD per million tokens
  output: number;   // USD per million tokens
  cacheRead?: number;
  cacheWrite?: number;
}

export interface FetchedModel {
  id: string;
  name: string;
  provider: APIProvider;
  pricing?: ModelPricing;
  contextLength?: number;
  capabilities?: {
    chat?: boolean;
    vision?: boolean;
    audio?: boolean;
    embedding?: boolean;
  };
}

export interface ModelCategoryDefinition {
  key: ModelCategoryKey;
  title: string;
  description: string;
  modelsByProvider: Record<APIProvider, AIModel[]>;
}

export interface ProviderConfig {
  displayName: string;
  description: string;
  requiresEndpoint: boolean;
  requiresApiVersion: boolean;
  apiKeyPlaceholder: string;
  apiKeyPrefix?: string;
  apiKeyHelpUrl: string;
  apiKeyHelpSteps: string[];
  supportsModelFetch: boolean;
  supportsSpeechRecognition: boolean;
  usesOpenAISDK: boolean;
}

export const PROVIDER_CONFIGS: Record<APIProvider, ProviderConfig> = {
  openai: {
    displayName: "OpenAI",
    description: "GPT-4o models",
    requiresEndpoint: false,
    requiresApiVersion: false,
    apiKeyPlaceholder: "sk-...",
    apiKeyPrefix: "sk-",
    apiKeyHelpUrl: "https://platform.openai.com/api-keys",
    apiKeyHelpSteps: [
      "Create an account at OpenAI (https://platform.openai.com/signup)",
      "Go to API Keys section (https://platform.openai.com/api-keys)",
      "Create a new secret key and paste it here",
    ],
    supportsModelFetch: true,
    supportsSpeechRecognition: true,
    usesOpenAISDK: true,
  },
  gemini: {
    displayName: "Gemini",
    description: "Gemini 3 models",
    requiresEndpoint: false,
    requiresApiVersion: false,
    apiKeyPlaceholder: "Enter your Gemini API key",
    apiKeyHelpUrl: "https://aistudio.google.com/app/apikey",
    apiKeyHelpSteps: [
      "Create an account at Google AI Studio (https://aistudio.google.com/)",
      "Go to the API Keys section (https://aistudio.google.com/app/apikey)",
      "Create a new API key and paste it here",
    ],
    supportsModelFetch: true,
    supportsSpeechRecognition: true,
    usesOpenAISDK: false,
  },
  anthropic: {
    displayName: "Claude",
    description: "Claude models",
    requiresEndpoint: false,
    requiresApiVersion: false,
    apiKeyPlaceholder: "sk-ant-...",
    apiKeyPrefix: "sk-ant-",
    apiKeyHelpUrl: "https://console.anthropic.com/settings/keys",
    apiKeyHelpSteps: [
      "Create an account at Anthropic (https://console.anthropic.com/signup)",
      "Go to the API Keys section (https://console.anthropic.com/settings/keys)",
      "Create a new API key and paste it here",
    ],
    supportsModelFetch: true,
    supportsSpeechRecognition: false,
    usesOpenAISDK: false,
  },
  "azure-openai": {
    displayName: "Azure OpenAI",
    description: "Azure-hosted models",
    requiresEndpoint: true,
    requiresApiVersion: true,
    apiKeyPlaceholder: "Enter your Azure API key",
    apiKeyHelpUrl: "https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI",
    apiKeyHelpSteps: [
      "Create an Azure OpenAI resource in Azure Portal",
      "Go to Keys and Endpoint in your resource",
      "Copy Key 1 or Key 2 and paste it here",
    ],
    supportsModelFetch: true,
    supportsSpeechRecognition: true,
    usesOpenAISDK: true,
  },
  openrouter: {
    displayName: "OpenRouter",
    description: "Multi-provider access",
    requiresEndpoint: false,
    requiresApiVersion: false,
    apiKeyPlaceholder: "sk-or-...",
    apiKeyPrefix: "sk-or-",
    apiKeyHelpUrl: "https://openrouter.ai/keys",
    apiKeyHelpSteps: [
      "Create an account at OpenRouter (https://openrouter.ai)",
      "Go to Keys (https://openrouter.ai/keys)",
      "Create a new API key and paste it here",
    ],
    supportsModelFetch: true,
    supportsSpeechRecognition: false,
    usesOpenAISDK: true,
  },
};

/**
 * Default provider used when no provider is configured or an invalid provider is found.
 */
export const DEFAULT_PROVIDER: APIProvider = "gemini";

/**
 * Default models per provider and category.
 * These are used for:
 * - Initial config defaults
 * - Resetting models when provider changes
 * - Fallbacks when a model is missing in config
 */
export const DEFAULT_MODELS: Record<
  APIProvider,
  {
    extractionModel: string;
    solutionModel: string;
    debuggingModel: string;
    answerModel: string;
    speechRecognitionModel?: string;
  }
> = {
  openai: {
    extractionModel: "gpt-4o",
    solutionModel: "gpt-4o",
    debuggingModel: "gpt-4o",
    answerModel: "gpt-4o-mini",
    speechRecognitionModel: "whisper-1",
  },
  gemini: {
    extractionModel: "gemini-3-flash-preview",
    solutionModel: "gemini-3-flash-preview",
    debuggingModel: "gemini-3-flash-preview",
    answerModel: "gemini-3-flash-preview",
    speechRecognitionModel: "gemini-3-flash-preview",
  },
  anthropic: {
    extractionModel: "claude-3-7-sonnet-20250219",
    solutionModel: "claude-3-7-sonnet-20250219",
    debuggingModel: "claude-3-7-sonnet-20250219",
    answerModel: "claude-3-7-sonnet-20250219",
  },
  "azure-openai": {
    extractionModel: "gpt-4o",
    solutionModel: "gpt-4o",
    debuggingModel: "gpt-4o",
    answerModel: "gpt-4o-mini",
    speechRecognitionModel: "whisper-1",
  },
  openrouter: {
    extractionModel: "openai/gpt-4o",
    solutionModel: "openai/gpt-4o",
    debuggingModel: "openai/gpt-4o",
    answerModel: "openai/gpt-4o-mini",
  },
};

/**
 * Default models specifically for the answer suggestion assistant.
 */
export const DEFAULT_ANSWER_MODELS: Record<APIProvider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-3-flash-preview",
  anthropic: "claude-3-7-sonnet-20250219",
  "azure-openai": "gpt-4o-mini",
  openrouter: "openai/gpt-4o-mini",
};

/**
 * Allowed model ids per provider (static fallbacks).
 * Used when dynamic model fetching fails or hasn't been triggered.
 */
export const ALLOWED_MODELS: Record<APIProvider, string[]> = {
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
  ],
  gemini: [
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3-pro-image-preview",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash-exp",
  ],
  anthropic: [
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
  ],
  "azure-openai": [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4",
    "gpt-35-turbo",
  ],
  openrouter: [
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-7-sonnet",
    "google/gemini-pro-1.5",
    "google/gemini-flash-1.5",
  ],
};

/**
 * Settings UI model catalogue, organized by functional category and provider.
 * These serve as static fallback options when dynamic fetch is unavailable.
 */
export const MODEL_CATEGORIES: ModelCategoryDefinition[] = [
  {
    key: "extractionModel",
    title: "Problem Extraction",
    description:
      "Model used to analyze screenshots and extract problem details",
    modelsByProvider: {
      openai: [
        {
          id: "gpt-4o",
          name: "gpt-4o",
          description: "Best overall performance for problem extraction",
        },
        {
          id: "gpt-4o-mini",
          name: "gpt-4o-mini",
          description: "Faster, more cost-effective option",
        },
      ],
      gemini: [
        {
          id: "gemini-3-pro-preview",
          name: "Gemini 3 Pro (Preview)",
          description: "Best overall performance for complex tasks requiring advanced reasoning",
        },
        {
          id: "gemini-3-flash-preview",
          name: "Gemini 3 Flash (Preview)",
          description: "Pro-level intelligence at Flash speed and pricing",
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          description: "Legacy model - use Gemini 3 for best results",
        },
        {
          id: "gemini-1.5-flash",
          name: "Gemini 1.5 Flash",
          description: "Legacy model - use Gemini 3 Flash for best results",
        },
      ],
      anthropic: [
        {
          id: "claude-3-7-sonnet-20250219",
          name: "Claude 3.7 Sonnet",
          description: "Best overall performance for problem extraction",
        },
        {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
          description: "Balanced performance and speed",
        },
        {
          id: "claude-3-opus-20240229",
          name: "Claude 3 Opus",
          description:
            "Top-level intelligence, fluency, and understanding",
        },
      ],
      "azure-openai": [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          description: "Best overall performance (Azure deployment)",
        },
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          description: "Faster, more cost-effective (Azure deployment)",
        },
      ],
      openrouter: [
        {
          id: "openai/gpt-4o",
          name: "OpenAI GPT-4o",
          description: "Best overall performance via OpenRouter",
        },
        {
          id: "openai/gpt-4o-mini",
          name: "OpenAI GPT-4o Mini",
          description: "Fast and cost-effective via OpenRouter",
        },
        {
          id: "anthropic/claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet",
          description: "Balanced performance via OpenRouter",
        },
        {
          id: "google/gemini-pro-1.5",
          name: "Gemini 1.5 Pro",
          description: "Google's flagship via OpenRouter",
        },
      ],
    },
  },
  {
    key: "solutionModel",
    title: "Solution Generation",
    description: "Model used to generate coding solutions",
    modelsByProvider: {
      openai: [
        {
          id: "gpt-4o",
          name: "gpt-4o",
          description: "Strong overall performance for coding tasks",
        },
        {
          id: "gpt-4o-mini",
          name: "gpt-4o-mini",
          description: "Faster, more cost-effective option",
        },
      ],
      gemini: [
        {
          id: "gemini-3-pro-latest",
          name: "Gemini 3 Pro (Latest)",
          description: "Strong overall performance - latest version",
        },
        {
          id: "gemini-3-flash-latest",
          name: "Gemini 3 Flash (Latest)",
          description: "Faster, more cost-effective - latest version",
        },
        {
          id: "gemini-3-pro",
          name: "Gemini 3 Pro",
          description: "Stable version",
        },
        {
          id: "gemini-3-flash",
          name: "Gemini 3 Flash",
          description: "Stable version",
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          description: "Legacy model - use Gemini 3 for best results",
        },
      ],
      anthropic: [
        {
          id: "claude-3-7-sonnet-20250219",
          name: "Claude 3.7 Sonnet",
          description: "Strong overall performance for coding tasks",
        },
        {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
          description: "Balanced performance and speed",
        },
        {
          id: "claude-3-opus-20240229",
          name: "Claude 3 Opus",
          description:
            "Top-level intelligence, fluency, and understanding",
        },
      ],
      "azure-openai": [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          description: "Strong coding performance (Azure deployment)",
        },
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          description: "Faster, more cost-effective (Azure deployment)",
        },
      ],
      openrouter: [
        {
          id: "openai/gpt-4o",
          name: "OpenAI GPT-4o",
          description: "Strong coding performance via OpenRouter",
        },
        {
          id: "openai/gpt-4o-mini",
          name: "OpenAI GPT-4o Mini",
          description: "Fast and cost-effective via OpenRouter",
        },
        {
          id: "anthropic/claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet",
          description: "Strong coding via OpenRouter",
        },
        {
          id: "google/gemini-pro-1.5",
          name: "Gemini 1.5 Pro",
          description: "Google's flagship via OpenRouter",
        },
      ],
    },
  },
  {
    key: "debuggingModel",
    title: "Debugging",
    description: "Model used to debug and improve solutions",
    modelsByProvider: {
      openai: [
        {
          id: "gpt-4o",
          name: "gpt-4o",
          description: "Best for analyzing code and error messages",
        },
        {
          id: "gpt-4o-mini",
          name: "gpt-4o-mini",
          description: "Faster, more cost-effective option",
        },
      ],
      gemini: [
        {
          id: "gemini-3-pro-latest",
          name: "Gemini 3 Pro (Latest)",
          description:
            "Best for analyzing code and error messages - latest version",
        },
        {
          id: "gemini-3-flash-latest",
          name: "Gemini 3 Flash (Latest)",
          description: "Faster, more cost-effective - latest version",
        },
        {
          id: "gemini-3-pro",
          name: "Gemini 3 Pro",
          description: "Stable version",
        },
        {
          id: "gemini-3-flash",
          name: "Gemini 3 Flash",
          description: "Stable version",
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          description: "Legacy model - use Gemini 3 for best results",
        },
      ],
      anthropic: [
        {
          id: "claude-3-7-sonnet-20250219",
          name: "Claude 3.7 Sonnet",
          description: "Best for analyzing code and error messages",
        },
        {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
          description: "Balanced performance and speed",
        },
        {
          id: "claude-3-opus-20240229",
          name: "Claude 3 Opus",
          description:
            "Top-level intelligence, fluency, and understanding",
        },
      ],
      "azure-openai": [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          description: "Best for debugging (Azure deployment)",
        },
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          description: "Faster debugging (Azure deployment)",
        },
      ],
      openrouter: [
        {
          id: "openai/gpt-4o",
          name: "OpenAI GPT-4o",
          description: "Best for debugging via OpenRouter",
        },
        {
          id: "openai/gpt-4o-mini",
          name: "OpenAI GPT-4o Mini",
          description: "Fast debugging via OpenRouter",
        },
        {
          id: "anthropic/claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet",
          description: "Strong debugging via OpenRouter",
        },
        {
          id: "google/gemini-pro-1.5",
          name: "Gemini 1.5 Pro",
          description: "Google's flagship via OpenRouter",
        },
      ],
    },
  },
  {
    key: "answerModel",
    title: "Answer Suggestions",
    description: "Model used to generate AI answer suggestions for conversation questions",
    modelsByProvider: {
      openai: [
        {
          id: "gpt-4o-mini",
          name: "gpt-4o-mini",
          description: "Fast and cost-effective for conversation suggestions",
        },
        {
          id: "gpt-4o",
          name: "gpt-4o",
          description: "Best overall performance for answer suggestions",
        },
      ],
      gemini: [
        {
          id: "gemini-3-flash-preview",
          name: "Gemini 3 Flash (Preview)",
          description: "Fast and efficient for conversation suggestions",
        },
        {
          id: "gemini-3-pro-preview",
          name: "Gemini 3 Pro (Preview)",
          description: "Best performance for complex conversation contexts",
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          description: "Legacy model - use Gemini 3 for best results",
        },
        {
          id: "gemini-1.5-flash",
          name: "Gemini 1.5 Flash",
          description: "Legacy model - use Gemini 3 Flash for best results",
        },
      ],
      anthropic: [
        {
          id: "claude-3-7-sonnet-20250219",
          name: "Claude 3.7 Sonnet",
          description: "Best overall performance for answer suggestions",
        },
        {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
          description: "Balanced performance and speed",
        },
        {
          id: "claude-3-opus-20240229",
          name: "Claude 3 Opus",
          description:
            "Top-level intelligence, fluency, and understanding",
        },
      ],
      "azure-openai": [
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          description: "Fast and cost-effective (Azure deployment)",
        },
        {
          id: "gpt-4o",
          name: "GPT-4o",
          description: "Best performance (Azure deployment)",
        },
      ],
      openrouter: [
        {
          id: "openai/gpt-4o-mini",
          name: "OpenAI GPT-4o Mini",
          description: "Fast and cost-effective via OpenRouter",
        },
        {
          id: "openai/gpt-4o",
          name: "OpenAI GPT-4o",
          description: "Best performance via OpenRouter",
        },
        {
          id: "anthropic/claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet",
          description: "Balanced via OpenRouter",
        },
      ],
    },
  },
];

/**
 * Sanitize a model selection to ensure only allowed models are used.
 * For providers with dynamic model fetching (azure-openai, openrouter),
 * unknown models are accepted since they may be valid deployments.
 * If the model is not allowed for the provider, the provider's default
 * model for the given category is returned.
 */
export function sanitizeModelSelection(
  model: string,
  provider: APIProvider,
  category: ModelCategoryKey,
  dynamicAllowList?: string[]
): string {
  // If dynamic list is provided, validate against it
  if (dynamicAllowList && dynamicAllowList.length > 0) {
    if (dynamicAllowList.includes(model)) {
      return model;
    }
  }

  // For dynamic providers, accept any non-empty model string
  if (provider === "azure-openai" || provider === "openrouter") {
    if (model && model.trim().length > 0) {
      return model;
    }
  }

  const allowed = ALLOWED_MODELS[provider];
  if (allowed && allowed.includes(model)) {
    return model;
  }

  const fallback = DEFAULT_MODELS[provider]?.[category];
  if (fallback) {
    // eslint-disable-next-line no-console
    console.warn(
      `Invalid ${provider} model specified for ${category}: ${model}. Using default model: ${fallback}`
    );
    return fallback;
  }

  return model;
}

/**
 * Models that use the newer OpenAI API parameter conventions:
 * - `max_completion_tokens` instead of `max_tokens`
 * - Temperature fixed at 1 (custom values rejected)
 *
 * GPT-5 family, o-series (o1, o3, o4), GPT-4.1, and Codex models.
 */
const NEWER_MODEL_PREFIXES = [
  "gpt-5",
  "o1",
  "o3",
  "o4",
  "gpt-4.1",
  "gpt-5.1",
  "gpt-5.2",
  "gpt-5.3",
  "codex",
];

function isNewerModel(model: string): boolean {
  const lower = model.toLowerCase();
  // Strip OpenRouter-style provider prefix (e.g., "openai/gpt-5" -> "gpt-5")
  const modelName = lower.includes("/") ? lower.split("/").pop()! : lower;
  return NEWER_MODEL_PREFIXES.some((p) => modelName.startsWith(p));
}

/**
 * Builds the correct token limit parameter for an OpenAI-compatible API call.
 * Newer models (gpt-5, o-series, gpt-4.1) use `max_completion_tokens`.
 * Older models (gpt-4o, gpt-3.5) use `max_tokens`.
 */
export function getTokenLimitParam(
  model: string,
  limit: number
): { max_tokens: number } | { max_completion_tokens: number } {
  if (isNewerModel(model)) {
    return { max_completion_tokens: limit };
  }
  return { max_tokens: limit };
}

/**
 * Returns all model-specific API parameters for an OpenAI-compatible call.
 * Handles both token limit naming AND temperature support.
 *
 * Newer models (gpt-5, o-series):
 *   - Use `max_completion_tokens` instead of `max_tokens`
 *   - Only support temperature=1 (custom values rejected with 400)
 *
 * Usage:
 *   client.chat.completions.create({
 *     model,
 *     messages,
 *     ...getModelParams(model, { maxTokens: 4000, temperature: 0.2 }),
 *   })
 */
export function getModelParams(
  model: string,
  opts: { maxTokens: number; temperature?: number }
): Record<string, number> {
  const newer = isNewerModel(model);
  const params: Record<string, number> = {};

  // Token limit param
  if (newer) {
    params.max_completion_tokens = opts.maxTokens;
  } else {
    params.max_tokens = opts.maxTokens;
  }

  // Temperature: newer models only accept default (1), so omit it
  if (!newer && opts.temperature !== undefined) {
    params.temperature = opts.temperature;
  }

  return params;
}
