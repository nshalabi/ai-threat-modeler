# Knowledge Packs

## What Is a Knowledge Pack

A knowledge pack is a structured JSON collection of threats, weaknesses, controls, mitigations, and analysis rules. The tool loads these packs at startup and uses them to identify issues in AI system models during analysis. Packs can reference external security frameworks like MITRE ATLAS, OWASP LLM Top 10, and NIST AI RMF.

## Pack Structure

A knowledge pack is a directory containing the following files:

```
my-pack/
  pack.json          # Pack metadata
  threats.json       # Array of Threat objects
  controls.json      # Array of Control objects
  mitigations.json   # Array of Mitigation objects
  rules.json         # Array of AnalysisRule objects
```

### pack.json

```json
{
  "id": "my-pack",
  "name": "My Knowledge Pack",
  "version": "1.0.0",
  "description": "Threats and rules for a specific domain"
}
```

## Schema Reference

### Threat

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (convention: `THR-xxx`) |
| `name` | string | Short descriptive name |
| `description` | string | Detailed explanation of the threat |
| `category` | string | Grouping category (e.g., "prompt-injection", "data-poisoning") |
| `severity` | string | Default severity: `critical`, `high`, `medium`, or `low` |
| `frameworkRefs` | FrameworkReference[] | Links to external framework entries |
| `mitigationIds` | string[] | IDs of mitigations that address this threat |

### Control

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (convention: `CTRL-xxx`) |
| `name` | string | Short descriptive name |
| `description` | string | What the control does and how it reduces risk |
| `category` | string | Grouping category |
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
| `framework` | string | Framework identifier (see Supported Frameworks below) |
| `id` | string | The framework's own identifier (e.g., `AML.T0051`) |
| `name` | string | Human-readable name from the framework |
| `url` | string? | Optional URL to the framework documentation page |

### AnalysisRule

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (convention: `RULE-xxx`) |
| `name` | string | Short descriptive name |
| `description` | string | What the rule detects |
| `severity` | string | Finding severity when the rule fires: `critical`, `high`, `medium`, or `low` |
| `category` | string | Rule category for grouping |
| `conditions` | Condition[] | Array of conditions to evaluate (see Writing Rules) |
| `logicOperator` | string | How to combine conditions: `AND` (all must match) or `OR` (at least one) |
| `appliesTo` | object? | Optional filter restricting which nodes or flows the rule targets |
| `threatIds` | string[] | Threat IDs to reference in generated findings |
| `mitigationIds` | string[] | Mitigation IDs to recommend in generated findings |
| `recommendation` | string | Human-readable recommendation text included in the finding |

## Writing Rules

Rules use a declarative condition system. Each condition specifies a target, a field path, an operator, and an expected value.

### Condition Fields

| Field | Type | Description |
|---|---|---|
| `target` | string | What to inspect: `node`, `flow`, `sourceNode`, `targetNode`, `trustBoundary` |
| `field` | string | Dot-notation path to a property (e.g., `type`, `properties.isExternal`) |
| `operator` | string | Comparison: `equals`, `notEquals`, `contains`, `notContains`, `exists`, `notExists`, `in`, `notIn`, `greaterThan`, `lessThan` |
| `value` | any | The expected value to compare against |

### Example 1: Unencrypted data flow crossing a trust boundary

This rule fires when a data flow connects nodes in different trust boundaries and the flow is not encrypted.

```json
{
  "id": "RULE-010",
  "name": "Unencrypted cross-boundary data flow",
  "description": "Detects data flows that cross trust boundaries without encryption",
  "severity": "high",
  "category": "data-security",
  "conditions": [
    {
      "target": "sourceNode",
      "field": "trustBoundaryId",
      "operator": "notEquals",
      "value": { "$ref": "targetNode.trustBoundaryId" }
    },
    {
      "target": "flow",
      "field": "properties.encrypted",
      "operator": "equals",
      "value": false
    }
  ],
  "logicOperator": "AND",
  "appliesTo": { "type": "dataFlow" },
  "threatIds": ["THR-020"],
  "mitigationIds": ["MIT-015"],
  "recommendation": "Enable encryption (TLS or application-layer) for data flows that cross trust boundaries."
}
```

The first condition uses a `$ref` to dynamically compare the source node's trust boundary against the target node's trust boundary. The second condition checks that the flow's `encrypted` property is `false`. Both must match (AND).

### Example 2: External LLM without access control

This rule fires for any LLM node that is marked as external but lacks authentication on its incoming flows.

```json
{
  "id": "RULE-025",
  "name": "External LLM without access control",
  "description": "Detects external LLM components that receive data without authentication",
  "severity": "medium",
  "category": "access-control",
  "conditions": [
    {
      "target": "node",
      "field": "type",
      "operator": "equals",
      "value": "llm"
    },
    {
      "target": "node",
      "field": "properties.isExternal",
      "operator": "equals",
      "value": true
    },
    {
      "target": "node",
      "field": "properties.authentication",
      "operator": "notExists",
      "value": null
    }
  ],
  "logicOperator": "AND",
  "appliesTo": { "type": "node", "nodeTypes": ["llm"] },
  "threatIds": ["THR-030"],
  "mitigationIds": ["MIT-022"],
  "recommendation": "Implement API key or OAuth authentication for all external LLM endpoints."
}
```

### Example 3: User input directly connected to prompt construction

This rule detects when a user-facing input component connects directly to a prompt template or LLM without an intermediate sanitization step.

```json
{
  "id": "RULE-040",
  "name": "Direct user input to prompt",
  "description": "Detects user input flowing directly to prompt construction without sanitization",
  "severity": "critical",
  "category": "prompt-injection",
  "conditions": [
    {
      "target": "sourceNode",
      "field": "type",
      "operator": "in",
      "value": ["user-input", "web-interface", "api-endpoint"]
    },
    {
      "target": "targetNode",
      "field": "type",
      "operator": "in",
      "value": ["llm", "prompt-template"]
    }
  ],
  "logicOperator": "AND",
  "appliesTo": { "type": "dataFlow" },
  "threatIds": ["THR-001"],
  "mitigationIds": ["MIT-001", "MIT-002"],
  "recommendation": "Add input validation and sanitization between user input and prompt construction. Consider implementing a prompt firewall."
}
```

## Supported Frameworks

Use these identifiers in the `framework` field of FrameworkReference objects:

| Identifier | Framework | Example ID Format |
|---|---|---|
| `MITRE_ATLAS` | MITRE ATLAS (Adversarial Threat Landscape for AI Systems) | `AML.T0051` |
| `OWASP_LLM_TOP10` | OWASP Top 10 for LLM Applications | `LLM01` |
| `OWASP_GENAI` | OWASP GenAI Security Guidance | varies |
| `NIST_AI_RMF` | NIST AI Risk Management Framework | `MAP 1.1` |
| `NIST_CSF` | NIST Cybersecurity Framework | `PR.DS-1` |

When creating framework references, include the `url` field where possible to link directly to the relevant page.

## ID Conventions

Use the following prefixes to keep identifiers consistent across packs:

| Prefix | Entity | Example |
|---|---|---|
| `THR-` | Threat | `THR-001` |
| `CTRL-` | Control | `CTRL-010` |
| `MIT-` | Mitigation | `MIT-005` |
| `RULE-` | Analysis Rule | `RULE-040` |

Use three-digit zero-padded numbers. If a pack is domain-specific, you can add a namespace after the prefix (e.g., `THR-RAG-001` for RAG-specific threats).

## Testing Your Pack

1. Place your pack directory inside `src/knowledge/packs/`
2. Start the app with `npm run dev`
3. Create a sample model that includes the component types your rules target
4. Set the node and flow properties that your conditions check
5. Run analysis and verify that your rules produce the expected findings
6. Check that findings include the correct threat references, mitigations, and framework links
