import { z } from 'zod'

const componentTypes = [
  'external-actor', 'web-app', 'mobile-app', 'api-gateway', 'backend-service',
  'database', 'object-storage', 'message-queue', 'identity-provider',
  'third-party-service', 'logging-monitoring', 'secrets-vault',
  'prompt-input', 'llm', 'hosted-model-api', 'self-hosted-model',
  'embedding-model', 'vector-db', 'rag-orchestrator', 'prompt-template-engine',
  'ai-agent', 'tool-connector', 'plugin', 'memory-store',
  'fine-tuning-pipeline', 'training-data-repo', 'inference-pipeline',
  'model-registry', 'feature-store', 'evaluation-engine', 'guardrail',
  'moderation-layer', 'human-in-the-loop', 'output-post-processor',
  'dataset-source', 'external-knowledge-source', 'document-ingestion-pipeline',
  'model-monitoring', 'feedback-collection',
] as const

const dataClassifications = ['public', 'internal', 'confidential', 'restricted'] as const

const dataTypes = [
  'prompts', 'embeddings', 'model-outputs', 'credentials',
  'pii', 'regulated-data', 'training-data', 'general',
] as const

const boundaryTypes = [
  'end-user-device', 'corporate-network', 'cloud-tenant', 'public-internet',
  'third-party-saas', 'model-provider', 'sensitive-data-zone', 'training-env',
  'inference-env', 'dev-test-prod', 'partner-org',
] as const

export const nodePropertiesSchema = z.object({
  internetFacing: z.boolean().optional(),
  handlesCredentials: z.boolean().optional(),
  handlesPII: z.boolean().optional(),
  dataClassification: z.enum(dataClassifications).optional(),
  provider: z.string().optional(),
  hasRBAC: z.boolean().optional(),
  hasApprovalFlow: z.boolean().optional(),
  hasLogging: z.boolean().optional(),
  isExternal: z.boolean().optional(),
  hasInputValidation: z.boolean().optional(),
  hasOutputFiltering: z.boolean().optional(),
  modelType: z.string().optional(),
  description: z.string().optional(),
}).passthrough()

export const modelNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(componentTypes),
  label: z.string().min(1),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  properties: nodePropertiesSchema,
})

export const dataFlowPropertiesSchema = z.object({
  protocol: z.string().optional(),
  encrypted: z.boolean(),
  authenticated: z.boolean(),
  dataClassification: z.enum(dataClassifications),
  dataTypes: z.array(z.enum(dataTypes)),
  crossesTrustBoundary: z.boolean().optional(),
  crossesProviderBoundary: z.boolean().optional(),
  bidirectional: z.boolean().optional(),
}).passthrough()

export const dataFlowSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().min(1),
  properties: dataFlowPropertiesSchema,
})

export const trustBoundarySchema = z.object({
  id: z.string().min(1),
  type: z.enum(boundaryTypes),
  label: z.string().min(1),
  nodeIds: z.array(z.string()),
  properties: z.record(z.unknown()).optional(),
})

const noteCategories = ['general', 'todo', 'assumption', 'decision', 'finding-response'] as const

export const noteSchema = z.object({
  id: z.string().min(1),
  content: z.string(),
  category: z.enum(noteCategories),
  author: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  linkedNodeId: z.string().optional(),
  linkedFlowId: z.string().optional(),
  linkedBoundaryId: z.string().optional(),
})

export const threatModelProjectSchema = z.object({
  version: z.literal('1.0'),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  nodes: z.array(modelNodeSchema),
  flows: z.array(dataFlowSchema),
  boundaries: z.array(trustBoundarySchema),
  notes: z.array(noteSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
})

export type ValidatedProject = z.infer<typeof threatModelProjectSchema>

export function validateProject(input: unknown): ValidatedProject | string[] {
  const result = threatModelProjectSchema.safeParse(input)
  if (result.success) {
    return result.data
  }
  return result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  )
}
