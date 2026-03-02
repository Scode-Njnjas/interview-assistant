/**
 * TranscriptionHelper - Handles audio transcription using AI SDK
 * - OpenAI/Azure: AI SDK transcribe() with Whisper
 * - Gemini: AI SDK generateText with audio file parts
 * - Anthropic/OpenRouter: Not supported
 */
import { experimental_transcribe as transcribe, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAzure } from '@ai-sdk/azure';
import { AIModelFactory, createModelFactory } from './ProviderClientFactory';
import { APIProvider } from '../shared/aiModels';
import { configHelper } from './ConfigHelper';

export interface TranscriptionResult {
  text: string;
  language?: string;
}

export interface ITranscriptionHelper {
  transcribeAudio(audioBuffer: Buffer, mimeType?: string): Promise<TranscriptionResult>;
}

export class TranscriptionHelper implements ITranscriptionHelper {
  private modelFactory: AIModelFactory | null = null;

  constructor() {
    this.initializeClients();

    configHelper.on('config-updated', () => {
      this.initializeClients();
    });
  }

  private initializeClients(): void {
    this.modelFactory = createModelFactory();
  }

  private isSpeechRecognitionSupported(provider: APIProvider): boolean {
    return provider === "openai" || provider === "gemini" || provider === "azure-openai";
  }

  private formatProviderError(provider: string, error: any, context: string): string {
    const status =
      typeof error?.status === "number"
        ? error.status
        : typeof error?.response?.status === "number"
          ? error.response.status
          : undefined;
    const message = error?.message || error?.response?.data?.error?.message || "Unknown error";
    const statusPart = status ? ` (status ${status})` : "";
    return `[${provider}] ${context} failed${statusPart}: ${message}`;
  }

  public async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string = 'audio/webm'
  ): Promise<TranscriptionResult> {
    const config = configHelper.loadConfig();

    if (!this.isSpeechRecognitionSupported(config.apiProvider)) {
      throw new Error(`Speech recognition is currently only supported with OpenAI, Azure OpenAI, or Gemini. Please switch to one of these providers in settings.`);
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty');
    }

    if (config.apiProvider === "openai") {
      return this.transcribeWithWhisper(audioBuffer, "openai");
    } else if (config.apiProvider === "azure-openai") {
      return this.transcribeWithWhisper(audioBuffer, "azure-openai");
    } else if (config.apiProvider === "gemini") {
      return this.transcribeWithGemini(audioBuffer, mimeType);
    }

    throw new Error(`Unsupported provider for transcription: ${config.apiProvider}`);
  }

  /**
   * Transcribes audio using AI SDK transcribe() with OpenAI/Azure Whisper
   */
  private async transcribeWithWhisper(
    audioBuffer: Buffer,
    provider: "openai" | "azure-openai"
  ): Promise<TranscriptionResult> {
    const config = configHelper.loadConfig();
    const speechModel = config.speechRecognitionModel || 'whisper-1';

    try {
      let transcriptionModel;

      if (provider === "openai") {
        const openai = createOpenAI({ apiKey: config.apiKey });
        transcriptionModel = openai.transcription(speechModel);
      } else {
        // Azure OpenAI
        const endpoint = (config.azureEndpoint || "").replace(/\/$/, "");
        if (!endpoint) throw new Error("Azure OpenAI endpoint not configured");

        const resourceName = endpoint.replace(/^https?:\/\//, "").split(".")[0];
        const azure = createAzure({
          resourceName,
          apiKey: config.apiKey,
          apiVersion: config.azureApiVersion || "2024-12-01-preview",
          useDeploymentBasedUrls: true,
        });
        transcriptionModel = azure.transcription(speechModel);
      }

      const result = await transcribe({
        model: transcriptionModel,
        audio: audioBuffer,
        providerOptions: {
          openai: {
            language: 'en',
          },
        },
      });

      return {
        text: result.text,
        language: result.language || undefined,
      };
    } catch (error: any) {
      console.error('Whisper transcription error:', error);

      const status = error?.status ?? error?.response?.status;
      if (status === 401) throw new Error(this.formatProviderError(provider, error, "Auth"));
      if (status === 429) throw new Error(this.formatProviderError(provider, error, "Rate limit"));
      throw new Error(this.formatProviderError(provider, error, "Transcription"));
    }
  }

  /**
   * Transcribes audio using AI SDK generateText with Gemini audio file parts
   */
  private async transcribeWithGemini(
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<TranscriptionResult> {
    if (!this.modelFactory) {
      throw new Error('Gemini model not initialized. Please set API key in settings.');
    }

    const config = configHelper.loadConfig();
    const speechModel = config.speechRecognitionModel || 'gemini-3-flash-preview';

    // Normalize MIME type
    let normalizedMimeType = mimeType;
    if (mimeType.includes('mp3') || mimeType.includes('mpeg')) normalizedMimeType = 'audio/mpeg';
    else if (mimeType.includes('wav')) normalizedMimeType = 'audio/wav';
    else if (mimeType.includes('flac')) normalizedMimeType = 'audio/flac';
    else if (mimeType.includes('m4a')) normalizedMimeType = 'audio/m4a';
    else if (mimeType.includes('ogg')) normalizedMimeType = 'audio/ogg';

    try {
      const { text } = await generateText({
        model: this.modelFactory(speechModel),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Please transcribe this audio to text. Return only the transcribed text without any additional commentary." },
              {
                type: "file",
                data: audioBuffer,
                mediaType: normalizedMimeType,
              },
            ],
          },
        ],
        maxOutputTokens: 4096,
        temperature: 0.1,
      });

      return {
        text: text.trim(),
        language: undefined,
      };
    } catch (error: any) {
      console.error('Gemini transcription error:', error);

      const status = error?.status ?? error?.response?.status;
      if (status === 401) throw new Error(this.formatProviderError("gemini", error, "Auth"));
      if (status === 429) throw new Error(this.formatProviderError("gemini", error, "Rate limit"));
      if (status === 400) throw new Error(this.formatProviderError("gemini", error, "Invalid audio file or request"));
      throw new Error(this.formatProviderError("gemini", error, "Transcription"));
    }
  }

  public isInitialized(): boolean {
    return this.modelFactory !== null;
  }

  public isSpeechRecognitionAvailable(): boolean {
    const config = configHelper.loadConfig();
    return this.isSpeechRecognitionSupported(config.apiProvider) && this.isInitialized();
  }
}
