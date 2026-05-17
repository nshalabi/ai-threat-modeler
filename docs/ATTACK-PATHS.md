# Attack-Path Detection

AI Threat Modeler detects **chained (multi-hop) attacks** — attacks that exist
because of how components are connected, not because any single component is
misconfigured. This document defines exactly how attack-path detection works
and lists the path rules that ship with the tool, so you never have to reverse
engineer the rules to understand a finding.

## How an attack path is evaluated

The model is a directed graph: **nodes are components**, **edges are data
flows** (`flow.source → flow.target`). Traversal follows flow direction.

A path rule is defined by four parts:

| Part | Meaning |
|------|---------|
| `from` | The **untrusted source** — where an attacker or attacker-influenced data can originate (e.g., external actor, public input, external knowledge source). |
| `to` | The **target** — the asset or sink the attacker wants to reach (e.g., the model, a tool connector, a sensitive data store). |
| `without` | The **control** — a node type that, if present anywhere on the path, breaks the chain (e.g., guardrail, moderation layer, human-in-the-loop, evaluation engine). |
| `edge` *(optional)* | A condition every traversed flow must satisfy (e.g., `encrypted = false`). |

### Firing rule

> A finding is produced when **there exists at least one simple path** (no
> repeated nodes) from a `from` node to a `to` node such that **no node on
> that path matches `without`**, every traversed flow matches `edge`, and the
> path is within `maxHops` (default 12).

Key properties:

- **Existential.** If *any* control-free path exists, the rule fires — even if
  other paths to the same target *are* protected. Rationale: an attacker takes
  the unprotected route, so the threat is real as long as one exists.
- **Control = a node on the path.** `without` is the absence-of-control
  operator. Controls are modeled as dedicated component types
  (guardrail, moderation-layer, human-in-the-loop, evaluation-engine,
  output-post-processor). If such a node sits on the path, that path is
  considered defended and is not reported.
- **One finding per vulnerable target.** If several `to` nodes are reachable
  via control-free paths, each is a separate finding, evidenced by the
  **shortest** control-free path to it. The finding's "Attack Path" section
  shows the ordered chain and which control was missing.
- **Source matters.** Without an untrusted `from` anchor, ordinary internal
  routes would be flagged. The source is what makes a path an *attack* path.

### What it is not

Architecture-graph path matching — not ATT&CK-style tactic sequencing, not
probabilistic attack trees. It answers: *"can an attacker-reachable source
reach a sensitive target without passing a control?"*

## Path rules shipped with the tool

| Rule | Severity | from → to → (no control) | Maps to |
|------|----------|--------------------------|---------|
| RULE-026 Indirect prompt injection chain | critical | external content source → model, no guardrail/moderation | OWASP LLM01, ATLAS AML.T0051.001 |
| RULE-027 Unencrypted sensitive-data path to external provider | high | confidential/restricted data → hosted model API over unencrypted flows, no sanitizing control | OWASP LLM02, NIST CSF PR.DS-02 |
| RULE-028 Context-poisoning to consequential action | high | untrusted source → tool connector, no human approval/guardrail | ATLAS AML.T0080 |
| RULE-029 Poisoned training-data chain | high | external dataset → training/fine-tuning, no validation/evaluation | OWASP ML02, ATLAS AML.T0020 |
| RULE-030 Exfiltration-via-agent-tool chain | high | untrusted source → tool connector, no approval/guardrail/monitoring | ATLAS AML.T0086 |

## Authoring your own path rules

Path rules are declarative JSON in the knowledge pack. A rule uses either
`conditions` (single-component) or `pathPattern` (multi-hop) — not both. The
`pathPattern` shape:

```jsonc
"pathPattern": {
  "from":    [ { "target": "node", "field": "type", "operator": "in", "value": ["external-actor"] } ],
  "to":      [ { "target": "node", "field": "type", "operator": "in", "value": ["tool-connector"] } ],
  "without": [ { "target": "node", "field": "type", "operator": "in", "value": ["human-in-the-loop"] } ],
  "edge":    [ { "target": "flow", "field": "properties.encrypted", "operator": "equals", "value": false } ],
  "maxHops": 12
}
```

`from` / `to` / `without` conditions are evaluated against nodes; `edge`
against flows. All conditions in a group must pass (AND). The same condition
vocabulary (`field`, `operator`, `value`) used by single-component rules
applies, so no new syntax is needed.
