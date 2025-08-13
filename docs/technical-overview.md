# SK Code CLI – Technical Documentation

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
  - [CLI Entry Point](#cli-entry-point)
  - [Agent](#agent)
  - [Commands](#commands)
  - [Tools](#tools)
  - [UI (Text-based Interface)](#ui-text-based-interface)
  - [Utilities](#utilities)
- [Configuration & Authentication](#configuration--authentication)
- [Extending the CLI](#extending-the-cli)
  - [Adding Tools](#adding-tools)
  - [Adding Slash Commands](#adding-slash-commands)
  - [Customizing the UI](#customizing-the-ui)
- [Development & Build](#development--build)
- [File/Folder Reference](#filefolder-reference)
- [Best Practices](#best-practices)

---

## Overview
SK Code CLI is a lightweight, highly customizable, open-source coding CLI designed for rapid iteration and developer extensibility. It leverages LLMs via the SK platform to provide code generation, editing, and automation features in a familiar terminal interface.

## Architecture
The CLI is architected around a modular, extensible core:
- **CLI Entrypoint**: Handles command-line parsing, session management, and startup.
- **Agent**: The core logic for interacting with the LLM, managing context, and orchestrating tool/command execution.
- **Commands**: Slash commands (e.g., `/help`, `/login`) for user interaction and control.
- **Tools**: AI-callable functions for file operations, code execution, and more.
- **UI**: Text-based interface (TUI) built with React components for chat, input, and overlays.
- **Utilities**: Helpers for file I/O, settings, markdown, and validation.

## Project Structure
```
sk-code-cli/
├── src/
│   ├── commands/           # Slash command definitions and registration
│   │   ├── definitions/    # Individual command implementations
│   │   ├── base.ts         # Command interface
│   │   └── index.ts        # Command registry
│   ├── core/               # Core agent and CLI entrypoint
│   │   ├── agent.ts        # Agent logic (LLM, tool orchestration)
│   │   └── cli.ts          # CLI startup and session
│   ├── tools/              # Tool schemas, implementations, and validators
│   ├── ui/                 # TUI React components and hooks
│   └── utils/              # Constants, file ops, settings, markdown
├── docs/                   # Documentation and images
├── package.json            # Project metadata and scripts
├── tsconfig.json           # TypeScript configuration
└── LICENSE                 # License
```

## Core Components
### CLI Entry Point (`src/core/cli.ts`)
- Parses CLI arguments and options
- Initializes the agent and UI
- Handles session lifecycle and authentication

### Agent (`src/core/agent.ts`)
- Manages LLM interaction, context, and system messages
- Orchestrates tool and command execution
- Implements safety and best-practice rules for file/command operations
- Handles API key management and error handling

### Commands (`src/commands/`)
- **Definitions**: Each command (e.g., `help`, `login`, `model`, `clear`, `reasoning`) is implemented in its own file under `definitions/`
- **Base**: Common interface and context for commands
- **Index**: Registers and exports all available commands

### Tools (`src/tools/`)
- **tool-schemas.ts**: Defines schemas for all AI-callable tools (file ops, search, command execution, etc.)
- **tools.ts**: Implements tool logic and registry
- **validators.ts**: Input validation helpers

### UI (Text-based Interface) (`src/ui/`)
- **App.tsx**: Main TUI application component
- **components/**: Modular React components for chat, message history, input, overlays, and display
- **hooks/**: Custom hooks for agent and token metrics

### Utilities (`src/utils/`)
- **constants.ts**: Application constants
- **file-ops.ts**: File system operations
- **local-settings.ts**: Local config and API key management
- **markdown.ts**: Markdown parsing and rendering

## Configuration & Authentication
- API key is stored in a `.sk/` folder in the user's home directory or set via the `SK_API_KEY` environment variable.
- Local settings (model, preferences) are managed in `local-settings.ts`.
- Authentication is handled via the `/login` command or environment variable.

## Extending the CLI
### Adding Tools
1. Define the tool schema in `src/tools/tool-schemas.ts`.
2. Implement the tool in `src/tools/tools.ts`.
3. Register the tool in the tool registry and switch statement.

### Adding Slash Commands
1. Create a new command file in `src/commands/definitions/`.
2. Register it in `src/commands/index.ts`.

### Customizing the UI
- Modify or add React components in `src/ui/components/`.
- Use hooks in `src/ui/hooks/` for agent and metrics integration.

## Development & Build
- Install dependencies: `npm install`
- Build: `npm run build`
- Develop with hot reload: `npm run dev`
- Link globally for CLI use: `npm link`
- Run instantly: `npx sk-code-cli@latest`

## File/Folder Reference
- `src/commands/definitions/`: Individual slash command implementations
- `src/core/agent.ts`: Agent logic, LLM orchestration
- `src/core/cli.ts`: CLI entrypoint
- `src/tools/`: Tool schemas, implementations, and validation
- `src/ui/`: TUI React components and hooks
- `src/utils/`: Constants, file ops, settings, markdown
- `docs/`: Documentation and images

## Best Practices
- Always check file existence before editing or creating
- Use tools for all file and command operations (never text-only responses for code changes)
- Keep new features modular and incremental
- Avoid long-running commands in tool execution
- Use environment variables or `/login` for authentication
- Follow TypeScript and React best practices for code quality

---

For further details, see inline code comments and the README.
