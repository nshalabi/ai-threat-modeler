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

## Exploring paths in the UI

The **Attack Paths** panel (toolbar) makes detection interactive:

- **Detected chains** — every multi-hop path-rule finding from the last
  analysis. Selecting one drives a canvas overlay: numbered sequence badges
  along the chain, an **⚠ ENTRY** marker on the untrusted source, a
  **◎ TARGET** marker on the sink, and a spotlight that dims everything off
  the path.
- **Probe a component** — select an asset (model, tool, datastore, registry,
  memory…) and the panel finds *every* control-free path from an untrusted
  source to it, even where no rule fired. The probe button is enabled only for
  asset/sink components; a always-present **Suggested targets** list offers
  the model's assets as one-click probes. If an asset has no control-free
  path, the panel reports that explicitly as a positive result.

The probe uses the same `findControlFreePaths` traversal as rule evaluation,
with a fixed untrusted-source set (`external-actor`, `prompt-input`,
`external-knowledge-source`, `dataset-source`, `document-ingestion-pipeline`)
and the standard control node types
(`guardrail`, `moderation-layer`, `human-in-the-loop`, `evaluation-engine`,
`output-post-processor`).

## In exported reports

Path findings are surfaced in PDF, DOCX, and CSV exports. PDF and DOCX get a
dedicated **Attack Paths** section listing every multi-hop finding with its
ordered chain, missing control, severity, and status (Open / Accepted /
False Positive). Each finding also restates its chain inline in the
findings section, and any risk-treatment disposition (severity override,
acceptance, false-positive) is disclosed alongside the chain with the
decision owner, timestamp, and justification. The CSV adds Attack Path,
Missing Control, and Vulnerable Target Count columns, plus a full
disposition audit log as a separate section so the report functions as a
complete audit artefact.
