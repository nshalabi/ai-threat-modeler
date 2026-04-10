export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational'

export interface FrameworkReference {
  framework: string
  id: string
  name: string
  url?: string
}

export interface Threat {
  id: string
  name: string
  description: string
  category: string
  severity: Severity
  frameworkRefs: FrameworkReference[]
  mitigationIds: string[]
}

export interface Weakness {
  id: string
  name: string
  description: string
  relatedThreatIds: string[]
  frameworkRefs: FrameworkReference[]
}

export interface Control {
  id: string
  name: string
  description: string
  category: string
  frameworkRefs: FrameworkReference[]
}

export interface Mitigation {
  id: string
  name: string
  description: string
  controlIds: string[]
  frameworkRefs: FrameworkReference[]
}

export interface KnowledgePack {
  id: string
  name: string
  version: string
  description: string
  author?: string
  threats: Threat[]
  weaknesses: Weakness[]
  controls: Control[]
  mitigations: Mitigation[]
}
