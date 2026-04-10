import type { ComponentType, ComponentCategory, NodeProperties } from '../types/model'

export interface ComponentDefinition {
  type: ComponentType
  label: string
  icon: string
  category: ComponentCategory
  description: string
  defaultProperties: NodeProperties
}

export const COMPONENT_LIBRARY: ComponentDefinition[] = [
  // Standard infrastructure
  {
    type: 'external-actor',
    label: 'External Actor',
    icon: '\ud83d\udc64',
    category: 'standard',
    description: 'End user or external system interacting with the application',
    defaultProperties: { internetFacing: true, isExternal: true }
  },
  {
    type: 'web-app',
    label: 'Web Application',
    icon: '\ud83c\udf10',
    category: 'standard',
    description: 'Browser-based web application',
    defaultProperties: { internetFacing: true, hasInputValidation: false }
  },
  {
    type: 'mobile-app',
    label: 'Mobile App',
    icon: '\ud83d\udcf1',
    category: 'standard',
    description: 'Native or hybrid mobile application',
    defaultProperties: { internetFacing: true, hasInputValidation: false }
  },
  {
    type: 'api-gateway',
    label: 'API Gateway',
    icon: '\ud83d\udee1\ufe0f',
    category: 'standard',
    description: 'API gateway / reverse proxy',
    defaultProperties: { internetFacing: true, hasRBAC: false, hasLogging: false }
  },
  {
    type: 'backend-service',
    label: 'Backend Service',
    icon: '\u2699\ufe0f',
    category: 'standard',
    description: 'Server-side application or microservice',
    defaultProperties: { internetFacing: false, hasLogging: false }
  },
  {
    type: 'database',
    label: 'Database',
    icon: '\ud83d\uddc4\ufe0f',
    category: 'standard',
    description: 'Relational or NoSQL database',
    defaultProperties: { dataClassification: 'internal', hasRBAC: false }
  },
  {
    type: 'object-storage',
    label: 'Object Storage',
    icon: '\ud83d\udce6',
    category: 'standard',
    description: 'Cloud object storage (S3, GCS, Blob)',
    defaultProperties: { dataClassification: 'internal', hasRBAC: false }
  },
  {
    type: 'message-queue',
    label: 'Message Queue',
    icon: '\ud83d\udce8',
    category: 'standard',
    description: 'Message broker or event bus',
    defaultProperties: { hasLogging: false }
  },
  {
    type: 'identity-provider',
    label: 'Identity Provider',
    icon: '\ud83d\udd11',
    category: 'standard',
    description: 'Authentication / identity provider (IdP)',
    defaultProperties: { handlesCredentials: true, hasRBAC: true }
  },
  {
    type: 'third-party-service',
    label: 'Third-Party Service',
    icon: '\ud83d\udd17',
    category: 'standard',
    description: 'External SaaS or third-party API',
    defaultProperties: { isExternal: true, internetFacing: true }
  },
  {
    type: 'logging-monitoring',
    label: 'Logging & Monitoring',
    icon: '\ud83d\udcca',
    category: 'standard',
    description: 'Logging, monitoring, and observability stack',
    defaultProperties: { hasLogging: true }
  },
  {
    type: 'secrets-vault',
    label: 'Secrets Vault',
    icon: '\ud83d\udd10',
    category: 'standard',
    description: 'Secrets management service',
    defaultProperties: { handlesCredentials: true, hasRBAC: true, dataClassification: 'restricted' }
  },
  // AI-specific
  {
    type: 'prompt-input',
    label: 'Prompt Input',
    icon: '\ud83d\udcdd',
    category: 'ai',
    description: 'User prompt input interface',
    defaultProperties: { internetFacing: true, hasInputValidation: false }
  },
  {
    type: 'llm',
    label: 'LLM',
    icon: '\ud83e\udde0',
    category: 'ai',
    description: 'Large Language Model',
    defaultProperties: { hasInputValidation: false, hasOutputFiltering: false }
  },
  {
    type: 'hosted-model-api',
    label: 'Hosted Model API',
    icon: '\u2601\ufe0f',
    category: 'ai',
    description: 'Third-party hosted LLM API endpoint',
    defaultProperties: { isExternal: true, internetFacing: true, provider: '' }
  },
  {
    type: 'self-hosted-model',
    label: 'Self-Hosted Model',
    icon: '\ud83d\udda5\ufe0f',
    category: 'ai',
    description: 'Self-hosted / on-prem model inference',
    defaultProperties: { isExternal: false, internetFacing: false }
  },
  {
    type: 'embedding-model',
    label: 'Embedding Model',
    icon: '\ud83d\udcca',
    category: 'ai',
    description: 'Text or multimodal embedding model',
    defaultProperties: {}
  },
  {
    type: 'vector-db',
    label: 'Vector Database',
    icon: '\ud83e\uddf2',
    category: 'ai',
    description: 'Vector store for similarity search',
    defaultProperties: { dataClassification: 'internal' }
  },
  {
    type: 'rag-orchestrator',
    label: 'RAG Orchestrator',
    icon: '\ud83d\udd04',
    category: 'ai',
    description: 'Retrieval-Augmented Generation orchestration layer',
    defaultProperties: { hasInputValidation: false }
  },
  {
    type: 'prompt-template-engine',
    label: 'Prompt Template Engine',
    icon: '\ud83d\udccb',
    category: 'ai',
    description: 'Manages and renders prompt templates',
    defaultProperties: { hasInputValidation: false }
  },
  {
    type: 'ai-agent',
    label: 'AI Agent',
    icon: '\ud83e\udd16',
    category: 'ai',
    description: 'Autonomous AI agent with tool access',
    defaultProperties: { hasApprovalFlow: false, hasLogging: false }
  },
  {
    type: 'tool-connector',
    label: 'Tool Connector',
    icon: '\ud83d\udd27',
    category: 'ai',
    description: 'Bridge between AI agent and external tools/APIs',
    defaultProperties: { isExternal: true }
  },
  {
    type: 'plugin',
    label: 'Plugin',
    icon: '\ud83e\udde9',
    category: 'ai',
    description: 'Third-party plugin for AI system',
    defaultProperties: { isExternal: true, hasInputValidation: false }
  },
  {
    type: 'memory-store',
    label: 'Memory Store',
    icon: '\ud83d\udcbe',
    category: 'ai',
    description: 'Persistent memory / conversation history store',
    defaultProperties: { dataClassification: 'confidential', handlesPII: true }
  },
  {
    type: 'fine-tuning-pipeline',
    label: 'Fine-Tuning Pipeline',
    icon: '\ud83c\udfaf',
    category: 'ai',
    description: 'Model fine-tuning workflow',
    defaultProperties: { dataClassification: 'confidential' }
  },
  {
    type: 'training-data-repo',
    label: 'Training Data Repo',
    icon: '\ud83d\udcda',
    category: 'ai',
    description: 'Training and evaluation data repository',
    defaultProperties: { dataClassification: 'confidential' }
  },
  {
    type: 'inference-pipeline',
    label: 'Inference Pipeline',
    icon: '\u26a1',
    category: 'ai',
    description: 'Model inference / serving pipeline',
    defaultProperties: { hasLogging: false }
  },
  {
    type: 'model-registry',
    label: 'Model Registry',
    icon: '\ud83d\udcc1',
    category: 'ai',
    description: 'Model versioning and registry',
    defaultProperties: { hasRBAC: false }
  },
  {
    type: 'feature-store',
    label: 'Feature Store',
    icon: '\ud83d\udce5',
    category: 'ai',
    description: 'ML feature store',
    defaultProperties: { dataClassification: 'internal' }
  },
  {
    type: 'evaluation-engine',
    label: 'Evaluation Engine',
    icon: '\ud83d\udcdd',
    category: 'ai',
    description: 'Model evaluation and benchmarking engine',
    defaultProperties: {}
  },
  {
    type: 'guardrail',
    label: 'Guardrail',
    icon: '\ud83d\udea7',
    category: 'ai',
    description: 'Input/output guardrail for safety filtering',
    defaultProperties: { hasInputValidation: true, hasOutputFiltering: true }
  },
  {
    type: 'moderation-layer',
    label: 'Moderation Layer',
    icon: '\ud83d\udeab',
    category: 'ai',
    description: 'Content moderation / policy enforcement',
    defaultProperties: { hasInputValidation: true, hasOutputFiltering: true }
  },
  {
    type: 'human-in-the-loop',
    label: 'Human-in-the-Loop',
    icon: '\u270b',
    category: 'ai',
    description: 'Human review / approval step',
    defaultProperties: { hasApprovalFlow: true }
  },
  {
    type: 'output-post-processor',
    label: 'Output Post-Processor',
    icon: '\ud83d\udce4',
    category: 'ai',
    description: 'Post-processing of model outputs',
    defaultProperties: { hasOutputFiltering: true }
  },
  {
    type: 'dataset-source',
    label: 'Dataset Source',
    icon: '\ud83d\udcc2',
    category: 'ai',
    description: 'External dataset source',
    defaultProperties: { isExternal: true, dataClassification: 'internal' }
  },
  {
    type: 'external-knowledge-source',
    label: 'External Knowledge Source',
    icon: '\ud83c\udf0d',
    category: 'ai',
    description: 'External knowledge base or corpus',
    defaultProperties: { isExternal: true }
  },
  {
    type: 'document-ingestion-pipeline',
    label: 'Document Ingestion Pipeline',
    icon: '\ud83d\udce5',
    category: 'ai',
    description: 'Pipeline for ingesting and processing documents',
    defaultProperties: { hasInputValidation: false }
  },
  {
    type: 'model-monitoring',
    label: 'Model Monitoring',
    icon: '\ud83d\udcc8',
    category: 'ai',
    description: 'Model performance and drift monitoring',
    defaultProperties: { hasLogging: true }
  },
  {
    type: 'feedback-collection',
    label: 'Feedback Collection',
    icon: '\ud83d\udcac',
    category: 'ai',
    description: 'User feedback collection for RLHF or evaluation',
    defaultProperties: { handlesPII: true }
  }
]

export const COMPONENT_MAP: Record<ComponentType, ComponentDefinition> = Object.fromEntries(
  COMPONENT_LIBRARY.map((c) => [c.type, c])
) as Record<ComponentType, ComponentDefinition>
