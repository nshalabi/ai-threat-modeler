import type { BoundaryType } from '../types/model'

export interface BoundaryDefinition {
  type: BoundaryType
  label: string
  color: string
  description: string
}

export const BOUNDARY_LIBRARY: BoundaryDefinition[] = [
  {
    type: 'end-user-device',
    label: 'End-User Device',
    color: '#6366F1',
    description: 'Browser, mobile device, or desktop client operated by an end user',
  },
  {
    type: 'corporate-network',
    label: 'Corporate Network',
    color: '#2563EB',
    description: 'Internal corporate or enterprise network perimeter',
  },
  {
    type: 'cloud-tenant',
    label: 'Cloud Tenant',
    color: '#0EA5E9',
    description: 'Cloud provider tenant or subscription boundary (e.g. AWS account, Azure subscription)',
  },
  {
    type: 'public-internet',
    label: 'Public Internet',
    color: '#EF4444',
    description: 'Untrusted public internet zone',
  },
  {
    type: 'third-party-saas',
    label: 'Third-Party SaaS',
    color: '#F97316',
    description: 'Boundary around third-party SaaS services',
  },
  {
    type: 'model-provider',
    label: 'Model Provider',
    color: '#A855F7',
    description: 'External AI model provider environment',
  },
  {
    type: 'sensitive-data-zone',
    label: 'Sensitive Data Zone',
    color: '#DC2626',
    description: 'Zone containing confidential or restricted data with elevated controls',
  },
  {
    type: 'training-env',
    label: 'Training Environment',
    color: '#059669',
    description: 'Isolated environment for model training and fine-tuning',
  },
  {
    type: 'inference-env',
    label: 'Inference Environment',
    color: '#10B981',
    description: 'Production environment where model inference is served',
  },
  {
    type: 'dev-test-prod',
    label: 'Dev / Test / Prod',
    color: '#8B5CF6',
    description: 'Lifecycle environment boundary separating development, testing, and production',
  },
  {
    type: 'partner-org',
    label: 'Partner Organization',
    color: '#F59E0B',
    description: 'Boundary around a partner or collaborating organization',
  },
]
