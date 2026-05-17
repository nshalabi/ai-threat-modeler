# Contributing

Contributions to AI Threat Modeler are welcome. This document covers how to get started.

## How to Contribute

1. Fork the repository
2. Create a feature branch from `main` (`git checkout -b my-feature`)
3. Make your changes
4. Commit with a clear message describing the change
5. Push to your fork and open a pull request

## Development Setup

```bash
git clone <your-fork>
cd ai-threat-modeler
npm install
npm run dev
```

This starts the app in development mode with hot reload via electron-vite.

Other useful commands:

- `npm run dev:web` -- Run the web build in dev mode
- `npm run build` -- Build the desktop app for production
- `npm run build:web` -- Build the static web app
- `npm run typecheck` -- Type-check all TypeScript code

## Project Structure

The codebase is organized into Electron main process, preload, renderer (React UI), shared types, a knowledge engine, and an analysis engine. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full breakdown.

## Easiest Ways to Contribute

### Add Analysis Rules

Analysis rules are declarative JSON — no application code required. Both single-component rules (`conditions`) and multi-hop chained-attack rules (`pathPattern`) are supported. See [KNOWLEDGE-PACKS.md](KNOWLEDGE-PACKS.md) for the rule format and condition system, and [ATTACK-PATHS.md](ATTACK-PATHS.md) for how attack-path detection is evaluated.

### Extend Knowledge Packs

Add new threats, controls, and mitigations to existing packs. Each is a JSON object with an ID, name, description, and framework references.

### Create New Knowledge Packs

Build a pack for a framework or domain not yet covered. A knowledge pack is a directory of JSON files -- no code required.

### Improve Component Type Definitions

Add new AI-specific component types or refine the properties and metadata of existing types.

### Report Bugs and Suggest Features

Open an issue describing the problem or idea. Include steps to reproduce for bugs.

## Code Style

- TypeScript in strict mode
- No semicolons (project convention)
- Follow existing patterns in the codebase
- Use `@shared/` alias for imports from `src/shared/`
- Use `@/` alias for imports within the renderer

## Knowledge Pack Contributions

If you are contributing threats, rules, or framework mappings, see [KNOWLEDGE-PACKS.md](KNOWLEDGE-PACKS.md) for the full guide on pack structure, schemas, and ID conventions. Framework reference IDs (MITRE ATLAS, OWASP, NIST) should be source-verified against the framework's authoritative data, not asserted from memory.

## Pull Request Guidelines

- Keep PRs small and focused on a single change
- Describe what the change does and why
- For new analysis rules, include the rule ID and a brief description of what it detects
- For new threats or mitigations, include framework references where applicable
- Make sure `npm run typecheck` passes before submitting
