# Interview Assistant

AI-powered Electron desktop app for technical coding interview assistance. Captures screenshots, extracts problems via vision APIs, generates solutions, and supports live conversation transcription with answer suggestions.

## Features

- **Multi-Provider AI** — OpenAI, Gemini, Anthropic, Azure OpenAI, and OpenRouter with dynamic model selection
- **Dynamic Model Catalog** — Fetches available models from provider APIs and [models.dev](https://models.dev), with pricing and context window info
- **Screenshot Analysis** — Capture coding problems and extract structured information via vision APIs
- **Solution Generation** — AI generates optimal solutions grounded to the actual code from screenshots
- **Real-time Debugging** — Take screenshots of errors/test cases, get structured analysis with fixes
- **Speech Recognition** — Record and transcribe interview conversations (OpenAI Whisper, Gemini Audio)
- **Answer Suggestions** — AI-powered contextual answer suggestions during live interviews
- **Invisible Window** — Transparent, frameless window that bypasses most screen capture methods
- **Window Management** — Move, resize, change opacity, and zoom with keyboard shortcuts
- **Privacy-Focused** — API keys stored locally, data only sent to your configured provider

## Supported Providers

| Provider | Models | Speech | Notes |
|----------|--------|--------|-------|
| **OpenAI** | GPT-4o, GPT-5, o-series | Whisper | Direct API |
| **Gemini** | Gemini 3, 2.5, 1.5 | Audio Understanding | Direct API |
| **Anthropic** | Claude 4, 3.7, 3.5 | — | Direct API |
| **Azure OpenAI** | Any deployed model | Whisper | Uses `AzureOpenAI` SDK class |
| **OpenRouter** | 300+ models from all providers | — | OpenAI-compatible API |

## Tech Stack

Electron 29 + React 18 + TypeScript 5.4 + Vite 6 + Tailwind CSS 3 + React Query 5 + Radix UI

## Quick Start

```bash
# Clone
git clone https://github.com/Scode-Njnjas/interview-assistant.git
cd interview-assistant

# Install
npm install

# Development (hot-reload)
npm run dev

# Production build
npm run build
```

> The window is invisible by default. Press `Ctrl+B` / `Cmd+B` to toggle visibility.

### Prerequisites

- Node.js 20+
- npm
- API key for at least one provider
- Screen Recording permission (macOS)
- Microphone permission (for speech recognition)

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Visibility | `Ctrl/Cmd + B` |
| Take Screenshot | `Ctrl/Cmd + H` |
| Process Screenshots | `Ctrl/Cmd + Enter` |
| Delete Last Screenshot | `Ctrl/Cmd + L` |
| Start/Stop Recording | `Ctrl/Cmd + M` |
| Toggle Speaker Mode | `Ctrl/Cmd + Shift + M` |
| Reset View | `Ctrl/Cmd + R` |
| Move Window | `Ctrl/Cmd + Arrow Keys` |
| Decrease/Increase Opacity | `Ctrl/Cmd + [ / ]` |
| Zoom Out/In | `Ctrl/Cmd + - / =` |
| Reset Zoom | `Ctrl/Cmd + 0` |
| Quit | `Ctrl/Cmd + Q` |

## Architecture

### Two-Process Electron Model

| Process | Directory | Runtime | Purpose |
|---------|-----------|---------|---------|
| Main | `electron/` | Node.js | Screenshots, AI inference, config, transcription, global shortcuts |
| Renderer | `src/` | Browser | React UI with Vite, Tailwind, React Query, Radix primitives |
| Shared | `shared/` | Both | AI model configuration (single source of truth) |

### Main Process Modules

| File | Responsibility |
|------|---------------|
| `main.ts` | App lifecycle, window creation, state, dependency injection |
| `ProcessingHelper.ts` | AI inference for extraction, solution, debugging |
| `ProviderClientFactory.ts` | Unified client creation for all 5 providers |
| `ModelFetchService.ts` | Dynamic model fetching with models.dev catalog + caching |
| `ConfigHelper.ts` | Persistent config via electron-store, extends EventEmitter |
| `TranscriptionHelper.ts` | Audio transcription (Whisper, Gemini Audio) |
| `AnswerAssistant.ts` | AI answer suggestions from conversation context |
| `ScreenshotHelper.ts` | Screen capture and image preprocessing |
| `ipcHandlers.ts` | IPC event handler registration |
| `shortcuts.ts` | Global keyboard shortcuts |

### Dynamic Model Selection

Models are fetched at runtime using a 3-tier strategy:

1. **Provider API** — Real-time model list from your account (requires API key)
2. **models.dev catalog** — 3,000+ models with pricing from the open-source [models.dev](https://models.dev) database (no key needed)
3. **Static fallback** — Hardcoded defaults in `shared/aiModels.ts`

Models show pricing (USD/M tokens) and context window in the settings UI. Search/filter available when 10+ models are loaded.

## Configuration

Settings are managed in the app's Settings dialog. All data stored locally at:
- **macOS**: `~/Library/Application Support/interview-assistant/config.json`
- **Windows**: `%APPDATA%/interview-assistant/config.json`

### Config Fields

| Field | Description |
|-------|-------------|
| `apiProvider` | `openai`, `gemini`, `anthropic`, `azure-openai`, `openrouter` |
| `apiKey` | Your provider API key |
| `azureEndpoint` | Azure OpenAI endpoint URL (Azure only) |
| `azureApiVersion` | Azure API version (default: `2025-01-01-preview`) |
| `extractionModel` | Model for screenshot problem extraction |
| `solutionModel` | Model for solution generation |
| `debuggingModel` | Model for debugging analysis |
| `answerModel` | Model for conversation answer suggestions |
| `speechRecognitionModel` | Model for audio transcription |
| `language` | Preferred programming language |
| `candidateProfile` | Name, resume, job description for personalized suggestions |

## Build & Package

```bash
npm run dev            # Development with hot-reload
npm run build          # Production build
npm run lint           # ESLint
npm run package-mac    # macOS DMG
npm run package-win    # Windows NSIS
```

## How It Works

1. **Configure** — Open Settings, select provider, enter API key. Models load automatically.
2. **Capture** — Press `Ctrl/Cmd + H` to screenshot a coding problem.
3. **Process** — Press `Ctrl/Cmd + Enter`. AI extracts the problem, preserving code templates and function signatures from the screenshot.
4. **Solution** — AI generates a solution that follows the exact structure from the problem (same class names, function signatures, coding style).
5. **Debug** — Take more screenshots of errors/output, press `Ctrl/Cmd + Enter` again for structured debugging analysis.
6. **Conversation** — Press `Ctrl/Cmd + M` to record. AI transcribes and suggests answers based on conversation context.

## Invisibility

The window is invisible to:
- Zoom (versions below 6.1.6)
- All browser-based screen recording
- Discord
- macOS screenshot (`Cmd + Shift + 3/4`)

**Not** invisible to:
- Zoom 6.1.6+
- macOS native screen recording (`Cmd + Shift + 5`)

## License

[AGPL-3.0-or-later](LICENSE)

## Disclaimer

This tool is intended as a learning aid. Use it to understand problem-solving approaches, not as a substitute for developing your skills. Be honest about using assistance tools if asked in an interview.
