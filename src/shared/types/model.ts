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
  metadata?: Record<string, unknown>
}
