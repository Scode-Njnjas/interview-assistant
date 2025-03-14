# AGENTS.md
This file provides guidance to AI coding assistants working in this repository.

**Note:** CLAUDE.md, .clinerules, .cursorrules, .windsurfrules, .replit.md, GEMINI.md, .github/copilot-instructions.md, and .idx/airules.md are symlinks to AGENTS.md in this project.

# Interview Assistant

AI-powered Electron desktop app for technical coding interview assistance. Captures screenshots, extracts problems via vision APIs, generates solutions, and supports live conversation transcription with answer suggestions. The window is transparent and frameless for stealth usage.

**Stack:** Electron 29 + React 18 + TypeScript 5.4 + Vite 6 + Tailwind CSS 3 + React Query 5 + Radix UI

**License:** AGPL-3.0-or-later

## Architecture

### Two-Process Electron Model

| Process | Directory | Runtime | Purpose |
|---------|-----------|---------|---------|
| Main | `electron/` | Node.js | Screenshots, AI inference, config, transcription, global shortcuts |
| Renderer | `src/` | Browser | React UI with Vite, Tailwind, React Query, Radix primitives |
| Shared | `shared/` | Both | AI model configuration (single source of truth) |

**IPC Bridge:** `electron/preload.ts` exposes `electronAPI` to renderer via context isolation. All main/renderer communication goes through typed IPC channels defined in `src/types/electron.d.ts`.

### Main Process Helpers (`electron/`)

| File | Responsibility |
|------|---------------|
| `main.ts` | App lifecycle, window creation, state object, dependency injection |
| `ProcessingHelper.ts` | AI inference for problem extraction, solution generation, debugging |
| `ScreenshotHelper.ts` | Screen capture and image preprocessing |
| `ConfigHelper.ts` | Persistent config via electron-store, extends EventEmitter |
| `TranscriptionHelper.ts` | Audio transcription (OpenAI Whisper, Gemini) |
| `AnswerAssistant.ts` | AI-generated answer suggestions from conversation context |
| `ConversationManager.ts` | Conversation history tracking with speaker turns |
| `shortcuts.ts` | Global keyboard shortcuts registration |
| `ipcHandlers.ts` | IPC event handler registration |
| `autoUpdater.ts` | electron-updater for GitHub releases |

### Frontend Structure (`src/`)

- `_pages/` — Full-page views: Queue.tsx (screenshots), Solutions.tsx (results), Debug.tsx (debugging)
- `components/` — Feature-grouped: Queue/, Solutions/, Conversation/, Settings/, Header/
- `components/ui/` — Radix-based UI primitives (button, dialog, toast, etc.)
- `contexts/toast.tsx` — Toast notification context
- `types/` — TypeScript definitions (electron.d.ts, solutions.ts, screenshots.ts)
- `utils/` — audioRecorder.ts (Web Audio API), platform.ts (OS detection)

### Multi-Provider AI System

Three providers: OpenAI, Gemini, Anthropic. Five model categories: extraction, solution, debugging, answer suggestions, speech recognition. `shared/aiModels.ts` is the **single source of truth** — edit only this file to add/change AI models.

### Key Patterns

- **Event-driven config**: ConfigHelper extends EventEmitter. Setting changes trigger helper re-initialization via event listeners.
- **Dependency injection**: Main process uses interfaces (IProcessingHelperDeps, IShortcutsHelperDeps, IIpcHandlerDeps) for testable construction.
- **React Query for IPC**: Caches problem/solution data from Electron IPC, not REST APIs.
- **Lazy loading**: Heavy React components use `React.lazy` + `Suspense`.
- **Path alias**: `@` maps to `./src` in Vite config.
- **Code splitting**: Vite splits vendor chunks: react-vendors, query-vendors, ui-vendors, icons.

## Build & Commands

```bash
# Development (hot-reload, Vite dev server on port 54321 + Electron)
npm run dev

# Production build (Vite frontend + TypeScript Electron backend)
npm run build

# Run production build locally
npm run run-prod

# Lint (ESLint across JS/TS/JSON/Markdown/CSS)
npm run lint

# Package distributables
npm run package           # all platforms
npm run package-mac       # macOS DMG
npm run package-win       # Windows NSIS

# Clean build artifacts
npm run clean
```

**No test framework is configured** — `npm run test` is a no-op placeholder.

### Script Command Consistency
When modifying npm scripts in package.json, ensure all references are updated:
- GitHub Actions workflows (`.github/workflows/ci.yml`)
- README.md documentation
- CONTRIBUTING.md
- Any setup/installation scripts

### CI Pipeline (`.github/workflows/ci.yml`)
Runs on push/PR to main across ubuntu-latest, macos-latest, windows-latest:
1. Checkout → Setup Node.js 20 → Install → Clean → Lint → Type check → Build → Test

## Code Style

### TypeScript
- **Strict mode** enabled (`tsconfig.json`)
- **Target:** ES2020, **Module:** ES2020, **JSX:** react-jsx
- Use interfaces for dependency injection: `IProcessingHelperDeps`, `IShortcutsHelperDeps`
- Export types from `shared/aiModels.ts` for AI model definitions
- Use `@/` path alias for `src/` imports in renderer code

### Naming Conventions
- **Classes:** PascalCase (`ProcessingHelper`, `ScreenshotHelper`)
- **Interfaces:** `I` + PascalCase (`IProcessingHelperDeps`)
- **Methods/functions:** camelCase (`getConfig`, `updateConfig`)
- **Constants:** UPPER_SNAKE_CASE (`PROCESSING_EVENTS`)
- **Files:** PascalCase for classes (`ProcessingHelper.ts`), camelCase for utilities (`audioRecorder.ts`)
- **React components:** PascalCase files and exports
- **Branches:** `feature/description` or `bugfix/description`
- **Commits:** Conventional commits (`feat:`, `bugfix:`, `fix:`, `refactor:`, `docs:`)

### Formatting & Imports
- ESLint flat config (`eslint.config.mjs`) with `@typescript-eslint` parser
- Plugins: JSON, Markdown, CSS
- Tailwind CSS utility classes for styling
- Group imports: external libraries → shared → internal → relative

### React Patterns
- Functional components with hooks
- `useQuery()` for IPC data fetching
- `useCallback()` for memoized callbacks
- `useState()` / `useEffect()` for local state and side effects
- Toast context (`contexts/toast.tsx`) for notifications
- Lazy loading with `React.lazy()` + `Suspense` for heavy components

### Error Handling
- Provider-agnostic formatting: `formatProviderError(provider, error, context)`
- Try-catch blocks with meaningful fallbacks
- Error messages include provider name and context
- IPC handlers return `{success, data|error}` objects

## Testing

No test framework is currently configured. `npm test` is a no-op placeholder.

Validation is done via:
- `npm run build` — Catches compilation errors
- `npm run lint` — Catches code quality issues
- TypeScript strict mode — Catches type errors at compile time
- CI pipeline — Runs lint + type check + build on all platforms

### Testing Philosophy
**When tests are added, fix the code, not the test.**
- Tests should validate actual functionality
- Failing tests reveal bugs — fix the root cause
- Test edge cases to improve reliability

## Security

- **API keys stored locally only** via electron-store (`${app.getPath('userData')}/config.json`)
- **No external data transmission** except to configured AI provider APIs (OpenAI, Gemini, Anthropic)
- **Context isolation** enabled — renderer cannot access Node.js APIs directly
- **IPC bridge** exposes only explicitly defined methods via `contextBridge.exposeInMainWorld`
- Never commit `.env` files or API keys
- Validate all IPC inputs on the main process side

## Configuration

### Environment
- **Node.js 20+** required
- **npm** package manager (bun also supported)
- Screen recording permissions required (macOS)

### App Config (Runtime)
Managed by `ConfigHelper.ts` via electron-store:
```typescript
{
  apiKey: string;
  apiProvider: "openai" | "gemini" | "anthropic";
  extractionModel: string;
  solutionModel: string;
  debuggingModel: string;
  answerModel: string;
  speechRecognitionModel: string;
  language: string;
  opacity: number;
  candidateProfile?: { name, resume, jobDescription };
}
```

### AI Model Changes
Edit **only** `shared/aiModels.ts`. The `sanitizeModelSelection()` function validates choices and falls back to provider defaults. Provider switching triggers re-initialization of all helper clients via ConfigHelper events.

### Global Keyboard Shortcuts
- `Ctrl/Cmd + B` — Toggle window visibility
- `Ctrl/Cmd + H` — Take screenshot
- `Ctrl/Cmd + Enter` — Process/generate solution

## Directory Structure & File Organization

```
interview-assistant/
├── electron/            # Main process (Node.js backend)
├── src/                 # Renderer process (React frontend)
│   ├── _pages/          # Full-page views
│   ├── components/      # Feature-grouped components
│   │   └── ui/          # Radix-based primitives
│   ├── contexts/        # React contexts
│   ├── types/           # TypeScript definitions
│   └── utils/           # Helper utilities
├── shared/              # Shared modules (aiModels.ts)
├── reports/             # All project reports and documentation
├── .claude/agents/      # Specialized AI subagents
├── .github/workflows/   # CI/CD pipelines
├── dist/                # Built frontend (gitignored)
├── dist-electron/       # Built backend (gitignored)
└── release/             # Packaged distributables (gitignored)
```

### Reports Directory
ALL project reports and documentation should be saved to the `reports/` directory:
- Implementation reports: `IMPLEMENTATION_SUMMARY_[FEATURE].md`
- Test results: `TEST_RESULTS_[DATE].md`
- Code quality: `CODE_QUALITY_REPORT.md`
- Naming: `[TYPE]_[SCOPE]_[DATE].md`, dates in `YYYY-MM-DD` format

### Temporary Files & Debugging
Use `/temp` for debug scripts, test artifacts, generated files, and logs. Never commit `/temp`.

## Critical Knowledge

1. **`shared/aiModels.ts` is the single source of truth** for all AI provider/model configuration
2. **ConfigHelper is event-driven** — setting changes trigger ProcessingHelper re-initialization
3. **Update `src/types/electron.d.ts`** when adding new IPC methods
4. **Two-process model** — Main thread is Node.js; Renderer is browser/React
5. **No test framework** — validation via build + lint + type check
6. **React Query caches IPC data**, not REST API responses
7. **Dependency injection** throughout main process — use `I*Deps` interfaces

## PR Workflow

- PRs require **2 approving reviews** (independent approval of latest push)
- Stale approvals dismissed on new commits
- Resolve all code conversations before merging
- Commit messages: conventional commits (`feat:`, `bugfix:`, `fix:`, `refactor:`, `docs:`)
- Branch naming: `feature/description` or `bugfix/description`

## Agent Delegation & Tool Execution

### Always Delegate to Specialists & Execute in Parallel

When specialized agents are available, use them instead of attempting tasks yourself. When performing multiple operations, send all tool calls in a single message for concurrent execution.

#### Key Principles
- **Agent Delegation**: Check if a specialized agent exists for the task domain
- **Complex Problems**: Delegate to domain experts
- **Parallel Execution**: Send multiple Task tool calls in a single message
- **DEFAULT TO PARALLEL**: Unless output of A is required for input of B, execute simultaneously

#### Parallel Tool Call Rules
**Must use parallel calls for:**
- Searching for different patterns (imports, usage, definitions)
- Multiple grep/glob searches with different patterns
- Reading multiple files or searching different directories
- Any information gathering where you know upfront what you need

**Sequential only when:**
You genuinely require the output of one tool to determine the next tool's usage.
