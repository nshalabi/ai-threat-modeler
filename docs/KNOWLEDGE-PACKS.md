# Knowledge Packs

> This guide reflects the **concrete, shipped** schema and engine behavior.
> An earlier version of this document described a forward-looking design
> (e.g. a `$ref` condition value, `sourceNode`/`targetNode` targets,
> `greaterThan`/`lessThan` operators) that the implementation ultimately did
> not adopt. It has been rewritten so every example here works as written
> against the current engine.

## What Is a Knowledge Pack

A knowledge pack is a structured JSON collection of threats, controls,
mitigations, and analysis rules. The tool loads these at startup and uses them
to identify issues in AI system models during analysis. Packs can reference
external security frameworks (MITRE ATLAS, OWASP, NIST).

## Pack Structure

```
my-pack/
  pack.json          # Pack metadata
  threats.json       # Array of Threat objects
  controls.json      # Array of Control objects
  mitigations.json   # Array of Mitigation objects
  rules.json         # Array of AnalysisRule objects
```

`weaknesses` are also part of the pack schema but are optional; the built-in
base pack ships an empty set.

### pack.json

```json
{
  "id": "my-pack",
  "name": "My Knowledge Pack",
  "version": "1.0.0",
  "description": "Threats and rules for a specific domain",
  "author": "Your Name"
}
```

## Schema Reference

### Threat

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (convention: `THR-xxx`) |
| `name` | string | Short descriptive name |
| `description` | string | Detailed explanation of the threat |
| `category` | string | Grouping category (e.g. `prompt-security`, `data-integrity`) |
| `severity` | string | `critical`, `high`, `medium`, `low`, or `informational` |
| `frameworkRefs` | FrameworkReference[] | Links to external framework entries |
| `mitigationIds` | string[] | IDs of mitigations that address this threat |

### Control

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (convention: `CTRL-xxx`) |
| `name` | string | Short descriptive name |
| `description` | string | What the control does and how it reduces risk |
| `category` | string | Grouping category (e.g. `preventive`, `detective`) |
| `frameworkRefs` | FrameworkReference[] | Links to external framework entries |

### Mitigation

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (convention: `MIT-xxx`) |
| `name` | string | Short descriptive name |
| `description` | string | Concrete steps to implement the mitigation |
| `controlIds` | string[] | IDs of controls this mitigation implements |
| `frameworkRefs` | FrameworkReference[] | Links to external framework entries |

### FrameworkReference

| Field | Type | Description |
|---|---|---|
| `framework` | string | Framework name — use a canonical string (see Supported Frameworks) |
| `id` | string | The framework's own identifier (e.g. `AML.T0051`) |
| `name` | string | Human-readable name from the framework |
| `url` | string? | Optional URL to the framework page |

### AnalysisRule

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (convention: `RULE-xxx`) |
| `name` | string | Short descriptive name |
| `description` | string | What the rule detects |
| `severity` | string | `critical`, `high`, `medium`, `low`, or `informational` |
| `category` | string | Rule category for grouping |
| `conditions` | RuleCondition[]? | Single-component rule logic |
| `logicOperator` | string? | `and` (all conditions) or `or` (any). Default `and` |
| `pathPattern` | PathPattern? | Multi-hop / chained-attack matcher |
| `appliesTo` | object? | Optional `{ nodeTypes?, boundaryTypes?, dataTypes?, dataClassifications? }` filter |
| `threatIds` | string[] | Threat IDs referenced in generated findings |
| `mitigationIds` | string[] | Mitigation IDs recommended in generated findings |
| `recommendation` | string | Recommendation text included in the finding |

A rule uses **either** `conditions` **or** `pathPattern` — never both.

## Writing Single-Component Rules

### RuleCondition

| Field | Type | Description |
|---|---|---|
| `target` | string | What to inspect: `node`, `flow`, `boundary`, or `model` |
| `field` | string | Dot-notation path on the target (e.g. `type`, `properties.encrypted`, `properties.hasRBAC`) |
| `operator` | string | `equals`, `not-equals`, `contains`, `not-contains`, `exists`, `not-exists`, `in`, `not-in` |
| `value` | any? | Expected value to compare against |

Notes:
- Flow-targeted rules also expose the flow's destination node as `node`, so a
  flow rule can constrain the target component's type/properties.
- `model` targets the whole project (for project-wide checks).
- "Absence of a control" is expressed as `not-equals true` on a boolean
  property (an unset property is treated as not-present). Example:
  `properties.hasRBAC not-equals true`.
- Security node properties available include `internetFacing`,
  `hasInputValidation`, `hasOutputFiltering`, `hasRBAC`, `hasApprovalFlow`,
  `hasLogging`, `hasSystemPromptProtection`, `hasGroundingChecks`,
  `isExternal`, `dataClassification`.

### Example 1: Unencrypted data flow crossing a trust boundary

```json
{
  "id": "RULE-009",
  "name": "Unencrypted data flow crossing trust boundary",
  "description": "A data flow that crosses a trust boundary is not encrypted, exposing data to interception.",
  "severity": "high",
  "category": "data-exposure",
  "conditions": [
    { "target": "flow", "field": "properties.encrypted", "operator": "equals", "value": false },
    { "target": "flow", "field": "properties.crossesTrustBoundary", "operator": "equals", "value": true }
  ],
  "logicOperator": "and",
  "threatIds": ["THR-005"],
  "mitigationIds": ["MIT-009"],
  "recommendation": "Encrypt all data flows crossing trust boundaries using TLS 1.2+."
}
```

### Example 2: Agent/tool connector without RBAC

```json
{
  "id": "RULE-003",
  "name": "AI agent or tool connector without RBAC",
  "description": "An AI agent or tool connector lacks role-based access control.",
  "severity": "high",
  "category": "agent-security",
  "conditions": [
    { "target": "node", "field": "type", "operator": "in", "value": ["ai-agent", "tool-connector"] },
    { "target": "node", "field": "properties.hasRBAC", "operator": "not-equals", "value": true }
  ],
  "logicOperator": "and",
  "appliesTo": { "nodeTypes": ["ai-agent", "tool-connector"] },
  "threatIds": ["THR-006", "THR-007"],
  "mitigationIds": ["MIT-003"],
  "recommendation": "Implement RBAC and least-privilege on all agent tool connectors."
}
```

## Writing Multi-Hop (Attack-Path) Rules

A rule with a `pathPattern` matches a **path through the component graph** —
chained attacks that no single-component rule can express. Full semantics are
in [ATTACK-PATHS.md](ATTACK-PATHS.md).

### PathPattern

| Field | Type | Description |
|---|---|---|
| `from` | RuleCondition[] | Node conditions for the untrusted source |
| `to` | RuleCondition[] | Node conditions for the target / sink |
| `without` | RuleCondition[]? | Node conditions for a control that breaks the chain if present on the path |
| `edge` | RuleCondition[]? | Flow conditions every traversed flow must satisfy |
| `maxHops` | number? | Path length bound (default 12) |

Evaluation is existential over simple paths: the rule fires when at least one
control-free path from a `from` node to a `to` node exists. All conditions
within a group are ANDed.

### Example 3: Indirect prompt-injection chain

```json
{
  "id": "RULE-026",
  "name": "Indirect prompt injection chain",
  "description": "Untrusted external content can reach a model along a path with no guardrail or moderation node.",
  "severity": "critical",
  "category": "prompt-security",
  "pathPattern": {
    "from": [{ "target": "node", "field": "type", "operator": "in", "value": ["external-knowledge-source", "document-ingestion-pipeline", "dataset-source"] }],
    "to": [{ "target": "node", "field": "type", "operator": "in", "value": ["llm", "hosted-model-api", "self-hosted-model"] }],
    "without": [{ "target": "node", "field": "type", "operator": "in", "value": ["guardrail", "moderation-layer"] }],
    "maxHops": 12
  },
  "threatIds": ["THR-002"],
  "mitigationIds": ["MIT-001", "MIT-010"],
  "recommendation": "Insert a guardrail or moderation node between external content sources and the model."
}
```

## Supported Frameworks

Use these canonical strings in the `framework` field. Identifiers are
source-verified against the frameworks' authoritative data.

| `framework` string | Framework | Example `id` |
|---|---|---|
| `MITRE ATLAS` | Adversarial Threat Landscape for AI Systems | `AML.T0051` |
| `OWASP LLM Top 10` | OWASP Top 10 for LLM Applications (2025) | `LLM01:2025` |
| `OWASP ML Top 10` | OWASP Machine Learning Security Top 10 (2023) | `ML02:2023` |
| `NIST AI RMF` | NIST AI Risk Management Framework 1.0 | `MEASURE 2.7` |
| `NIST CSF` | NIST Cybersecurity Framework 2.0 | `PR.DS-01` |

Include the `url` field where possible to deep-link the framework page.

## ID Conventions

| Prefix | Entity | Example |
|---|---|---|
| `THR-` | Threat | `THR-001` |
| `CTRL-` | Control | `CTRL-010` |
| `MIT-` | Mitigation | `MIT-005` |
| `RULE-` | Analysis Rule | `RULE-026` |

Use three-digit zero-padded numbers. The built-in base pack currently uses
`THR-001`..`THR-023`, `CTRL-001`..`CTRL-013`, `MIT-001`..`MIT-016`, and
`RULE-001`..`RULE-030` (RULE-026..030 are multi-hop). For a domain-specific
pack, choose a non-overlapping range or add a namespace
(e.g. `THR-RAG-001`).

## Testing Your Pack

1. Place your pack directory inside `src/knowledge/packs/`.
2. Start the app (`npm run dev`) or web build (`npm run dev:web`).
3. Build a model with the component types and properties your rules target.
4. Run **Analyze** and confirm rules fire as expected.
5. Expand a finding to check the **Why this fired** derivation (single
   component) or **Attack Path** chain (multi-hop), and verify framework
   references resolve.
