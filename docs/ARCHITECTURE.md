# Architecture

## Overview

AI Threat Modeler is organized into four subsystems that work together to let users model AI systems, analyze them for threats, and produce reports.

```
+---------------------+     +---------------------+
|   Modeling Engine    |     |  Knowledge Engine    |
|                     |     |                     |
|  Canvas             |     |  Knowledge Packs    |
|  Node Library       |     |  Framework Mappings |
|  Project Persistence|     |  Lookup / Indexing  |
+----------+----------+     +----------+----------+
           |                           |
           v                           v
+---------------------+     +---------------------+
|   Analysis Engine   |---->|   Reporting Layer    |
|                     |     |                     |
|  Rules              |     |  Findings View      |
|  Evaluator          |     |  Export (JSON/Report)|
|  Findings           |     |                     |
+---------------------+     +---------------------+
```

The **Modeling Engine** provides the visual canvas where users place components and draw data flows. The **Knowledge Engine** loads and indexes structured knowledge packs containing threats, controls, mitigations, and analysis rules. The **Analysis Engine** evaluates rules against the current project model to produce findings. The **Reporting Layer** displays findings, surfaces attack paths, manages per-finding risk-treatment dispositions (accept / false-positive / severity override), and exports the analyzed model with disposition history to PDF / DOCX / CSV.

## Headless Core

The analysis capability is **adapter-free**: the knowledge engine, analysis
engine, disposition resolution, and report builders contain no React, no DOM,
and no Electron. They live under `src/knowledge`, `src/analysis`, and
`src/reports`, and run unchanged in a browser, in Electron, or in a plain Node
process.

`src/core/index.ts` is the **single documented entry point** for that core,
re-exported through the `@core` path alias. Every consumer — the GUI renderer,
and (planned) the CLI and MCP server — is a thin adapter that imports from
`@core` rather than reaching into engine internals. This keeps the public
surface explicit and lets the adapters evolve without destabilizing the engine.

The core boundary covers knowledge packs, rule evaluation, attack-path
traversal, disposition resolution, and report building. It does **not** cover
the project lifecycle UI (canvas, Zustand stores) — those remain in the
renderer.

The core has two entry points so dependency-light consumers don't pay for the
report stack:

- `@core` — the analysis core: knowledge engine, analysis engine, evaluator,
  disposition resolution, `buildReportData` (pure), the modeling vocabulary,
  schemas, and domain types. No heavy runtime deps.
- `@core/reports` — the report **formatters** (`generatePdfReport`,
  `generateDocxReport`, `generateCsvReport`), which pull in browser-oriented
  libraries (jsPDF + html2canvas + DOMPurify, the docx package). The GUI imports
  these; the MCP server and the CLI's analyze path do not, so those adapters
  bundle ~100 KB instead of ~1 MB.

Path aliases: `@core` → the analysis-core barrel, `@core/reports` → the report
formatters, `@shared` → `src/shared`, `@` → `src/renderer/src`. They are defined
in `electron.vite.config.ts`, `vite.config.web.ts`, `tsconfig.web.json`, and
`tsconfig.node.json`.

### Adapters over the core

| Adapter | Location | Role |
|---|---|---|
| **GUI** | `src/renderer`, `src/main` | The Electron + web app (canvas, stores, panels) |
| **MCP server** | `packages/mcp` | Stateless MCP server exposing the engine to AI agents |
| **CLI** (planned, #7) | — | CI gate over a committed `.aitm`, SARIF output |

The **MCP server** (`packages/mcp`) is a thin, stateless adapter that lets AI
agents (VS Code agent mode, Codex, Cursor, Claude) extract a threat model from
arbitrary input and run the deterministic engine. It is published as a separate
npm package (`ai-threat-modeler-mcp`), bundled with tsup into a single stdio
executable that inlines `@core` and the knowledge packs.

- **Stateless**: the agent (an LLM) holds the model in its own context and
  passes it on every call. The server keeps no session — iteration
  (build → validate → fix → analyze → revise) happens in the agent, not in
  server state. No mutation tools, no server-side canvas.
- **Tools**: discovery (`list_component_types`, `list_boundary_types`,
  `list_rules`, `list_frameworks`), `validate_model` (canonical zod schema,
  actionable errors), and `analyze_threat_model`.
- **Boundary**: the MCP surface is the analysis engine only. Notes, disposition,
  and risk acceptance are GUI application-layer concerns and are deliberately
  absent.
- **Result contract**: `analyze_threat_model` returns a versioned public shape
  (`resultSchemaVersion`), mapped from the internal `AnalysisResult` and
  decoupled from it — internal types may change; the contract evolves additively
  only. Components/flows are surfaced by label, and each finding carries a stable
  `key` (`ruleId` + sorted node/flow ids) so an agent can correlate findings
  across re-analyses.

See [`packages/mcp/README.md`](../packages/mcp/README.md) for the tool reference
and host configuration.

## Technology Stack

| Technology | Purpose | Rationale |
|---|---|---|
| Electron | Desktop shell | Cross-platform desktop app with full local file access |
| React | UI framework | Component model, ecosystem, developer familiarity |
| TypeScript | Language | Type safety across the full codebase |
| React Flow (@xyflow/react) | Canvas | Best React integration for node-based diagrams |
| Zustand | State management | Simple API, minimal boilerplate, sufficient for this app |
| Zod | Schema validation | Runtime validation of project files and knowledge packs |
| Tailwind CSS | Styling | Utility-first, fast iteration, consistent design tokens |
| electron-vite | Build tooling | Vite-based build for Electron main, preload, and renderer |

## Directory Structure

```
ai-threat-modeler/
  src/
    main/               # Electron main process
      index.ts          #   App entry, window management
      ipc/              #   IPC handlers (file I/O, dialogs)
    preload/            # Preload scripts
      index.ts          #   Context bridge API exposed to renderer
    renderer/           # React application
      components/       #   UI components
        canvas/         #     Modeling canvas, custom nodes, edges
        panels/         #     Side panels (node library, properties, findings)
        layout/         #     App shell, toolbar, status bar
      hooks/            #   Custom React hooks
      stores/           #   Zustand stores (project, UI, analysis)
      pages/            #   Top-level page components
      utils/            #   Renderer-specific utilities
    shared/             # Shared across processes
      types/            #   TypeScript type definitions
      schemas/          #   Zod schemas for validation
      constants/        #   Shared constants and enums
    knowledge/          # Knowledge engine
      engine.ts         #   KnowledgeEngine class (load, index, query)
      packs/            #   Built-in knowledge packs
        base/           #     Base pack (AI threats, ATLAS, OWASP, NIST)
      types.ts          #   Knowledge model types
    analysis/           # Analysis engine
      engine.ts         #   AnalysisEngine class (evaluate rules)
      evaluator.ts      #   Condition evaluator logic
      disposition.ts    #   Finding identity + disposition resolution
      types.ts          #   Analysis types (Rule, Finding, Condition)
    reports/            # Report builders (adapter-free)
      report-data.ts    #   Structured ReportData from project + findings
      pdf-report.ts     #   PDF emitter
      docx-report.ts    #   DOCX emitter
      csv-report.ts     #   CSV emitter
    core/               # Headless core
      index.ts          #   Analysis-core public API (@core barrel)
      reports.ts        #   Report-formatter entry point (@core/reports)
  packages/             # Adapters published independently of the app
    mcp/                #   MCP server (@core consumer; npm: ai-threat-modeler-mcp)
      src/              #     server.ts, tools/, contract/, engine.ts
      tsup.config.ts    #     bundles to a single stdio executable
  docs/                 # Documentation
  resources/            # App icons and static assets
  electron-builder.yml  # Electron Builder config
  electron.vite.config.ts # Vite config for Electron
  tailwind.config.js    # Tailwind configuration
  tsconfig.json         # Base TypeScript config
  tsconfig.node.json    # TS config for main/preload
  tsconfig.web.json     # TS config for renderer
```

## Domain Model

### ThreatModelProject

The root aggregate representing a complete threat model. Contains all nodes, data flows, trust boundaries, and metadata. Serialized as a JSON file with the `.aitm` extension.

Key fields:
- `id` -- Unique project identifier
- `name` -- Human-readable project name
- `description` -- Project description
- `nodes` -- Array of ModelNode objects
- `dataFlows` -- Array of DataFlow objects
- `trustBoundaries` -- Array of TrustBoundary objects
- `metadata` -- Creation date, last modified, version

### ModelNode

A component placed on the canvas representing part of an AI system (for example, an LLM, a vector database, an API gateway, or a user).

Key fields:
- `id` -- Unique node identifier
- `type` -- Component type from the node library (e.g., `llm`, `vector-db`, `api-gateway`)
- `label` -- User-provided display name
- `position` -- Canvas coordinates (x, y)
- `properties` -- Type-specific properties (e.g., `isExternal`, `internetFacing`, `hasRBAC`, `hasInputValidation`, `hasSystemPromptProtection`, `hasGroundingChecks`, `dataClassification`)

Trust-boundary membership is expressed on the boundary (`nodeIds`), not on the node.

### DataFlow

A directed connection between two nodes representing data movement.

Key fields:
- `id` -- Unique flow identifier
- `source` -- Origin node id
- `target` -- Destination node id
- `label` -- Description of what flows
- `properties` -- Metadata (e.g., `protocol`, `encrypted`, `authenticated`, `dataClassification`, `dataTypes`, `crossesTrustBoundary`)

### TrustBoundary

A security zone that groups nodes sharing a common trust level. Visualized as a labeled region on the canvas.

Key fields:
- `id` -- Unique boundary identifier
- `type` -- Boundary type (e.g., `public-internet`, `cloud-tenant`, `model-provider`, `sensitive-data-zone`)
- `label` -- Boundary name
- `nodeIds` -- Array of node IDs contained within the boundary
- `properties` -- Optional boundary metadata

## Knowledge Model

### KnowledgePack

A container for a collection of related threats, controls, mitigations, and analysis rules. Each pack has metadata (id, name, version, description) and references one or more external frameworks.

### Threat

A potential attack or failure mode relevant to AI systems. For example, "Prompt injection via user input" or "Training data poisoning."

Key fields:
- `id` -- Identifier (convention: `THR-xxx`)
- `name` -- Short name
- `description` -- Detailed description
- `category` -- Grouping category
- `severity` -- Default severity (critical, high, medium, low)
- `frameworkRefs` -- Array of FrameworkReference objects linking to ATLAS, OWASP, etc.
- `mitigationIds` -- Array of Mitigation IDs that address this threat

### Control

A security measure or practice that reduces risk. For example, "Input validation and sanitization" or "Model access control."

Key fields:
- `id` -- Identifier (convention: `CTRL-xxx`)
- `name` -- Short name
- `description` -- Detailed description
- `category` -- Grouping category
- `frameworkRefs` -- Array of FrameworkReference objects

### Mitigation

A concrete action that implements one or more controls to address a threat. For example, "Implement prompt filtering with deny-list patterns."

Key fields:
- `id` -- Identifier (convention: `MIT-xxx`)
- `name` -- Short name
- `description` -- Detailed description
- `controlIds` -- Array of Control IDs this mitigation implements
- `frameworkRefs` -- Array of FrameworkReference objects

### FrameworkReference

A link to an external framework entry.

Fields:
- `framework` -- Canonical framework name string (e.g., `MITRE ATLAS`, `OWASP LLM Top 10`, `OWASP ML Top 10`, `NIST AI RMF`, `NIST CSF`)
- `id` -- The framework's own identifier (e.g., `AML.T0051`)
- `name` -- Human-readable name from the framework
- `url` -- Optional URL to the framework page

### AnalysisRule

A declarative rule that the analysis engine evaluates against the project model.

Key fields:
- `id` -- Identifier (convention: `RULE-xxx`)
- `name` -- Short name
- `description` -- What the rule detects
- `severity` -- Finding severity when triggered
- `category` -- Rule category
- `conditions` -- Array of condition objects for single-component rules (see Analysis Pipeline)
- `logicOperator` -- `and` or `or` for combining conditions (default `and`)
- `pathPattern` -- Multi-hop path matcher for chained-attack rules (see Multi-hop path rules). A rule uses **either** `conditions` **or** `pathPattern`, never both.
- `appliesTo` -- Optional filter for which node/flow types the rule targets
- `threatIds` -- Threat IDs to reference in the finding
- `mitigationIds` -- Mitigation IDs to recommend in the finding
- `recommendation` -- Human-readable recommendation text

### Normalization

The knowledge model is normalized so that entities reference each other by ID:

- A **Threat** lists `mitigationIds` pointing to Mitigations that address it
- A **Mitigation** lists `controlIds` pointing to Controls it implements
- An **AnalysisRule** lists `threatIds` and `mitigationIds` to attach to generated findings
- All entities can carry `frameworkRefs` linking to external framework entries

This structure avoids duplication and allows the UI to resolve references on demand.

## Analysis Pipeline

When the user clicks "Analyze," the following pipeline executes:

### 1. Rule Loading

The AnalysisEngine requests all rules from the KnowledgeEngine. Rules are collected from every loaded knowledge pack and deduplicated by rule ID.

### 2. Rule Evaluation

For each rule, the engine determines the target scope based on `appliesTo`:

- If `appliesTo` specifies node types, the rule is evaluated once per matching node
- If `appliesTo` specifies data flow criteria, the rule is evaluated once per matching flow
- If `appliesTo` is absent, the rule is evaluated against the project as a whole

### 3. Condition Evaluation

Each condition in the rule is evaluated against the current target (node, flow, or project). A condition specifies:

- `target` -- What to inspect: `node`, `flow`, `boundary`, or `model`
- `field` -- Dot-notation path to a property (e.g., `type`, `properties.isExternal`, `properties.encrypted`)
- `operator` -- One of `equals`, `not-equals`, `contains`, `not-contains`, `exists`, `not-exists`, `in`, `not-in`
- `value` -- Expected value (optional for `exists`/`not-exists`)

Conditions are combined using the rule's `logicOperator` (`and` requires all to match, `or` requires at least one; default `and`). For flow-targeted rules the destination node is also exposed as `node`, so a flow rule can constrain the target component.

### 4. Example: "Sensitive data sent to external model provider"

Consider a rule that detects when sensitive data flows to a hosted (external) model API:

```json
{
  "id": "RULE-001",
  "name": "Sensitive data sent to external model provider",
  "severity": "high",
  "category": "data-exposure",
  "conditions": [
    { "target": "flow", "field": "properties.dataClassification", "operator": "in", "value": ["confidential", "restricted"] },
    { "target": "node", "field": "type", "operator": "equals", "value": "hosted-model-api" }
  ],
  "logicOperator": "and",
  "appliesTo": { "nodeTypes": ["hosted-model-api"] },
  "threatIds": ["THR-005"],
  "mitigationIds": ["MIT-006", "MIT-009"],
  "recommendation": "Classify data before sending to external providers; mask or use private endpoints."
}
```

For each data flow whose destination is a `hosted-model-api` node, the engine:

1. Checks the flow's `dataClassification` is `confidential` or `restricted`
2. Checks the destination node's `type` is `hosted-model-api`

If both conditions match, the rule fires. (This is the actual `RULE-001` from
the base pack.)

### 4b. Multi-hop path rules

A rule with a `pathPattern` instead of `conditions` matches a **path through
the component graph** (nodes connected by directed flows), expressing chained
attacks that no single-component rule can capture. The pattern has:

- `from` -- node conditions for the untrusted source
- `to` -- node conditions for the target/sink
- `without` -- node conditions for a control whose presence on the path breaks the chain
- `edge` -- optional flow conditions every traversed flow must satisfy
- `maxHops` -- optional bound (default 12)

Evaluation is **existential over simple paths**: the rule fires when at least
one control-free path from a `from` node to a `to` node exists. One finding is
emitted per reachable target, evidenced by the shortest such path. The same
traversal (`findControlFreePaths`) backs both rule evaluation and the
interactive Attack-path probe. See [ATTACK-PATHS.md](ATTACK-PATHS.md) for the
full semantics.

### 5. Finding Generation

When a rule fires, a Finding is created containing:

- The rule ID and name
- Severity from the rule
- A rationale string explaining why the rule matched
- A structured **derivation**: for single-component rules, the per-condition
  trace (`ConditionTrace`: field, operator, expected vs. actual, pass/fail)
  that powers the "Why this fired" panel; for path rules, the ordered attack
  path (`PathDerivation`: node/flow chain, the missing control, vulnerable
  target count)
- References to the matched node(s) and/or flow(s)
- Threat IDs and mitigation IDs from the rule, resolved via the KnowledgeEngine
- Framework references from the associated threats
- The rule's recommendation text

### 6. Framework Reference Resolution

The KnowledgeEngine resolves threat and mitigation IDs from the finding to their full objects, including framework references. This allows the UI to display links to MITRE ATLAS techniques, OWASP guidance, and NIST controls.

## Data Flow

```
User interaction on canvas
        |
        v
  Zustand Store (project state)
        |
        +---> Save ---> .aitm JSON file
        |
        +---> Analyze
                |
                v
        AnalysisEngine
                |
                +--- reads rules from ---> KnowledgeEngine
                |                              |
                |                    loads from knowledge packs
                |
                v
          Findings[]
                |
                +---> Findings panel (UI)
                +---> Export ---> JSON / report file
```

1. The user places nodes and draws data flows on the canvas. All changes update the Zustand store immediately.
2. Save/Load serializes the store to a `.aitm` JSON file via IPC to the main process.
3. Knowledge packs are loaded at startup by the KnowledgeEngine, which indexes threats, controls, mitigations, and rules for fast lookup.
4. When the user triggers analysis, the AnalysisEngine pulls rules from the KnowledgeEngine, evaluates them against the project model in the store, and produces an array of findings.
5. Findings are displayed in the UI and can be exported to JSON or a formatted report.

## Extension Points

### Adding New Component Types

Component types are defined in the shared constants. To add a new type:

1. Add the type definition to the component type registry in `src/shared/constants/`
2. Define its default properties and metadata
3. Optionally add a custom node renderer in `src/renderer/components/canvas/`

### Creating Knowledge Packs

Knowledge packs are self-contained JSON directories. See [KNOWLEDGE-PACKS.md](KNOWLEDGE-PACKS.md) for the full guide.

### Writing Analysis Rules

Rules are declarative JSON objects within a knowledge pack's `rules.json`. See [KNOWLEDGE-PACKS.md](KNOWLEDGE-PACKS.md) for the condition system and examples.

### Adding Framework Mappings

To map findings to a new framework:

1. Define a new framework identifier constant
2. Add `FrameworkReference` objects to relevant threats, controls, and mitigations
3. Optionally add URL templates for generating links to the framework's documentation

## Design Tradeoffs

### JSON Files vs SQLite

**Chose JSON.** Threat model files are small (typically under 1 MB), so the performance advantages of SQLite are not needed. JSON files are simpler to implement, human-readable, and git-friendly for version control. If project sizes grow significantly, SQLite could be introduced later.

### Declarative Rules vs Code-Based Rules

**Chose declarative.** Rules defined as JSON conditions are easier for contributors to write, review, and audit. They can be serialized, shared, and validated without executing arbitrary code. The tradeoff is reduced expressiveness -- some complex conditions may be awkward to express -- but this is sufficient for the MVP and avoids the security implications of evaluating user-supplied code.

### Single Package vs Monorepo

**Chose a light monorepo.** The Electron app remains a single package at the
repo root; the engines stay adapter-free behind the `@core` barrel (see
[Headless Core](#headless-core)). Independently distributable adapters live
under `packages/` — currently `packages/mcp` (the MCP server, published to npm).
Each such package is thin: it imports `@core` and is bundled standalone, so it
ships without the Electron/React/report dependencies. This gives the reuse
benefit of separate packages only where a separate distribution actually exists,
without imposing full monorepo tooling on the app itself.

### React Flow vs D3 / Cytoscape

**Chose React Flow (@xyflow/react).** React Flow integrates naturally with React's component model, supports custom nodes and edges, and provides built-in interactions (drag, select, connect). D3 and Cytoscape offer more rendering flexibility but require more glue code for React integration. React Flow is sufficient for structured diagrams with typed nodes and edges.

### Zustand vs Redux

**Chose Zustand.** Zustand has a simpler API with less boilerplate than Redux. The app's state is moderately complex (project model, UI state, analysis results) but does not require Redux's middleware ecosystem or devtools. Zustand's `immer` middleware can be added if immutable update patterns become cumbersome.

## MVP Milestones

These are scope milestones defining what ships in each phase. They are not calendar estimates.

### M1: Canvas + Node Library + Save/Load

- Modeling canvas with drag-and-drop node placement
- Node library panel with categorized component types
- Data flow connections between nodes
- Trust boundary creation and node grouping
- Save and load `.aitm` project files
- Properties panel for editing node and flow metadata

### M2: Knowledge Engine + Base Pack

- Knowledge pack loader and indexer
- Base knowledge pack covering MITRE ATLAS, OWASP LLM Top 10, NIST AI RMF, NIST CSF
- Threat, control, and mitigation browsing in the UI
- Framework reference resolution and linking

### M3: Analysis Engine + Findings View

- Rule evaluator with condition system
- Analysis execution triggered from UI
- Findings panel with severity, rationale, and framework references
- Finding-to-node highlighting on canvas
- Rule transparency (show which rule fired and why)

### M4: Export / Reporting + Polish

- Export findings to JSON
- Report generation (summary + detailed findings)
- UI polish, keyboard shortcuts, accessibility
- Documentation and contributor onboarding
