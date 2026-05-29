# AI Threat Modeler — MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the
[AI Threat Modeler](https://github.com/nshalabi/ai-threat-modeler) **deterministic analysis engine**
to AI agents (VS Code agent mode, Codex, Cursor, Claude — any MCP host).

The agent does the fuzzy part — reading a requirements doc, a design, or a codebase and
**extracting** a threat model. The engine does the deterministic part — evaluating that model
against a fixed rule set and returning findings. **No LLM judges the security posture**; the same
rules the desktop app uses produce the result, fully reproducible for a given model + knowledge-pack
version.

## How it works

The server is **stateless**. The agent holds the threat model in its own context and passes it on
every call; the server keeps no session. A typical agent loop:

1. **Discover** the vocabulary — `list_component_types`, `list_boundary_types`, `list_rules`,
   `list_frameworks` — so the agent knows which component types, properties, and rules the engine
   understands.
2. **Extract** a model from the source material (the agent's job) and **`validate_model`** it,
   fixing the returned errors until it is well-formed.
3. **`analyze_threat_model`** — get the deterministic findings (severities, affected components,
   framework references, and multi-hop attack-path chains).

Iteration (build → validate → fix → analyze → revise) happens in the agent's context — iteration is
not server state.

## Tools

| Tool | Input | Returns |
| --- | --- | --- |
| `list_component_types` | — | Every node type with description, category, and default security properties |
| `list_boundary_types` | — | Trust-boundary types (zones) |
| `list_rules` | — | The analysis rules, each tagged `single-component` or `attack-path` |
| `list_frameworks` | — | Frameworks the findings map to (MITRE ATLAS, OWASP LLM/ML, NIST) |
| `validate_model` | `model` | `{ valid, errors[], summary? }` — path-qualified errors for self-correction |
| `analyze_threat_model` | `model` | The versioned result contract (see below) |

All tools are read-only and non-destructive. There are **no** mutation tools, no server-side canvas,
and no governance surface — notes, risk acceptance, and disposition tracking live in the desktop app,
not here.

## Result contract

`analyze_threat_model` returns a deliberately authored, **versioned** shape
(`resultSchemaVersion: "1.0"`) that is decoupled from the engine's internal types and evolves
additively only. Code against this; never against engine internals.

```jsonc
{
  "resultSchemaVersion": "1.0",
  "engine": { "name": "AI Threat Modeler", "version": "...", "knowledgePackVersion": "..." },
  "analyzedAt": "2026-05-29T...Z",
  "project": { "name": "...", "componentCount": 16, "flowCount": 18, "boundaryCount": 4 },
  "summary": { "total": 17, "bySeverity": { "critical": 2, "high": 6, "medium": 7, "low": 2, "informational": 0 } },
  "findings": [
    {
      "key": "RULE-014|n3,n7|f4",          // stable identity across re-analyses
      "ruleId": "RULE-014",
      "title": "...",
      "severity": "high",
      "category": "...",
      "description": "...",
      "rationale": "...",
      "affectedComponents": ["Knowledge Base", "LLM"],   // labels, not internal ids
      "affectedFlows": ["retrieved context"],
      "frameworkReferences": [{ "framework": "OWASP LLM Top 10", "id": "LLM01", "name": "Prompt Injection" }],
      "mitigations": ["..."],
      "recommendation": "...",
      "attackPath": {                         // present only for multi-hop findings
        "chain": ["External Content", "Ingestion", "Vector DB", "LLM"],
        "missingControl": "guardrail",
        "vulnerableTargetCount": 1
      }
    }
  ]
}
```

An empty `findings` array means no rule fired against the **modeled** design — it is not a guarantee
the real system is secure.

## Usage

Run directly with `npx` (no install):

```bash
npx ai-threat-modeler-mcp
```

### Claude Desktop / Claude Code

Add to your MCP config (e.g. `claude_desktop_config.json`):

```jsonc
{
  "mcpServers": {
    "ai-threat-modeler": {
      "command": "npx",
      "args": ["-y", "ai-threat-modeler-mcp"]
    }
  }
}
```

### VS Code / Cursor

Add to the workspace `.vscode/mcp.json` (VS Code) or the equivalent MCP settings:

```jsonc
{
  "servers": {
    "ai-threat-modeler": { "command": "npx", "args": ["-y", "ai-threat-modeler-mcp"] }
  }
}
```

The server speaks **stdio** — it works in any MCP host that launches a local command.

## Build from source

This package lives in the AI Threat Modeler monorepo and is a thin adapter over the headless
analysis core (`src/core`, imported via `@core`).

```bash
cd packages/mcp
npm install
npm run build          # bundles to dist/index.js (single runnable ESM file)
npm run typecheck
node scripts/smoke.mjs # end-to-end test against the bundled samples
npm run inspect        # open the MCP Inspector against the built server
```

## License

MIT © Nader Shalabi. Part of [AI Threat Modeler](https://github.com/nshalabi/ai-threat-modeler).
