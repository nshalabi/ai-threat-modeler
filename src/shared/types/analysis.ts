import type { ComponentType, BoundaryType, DataType, DataClassification } from './model'
import type { Severity, FrameworkReference } from './knowledge'

export type RuleTarget = 'node' | 'flow' | 'boundary' | 'model'

export interface RuleCondition {
  target: RuleTarget
  field: string
  operator: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'exists' | 'not-exists' | 'in' | 'not-in'
  value?: unknown
}

export interface AnalysisRule {
  id: string
  name: string
  description: string
  severity: Severity
  category: string
  conditions: RuleCondition[]
  logicOperator: 'and' | 'or'
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
