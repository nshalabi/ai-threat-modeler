import type { ComponentType, BoundaryType, DataType, DataClassification } from './model'
import type { Severity, FrameworkReference } from './knowledge'

export type RuleTarget = 'node' | 'flow' | 'boundary' | 'model'

export interface RuleCondition {
  target: RuleTarget
  field: string
  operator: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'exists' | 'not-exists' | 'in' | 'not-in'
  value?: unknown
}

/**
 * A multi-hop path pattern. Matches a path through the component graph
 * (nodes connected by flows). Used to express chained / compositional
 * attacks that no single-component rule can capture.
 *
 * Semantics (existential): the rule fires when there exists at least one
 * simple path from a node matching `from` to a node matching `to`, where
 * NO node on the path matches `without` (the absence-of-control operator)
 * and every traversed flow matches `edge`, within `maxHops`.
 *
 * `from` / `to` / `without` conditions are evaluated against nodes; `edge`
 * conditions against flows. Traversal follows flow direction.
 */
export interface PathPattern {
  from: RuleCondition[]
  to: RuleCondition[]
  without?: RuleCondition[]
  edge?: RuleCondition[]
  maxHops?: number
}

export interface AnalysisRule {
  id: string
  name: string
  description: string
  severity: Severity
  category: string
  // Single-component rules use `conditions`; multi-hop rules use
  // `pathPattern`. Exactly one is set (mutually exclusive in v1).
  conditions?: RuleCondition[]
  logicOperator?: 'and' | 'or'
  pathPattern?: PathPattern
  // Which node/flow types this rule applies to (empty = all)
  appliesTo?: {
    nodeTypes?: ComponentType[]
    boundaryTypes?: BoundaryType[]
    dataTypes?: DataType[]
    dataClassifications?: DataClassification[]
  }
  threatIds: string[]
  mitigationIds: string[]
  recommendation: string
}

/**
 * A single rule condition evaluated against the user's model, with the value
 * that was actually found. Drives the "Why this fired" breakdown.
 */
export interface ConditionTrace {
  target: RuleTarget
  field: string
  operator: RuleCondition['operator']
  expected?: unknown
  actual?: unknown
  passed: boolean
}

/**
 * The structured derivation of a finding: which rule conditions were checked,
 * what values triggered them, and how they were combined.
 */
/**
 * For multi-hop findings: the matched attack path and how many distinct
 * vulnerable targets the rule found.
 */
export interface PathDerivation {
  /** Ordered node ids from source to target. */
  nodeIds: string[]
  /** Ordered flow ids traversed (length = nodeIds.length - 1). */
  flowIds: string[]
  /** Node ids that the `without` (control) clause looked for. */
  missingControl: string
  /** How many vulnerable target nodes this rule found in the model. */
  vulnerableTargetCount: number
}

export interface FindingDerivation {
  logicOperator: 'and' | 'or'
  conditions: ConditionTrace[]
  /** Present only for multi-hop (path-pattern) findings. */
  path?: PathDerivation
}

export interface Finding {
  id: string
  ruleId: string
  title: string
  description: string
  severity: Severity
  category: string
  affectedNodeIds: string[]
  affectedFlowIds: string[]
  affectedBoundaryIds: string[]
  rationale: string
  derivation: FindingDerivation
  frameworkRefs: FrameworkReference[]
  mitigations: string[]
  recommendation: string
}

export interface AnalysisResult {
  projectId: string
  timestamp: string
  findings: Finding[]
  summary: {
    total: number
    bySeverity: Record<Severity, number>
  }
}
