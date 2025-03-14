import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Settings, Loader2, RefreshCw, Search } from "lucide-react";
import { useToast } from "../../contexts/toast";
import { CandidateProfileSection, CandidateProfile } from "./CandidateProfileSection";
import {
  APIProvider,
  AIModel,
  FetchedModel,
  ModelPricing,
  MODEL_CATEGORIES,
  DEFAULT_MODELS,
  PROVIDER_CONFIGS,
} from "../../../shared/aiModels";

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const providerEntries = Object.entries(PROVIDER_CONFIGS) as [APIProvider, typeof PROVIDER_CONFIGS[APIProvider]][];

export function SettingsDialog({ open: externalOpen, onOpenChange }: SettingsDialogProps) {
  const [open, setOpen] = useState(externalOpen || false);
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState<APIProvider>("openai");
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureApiVersion, setAzureApiVersion] = useState("2025-01-01-preview");
  const [extractionModel, setExtractionModel] = useState(
    DEFAULT_MODELS.openai.extractionModel
  );
  const [solutionModel, setSolutionModel] = useState(
    DEFAULT_MODELS.openai.solutionModel
  );
  const [debuggingModel, setDebuggingModel] = useState(
    DEFAULT_MODELS.openai.debuggingModel
  );
  const [answerModel, setAnswerModel] = useState(
    DEFAULT_MODELS.openai.answerModel
  );
  const [speechRecognitionModel, setSpeechRecognitionModel] = useState("whisper-1");
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>({
    name: "",
    resume: "",
    jobDescription: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<FetchedModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [modelFetchSource, setModelFetchSource] = useState<string | null>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const { showToast } = useToast();

  // Sync with external open state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  // Handle open state changes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (onOpenChange && newOpen !== externalOpen) {
      onOpenChange(newOpen);
    }
  };

  // Fetch models from provider API (models.dev works even without key)
  const doFetchModels = async (provider: APIProvider, key: string, endpoint?: string, version?: string) => {

    setIsLoadingModels(true);
    setModelFetchError(null);
    setModelFetchSource(null);
    try {
      const result = await window.electronAPI.fetchProviderModels(
        provider,
        key,
        {
          endpoint: provider === "azure-openai" ? endpoint : undefined,
          apiVersion: provider === "azure-openai" ? version : undefined,
        }
      );
      if (result.success) {
        setFetchedModels(result.models as FetchedModel[]);
        setModelFetchSource(result.source || "api");
      } else {
        setModelFetchError(result.error || "Failed to fetch models");
        // Still set models from fallback if returned
        if (result.models && result.models.length > 0) {
          setFetchedModels(result.models as FetchedModel[]);
          setModelFetchSource(result.source || "static");
        } else {
          setFetchedModels([]);
        }
      }
    } catch {
      setModelFetchError("Failed to fetch models");
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Wrapper that uses current state (for button clicks)
  const handleFetchModels = useCallback(() => {
    doFetchModels(apiProvider, apiKey, azureEndpoint, azureApiVersion);
  }, [apiProvider, apiKey, azureEndpoint, azureApiVersion]);

  // Load current config on dialog open — only depends on `open`
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      interface Config {
        apiKey?: string;
        apiProvider?: APIProvider;
        azureEndpoint?: string;
        azureApiVersion?: string;
        extractionModel?: string;
        solutionModel?: string;
        debuggingModel?: string;
        answerModel?: string;
        speechRecognitionModel?: string;
        candidateProfile?: CandidateProfile;
      }

      window.electronAPI
        .getConfig()
        .then((config: Config) => {
          setApiKey(config.apiKey || "");
          const provider: APIProvider = (config.apiProvider as APIProvider) || "openai";
          setApiProvider(provider);
          setAzureEndpoint(config.azureEndpoint || "");
          setAzureApiVersion(config.azureApiVersion || "2025-01-01-preview");
          const providerDefaults = DEFAULT_MODELS[provider];
          setExtractionModel(
            config.extractionModel || providerDefaults.extractionModel
          );
          setSolutionModel(
            config.solutionModel || providerDefaults.solutionModel
          );
          setDebuggingModel(
            config.debuggingModel || providerDefaults.debuggingModel
          );
          setAnswerModel(
            config.answerModel || providerDefaults.answerModel
          );
          setSpeechRecognitionModel(
            config.speechRecognitionModel ||
              providerDefaults.speechRecognitionModel ||
              (provider === "gemini" ? "gemini-3-flash-preview" : "whisper-1")
          );
          setCandidateProfile(config.candidateProfile || {
            name: "",
            resume: "",
            jobDescription: ""
          });
          setFetchedModels([]);
          setModelSearchQuery("");

          // Always fetch models (models.dev works without API key, provider APIs need one)
          doFetchModels(provider, config.apiKey || "", config.azureEndpoint, config.azureApiVersion);
        })
        .catch((error: unknown) => {
          console.error("Failed to load config:", error);
          showToast("Error", "Failed to load settings", "error");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Handle API provider change
  const handleProviderChange = (provider: APIProvider) => {
    setApiProvider(provider);
    setFetchedModels([]);
    setModelSearchQuery("");
    setModelFetchError(null);

    // Reset models to defaults when changing provider
    const defaults = DEFAULT_MODELS[provider];
    setExtractionModel(defaults.extractionModel);
    setSolutionModel(defaults.solutionModel);
    setDebuggingModel(defaults.debuggingModel);
    setAnswerModel(defaults.answerModel);
    setSpeechRecognitionModel(
      defaults.speechRecognitionModel || ""
    );

    // Always fetch models (models.dev works without API key)
    setTimeout(() => doFetchModels(provider, apiKey || "", azureEndpoint, azureApiVersion), 0);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.updateConfig({
        apiKey,
        apiProvider,
        azureEndpoint: apiProvider === "azure-openai" ? azureEndpoint : undefined,
        azureApiVersion: apiProvider === "azure-openai" ? azureApiVersion : undefined,
        extractionModel,
        solutionModel,
        debuggingModel,
        answerModel,
        speechRecognitionModel,
        candidateProfile,
      });

      if (result) {
        showToast("Success", "Settings saved successfully", "success");
        handleOpenChange(false);

        // Force reload the app to apply the API key
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("Error", "Failed to save settings", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Mask API key for display
  const maskApiKey = (key: string) => {
    if (!key || key.length < 10) return "";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  // Open external link handler
  const openExternalLink = (url: string) => {
    window.electronAPI.openLink(url);
  };

  // Format pricing for display
  const formatPrice = (price: number): string => {
    if (price === 0) return "Free";
    if (price < 0.01) return `<$0.01`;
    if (price < 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(price >= 10 ? 0 : 2)}`;
  };

  // Build pricing description string
  const pricingDesc = (pricing?: ModelPricing, contextLength?: number): string => {
    const parts: string[] = [];
    if (pricing) {
      if (pricing.input === 0 && pricing.output === 0) {
        parts.push("Free");
      } else {
        parts.push(`${formatPrice(pricing.input)}/${formatPrice(pricing.output)} per M tokens`);
      }
    }
    if (contextLength) {
      const ctxK = contextLength >= 1_000_000
        ? `${(contextLength / 1_000_000).toFixed(1)}M`
        : `${Math.round(contextLength / 1000)}K`;
      parts.push(`${ctxK} ctx`);
    }
    return parts.join(" · ");
  };

  // Get models for a category (dynamic or static fallback)
  const getModelsForCategory = (categoryKey: string): AIModel[] => {
    if (fetchedModels.length > 0) {
      return fetchedModels.map((m) => ({
        id: m.id,
        name: m.name,
        description: pricingDesc(m.pricing, m.contextLength),
      }));
    }
    const category = MODEL_CATEGORIES.find((c) => c.key === categoryKey);
    return category?.modelsByProvider[apiProvider] || [];
  };

  // Filter models by search query
  const filterModels = (models: AIModel[]): AIModel[] => {
    if (!modelSearchQuery) return models;
    const q = modelSearchQuery.toLowerCase();
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  };

  const currentProviderConfig = PROVIDER_CONFIGS[apiProvider];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-black border border-white/10 text-white settings-dialog"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(450px, 90vw)',
          height: 'auto',
          minHeight: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 9999,
          margin: 0,
          padding: '20px',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          animation: 'fadeIn 0.25s ease forwards',
          opacity: 0.98
        }}
      >
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="text-white/70">
            Configure your API key, AI models, and optional candidate profile.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* API Settings Section */}
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">API Settings</h2>
            <p className="text-xs text-white/60">
              Choose your provider and models. These control how screenshots and solutions are processed.
            </p>
          </div>

          {/* API Provider Selection - Dynamic grid from PROVIDER_CONFIGS */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">API Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {providerEntries.map(([key, config]) => (
                <div
                  key={key}
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    apiProvider === key
                      ? "bg-white/10 border border-white/20"
                      : "bg-black/30 border border-white/5 hover:bg-white/5"
                  }`}
                  onClick={() => handleProviderChange(key)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        apiProvider === key ? "bg-white" : "bg-white/20"
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <p className="font-medium text-white text-xs truncate">{config.displayName}</p>
                      <p className="text-[10px] text-white/60 truncate">{config.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white" htmlFor="apiKey">
              {currentProviderConfig.displayName} API Key
            </label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={currentProviderConfig.apiKeyPlaceholder}
              className="bg-black/50 border-white/10 text-white"
            />
            {apiKey && (
              <p className="text-xs text-white/50">
                Current: {maskApiKey(apiKey)}
              </p>
            )}
            <p className="text-xs text-white/50">
              Your API key is stored locally and never sent to any server except the configured provider.
            </p>

            {/* API Key Help */}
            <div className="mt-2 p-2 rounded-md bg-white/5 border border-white/10">
              <p className="text-xs text-white/80 mb-1">Don't have an API key?</p>
              {currentProviderConfig.apiKeyHelpSteps.map((step, i) => {
                // Extract URL from step text if present
                const urlMatch = step.match(/\((https?:\/\/[^)]+)\)/);
                const url = urlMatch?.[1];
                const textBefore = url ? step.substring(0, step.indexOf('(')) : step;
                const linkText = url ? currentProviderConfig.displayName : "";

                return (
                  <p key={i} className="text-xs text-white/60 mb-1">
                    {i + 1}. {url ? (
                      <>
                        {textBefore}
                        <button
                          onClick={() => openExternalLink(url)}
                          className="text-blue-400 hover:underline cursor-pointer"
                        >
                          {linkText || "Link"}
                        </button>
                      </>
                    ) : step}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Azure-specific fields */}
          {apiProvider === "azure-openai" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Azure Endpoint URL</label>
              <Input
                value={azureEndpoint}
                onChange={(e) => setAzureEndpoint(e.target.value)}
                placeholder="https://your-resource.openai.azure.com"
                className="bg-black/50 border-white/10 text-white"
              />
              <label className="text-sm font-medium text-white">API Version</label>
              <Input
                value={azureApiVersion}
                onChange={(e) => setAzureApiVersion(e.target.value)}
                placeholder="2025-01-01-preview"
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
          )}

          {/* Keyboard Shortcuts */}
          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-white mb-2 block">Keyboard Shortcuts</label>
            <div className="bg-black/30 border border-white/10 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div className="text-white/70">Toggle Visibility</div>
                <div className="text-white/90 font-mono">Ctrl+B / Cmd+B</div>
                <div className="text-white/70">Take Screenshot</div>
                <div className="text-white/90 font-mono">Ctrl+H / Cmd+H</div>
                <div className="text-white/70">Start/Stop Recording</div>
                <div className="text-white/90 font-mono">Ctrl+M / Cmd+M</div>
                <div className="text-white/70">Toggle Speaker Mode</div>
                <div className="text-white/90 font-mono">Ctrl+Shift+M / Cmd+Shift+M</div>
                <div className="text-white/70">Process Screenshots</div>
                <div className="text-white/90 font-mono">Ctrl+Enter / Cmd+Enter</div>
                <div className="text-white/70">Delete Last Screenshot</div>
                <div className="text-white/90 font-mono">Ctrl+L / Cmd+L</div>
                <div className="text-white/70">Reset View</div>
                <div className="text-white/90 font-mono">Ctrl+R / Cmd+R</div>
                <div className="text-white/70">Quit Application</div>
                <div className="text-white/90 font-mono">Ctrl+Q / Cmd+Q</div>
                <div className="text-white/70">Move Window</div>
                <div className="text-white/90 font-mono">Ctrl+Arrow Keys</div>
                <div className="text-white/70">Decrease Opacity</div>
                <div className="text-white/90 font-mono">Ctrl+[ / Cmd+[</div>
                <div className="text-white/70">Increase Opacity</div>
                <div className="text-white/90 font-mono">Ctrl+] / Cmd+]</div>
                <div className="text-white/70">Zoom Out</div>
                <div className="text-white/90 font-mono">Ctrl+- / Cmd+-</div>
                <div className="text-white/70">Reset Zoom</div>
                <div className="text-white/90 font-mono">Ctrl+0 / Cmd+0</div>
                <div className="text-white/70">Zoom In</div>
                <div className="text-white/90 font-mono">Ctrl+= / Cmd+=</div>
              </div>
            </div>
          </div>

          {/* AI Model Selection */}
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-white">AI Model Selection</label>
                <p className="text-xs text-white/60 mt-1">
                  Select which models to use for each stage of the process
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFetchModels()}
                disabled={!apiKey || isLoadingModels}
                className="border-white/10 hover:bg-white/5 text-white text-xs h-7 px-2"
              >
                {isLoadingModels ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                {isLoadingModels ? "Fetching..." : "Refresh Models"}
              </Button>
            </div>

            {modelFetchError && (
              <p className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded p-2">
                {modelFetchError} — showing {modelFetchSource === "models.dev" ? "models.dev catalog" : "default"} models.
              </p>
            )}

            {fetchedModels.length > 0 && (
              <p className="text-xs text-green-400">
                {fetchedModels.length} models loaded
                {modelFetchSource === "api" ? ` from ${currentProviderConfig.displayName}` :
                 modelFetchSource === "models.dev" ? " from models.dev catalog" : ""}
                {fetchedModels.some(m => m.pricing) ? " (with pricing)" : ""}
              </p>
            )}

            {/* Search filter (shown when many models) */}
            {fetchedModels.length > 10 && (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                <Input
                  placeholder="Search models..."
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                  className="bg-black/50 border-white/10 text-white text-xs pl-7 h-8"
                />
              </div>
            )}

            {MODEL_CATEGORIES.map((category) => {
              const models = getModelsForCategory(category.key);
              const filteredModels = filterModels(models);

              // Determine which state to use based on category key
              const currentValue =
                category.key === 'extractionModel' ? extractionModel :
                category.key === 'solutionModel' ? solutionModel :
                category.key === 'debuggingModel' ? debuggingModel :
                answerModel;

              const setValue =
                category.key === 'extractionModel' ? setExtractionModel :
                category.key === 'solutionModel' ? setSolutionModel :
                category.key === 'debuggingModel' ? setDebuggingModel :
                setAnswerModel;

              return (
                <div key={category.key} className="mb-4">
                  <label className="text-sm font-medium text-white mb-1 block">
                    {category.title}
                  </label>
                  <p className="text-xs text-white/60 mb-2">{category.description}</p>

                  {/* Current selection display */}
                  {currentValue && (
                    <p className="text-xs text-white/50 mb-1">
                      Selected: <span className="text-white/80 font-mono">{currentValue}</span>
                    </p>
                  )}

                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredModels.length === 0 ? (
                      <p className="text-xs text-white/40 p-2">
                        {modelSearchQuery ? "No models match your search" : "No models available"}
                      </p>
                    ) : (
                      filteredModels.map((m) => (
                        <div
                          key={m.id}
                          className={`p-2 rounded-lg cursor-pointer transition-colors ${
                            currentValue === m.id
                              ? "bg-white/10 border border-white/20"
                              : "bg-black/30 border border-white/5 hover:bg-white/5"
                          }`}
                          onClick={() => setValue(m.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                currentValue === m.id ? "bg-white" : "bg-white/20"
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-white text-xs truncate">{m.name}</p>
                              {m.description && (
                                <p className="text-xs text-white/60 truncate">{m.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Speech Recognition Model Selection */}
          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-white mb-1 block">
              Speech Recognition Model
            </label>
            <p className="text-xs text-white/60 mb-2">
              Model used for transcribing interview conversations
            </p>

            {(apiProvider === "openai" || apiProvider === "azure-openai") ? (
              <div className="space-y-2">
                <div
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    speechRecognitionModel === "whisper-1"
                      ? "bg-white/10 border border-white/20"
                      : "bg-black/30 border border-white/5 hover:bg-white/5"
                  }`}
                  onClick={() => setSpeechRecognitionModel("whisper-1")}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        speechRecognitionModel === "whisper-1" ? "bg-white" : "bg-white/20"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-white text-xs">Whisper-1</p>
                      <p className="text-xs text-white/60">OpenAI's speech-to-text model</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : apiProvider === "gemini" ? (
              <div className="space-y-2">
                {[
                  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", desc: "Fast and efficient audio understanding" },
                  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", desc: "Higher accuracy audio understanding" },
                  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)", desc: "Latest preview model with audio understanding" },
                  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Preview)", desc: "Best accuracy with audio understanding" },
                ].map((m) => (
                  <div
                    key={m.id}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      speechRecognitionModel === m.id
                        ? "bg-white/10 border border-white/20"
                        : "bg-black/30 border border-white/5 hover:bg-white/5"
                    }`}
                    onClick={() => setSpeechRecognitionModel(m.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          speechRecognitionModel === m.id ? "bg-white" : "bg-white/20"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-white text-xs">{m.name}</p>
                        <p className="text-xs text-white/60">{m.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                <p className="text-sm text-white/70">
                  Speech recognition is only supported with OpenAI, Azure OpenAI, or Gemini. Please switch to one of these providers to use this feature.
                </p>
              </div>
            )}
          </div>

          {/* Candidate Profile Section */}
          <div className="space-y-4 mt-6 border-t border-white/10 pt-4">
            <div>
              <label className="text-sm font-medium text-white mb-1 block">
                Candidate Profile
              </label>
              <p className="text-xs text-white/60 mb-3">
                Add your resume and details to get more personalized AI answer suggestions during interviews.
              </p>
              <CandidateProfileSection
                profile={candidateProfile}
                onProfileChange={setCandidateProfile}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-white/10 hover:bg-white/5 text-white"
          >
            Cancel
          </Button>
          <Button
            className="px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
            onClick={handleSave}
            disabled={isLoading || !apiKey}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
