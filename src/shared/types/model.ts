export type ComponentCategory = 'standard' | 'ai'

export type ComponentType =
  // Standard infrastructure
  | 'external-actor'
  | 'web-app'
  | 'mobile-app'
  | 'api-gateway'
  | 'backend-service'
  | 'database'
  | 'object-storage'
  | 'message-queue'
  | 'identity-provider'
  | 'third-party-service'
  | 'logging-monitoring'
  | 'secrets-vault'
  // AI-specific
  | 'prompt-input'
  | 'llm'
  | 'hosted-model-api'
  | 'self-hosted-model'
  | 'embedding-model'
  | 'vector-db'
  | 'rag-orchestrator'
  | 'prompt-template-engine'
  | 'ai-agent'
  | 'tool-connector'
  | 'plugin'
  | 'memory-store'
  | 'fine-tuning-pipeline'
  | 'training-data-repo'
  | 'inference-pipeline'
  | 'model-registry'
  | 'feature-store'
  | 'evaluation-engine'
  | 'guardrail'
  | 'moderation-layer'
  | 'human-in-the-loop'
  | 'output-post-processor'
  | 'dataset-source'
  | 'external-knowledge-source'
  | 'document-ingestion-pipeline'
  | 'model-monitoring'
  | 'feedback-collection'

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted'

export type DataType =
  | 'prompts'
  | 'embeddings'
  | 'model-outputs'
  | 'credentials'
  | 'pii'
  | 'regulated-data'
  | 'training-data'
  | 'general'

export type BoundaryType =
  | 'end-user-device'
  | 'corporate-network'
  | 'cloud-tenant'
  | 'public-internet'
  | 'third-party-saas'
  | 'model-provider'
  | 'sensitive-data-zone'
  | 'training-env'
  | 'inference-env'
  | 'dev-test-prod'
  | 'partner-org'

export interface NodeProperties {
  internetFacing?: boolean
  handlesCredentials?: boolean
  handlesPII?: boolean
  dataClassification?: DataClassification
  provider?: string
  hasRBAC?: boolean
  hasApprovalFlow?: boolean
  hasLogging?: boolean
  isExternal?: boolean
  hasInputValidation?: boolean
  hasOutputFiltering?: boolean
  hasSystemPromptProtection?: boolean
  hasGroundingChecks?: boolean
  modelType?: string
  description?: string
  [key: string]: unknown
}

export interface ModelNode {
  id: string
  type: ComponentType
  label: string
  position: { x: number; y: number }
  properties: NodeProperties
}

export interface DataFlowProperties {
  protocol?: string
  encrypted: boolean
  authenticated: boolean
  dataClassification: DataClassification
  dataTypes: DataType[]
  crossesTrustBoundary?: boolean
  crossesProviderBoundary?: boolean
  bidirectional?: boolean
}

export interface DataFlow {
  id: string
  source: string
  target: string
  label: string
  properties: DataFlowProperties
}

export interface TrustBoundary {
  id: string
  type: BoundaryType
  label: string
  nodeIds: string[]
  properties?: Record<string, unknown>
}

/**
 * Disposition (#6): a finding's risk-treatment state, recorded as
 * append-only entries on the project. Each entry captures the FULL new
 * state for a finding key (status + optional severity override) plus
 * mandatory name + justification + timestamp. Current disposition for a
 * finding = the latest entry matching its stable key.
 *
 * Stable finding key = `${ruleId}|${sortedNodeIds}|${sortedFlowIds}`. This
 * survives re-analysis (Finding.id is a fresh nanoid each run).
 *
 * Name is self-declared (the app has no identity model); this is an
 * attributable change record by convention, not authenticated identity.
 */
export type DispositionStatus = 'open' | 'accepted' | 'false-positive'

export interface SeverityOverride {
  from: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  to: 'critical' | 'high' | 'medium' | 'low' | 'informational'
}

export interface DispositionEntry {
  /** Entry identifier (nanoid) — unique per log entry, not per finding. */
  id: string
  /** Stable finding key — see findingKey(). */
  key: string
  status: DispositionStatus
  severityOverride?: SeverityOverride | null
  /** Self-declared decision owner (required). */
  name: string
  /** Required free-text rationale. */
  justification: string
  /** ISO 8601 timestamp of when the action was recorded. */
  at: string
}

export type NoteCategory = 'general' | 'todo' | 'assumption' | 'decision' | 'finding-response'

export interface Note {
  id: string
  content: string
  category: NoteCategory
  author?: string
  createdAt: string
  updatedAt: string
  linkedNodeId?: string
  linkedFlowId?: string
  linkedBoundaryId?: string
}

export interface ThreatModelProject {
  version: '1.0'
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  nodes: ModelNode[]
  flows: DataFlow[]
  boundaries: TrustBoundary[]
  notes: Note[]
  /**
   * Append-only disposition log (#6). Latest entry per `key` is the
   * current state. Old project files lack this field; the zod schema
   * supplies a default of [] on load.
   */
  dispositions: DispositionEntry[]
  metadata?: Record<string, unknown>
}
