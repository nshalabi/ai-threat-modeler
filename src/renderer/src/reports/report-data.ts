/**
 * Builds a structured report data object from the current project + findings.
 * The same data is consumed by every output formatter (PDF, DOCX, CSV).
 */
import type { ThreatModelProject } from '@shared/types/model'
import type { Finding } from '@shared/types/analysis'
import type { Severity } from '@shared/types/knowledge'

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  informational: 4
}

export interface ReportFinding {
  id: string
  ruleId: string
  title: string
  severity: Severity
  category: string
  description: string
  rationale: string
  affectedComponents: string[]
  affectedFlows: string[]
  frameworks: string[]
  mitigations: string[]
  recommendation: string
}

export interface ReportData {
  appName: string
  appVersion: string
  author: string
  generatedAt: string
  project: {
    name: string
    description: string
    componentCount: number
    flowCount: number
    boundaryCount: number
    noteCount: number
  }
  components: Array<{ label: string; type: string; classification?: string }>
  flows: Array<{
    label: string
    source: string
    target: string
    encrypted: boolean
    authenticated: boolean
    classification: string
  }>
  boundaries: Array<{ label: string; type: string; nodeCount: number }>
  notes: Array<{ category: string; content: string }>
  summary: {
    total: number
    bySeverity: Record<Severity, number>
  }
  findings: ReportFinding[]
}

const APP_NAME = 'AI Threat Modeler'
const APP_VERSION = '0.1.0'
const AUTHOR = 'Nader Shalabi'

export function buildReportData(
  project: ThreatModelProject,
  findings: Finding[]
): ReportData {
  const nodeLabel = (id: string) => project.nodes.find((n) => n.id === id)?.label ?? id
  const flowLabel = (id: string) => project.flows.find((f) => f.id === id)?.label ?? id

  const sortedFindings = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0
  }
  for (const f of findings) bySeverity[f.severity]++

  return {
    appName: APP_NAME,
    appVersion: APP_VERSION,
    author: AUTHOR,
    generatedAt: new Date().toISOString(),
    project: {
      name: project.name,
      description: project.description ?? '',
      componentCount: project.nodes.length,
      flowCount: project.flows.length,
      boundaryCount: project.boundaries.length,
      noteCount: project.notes.length
    },
    components: project.nodes.map((n) => ({
      label: n.label,
      type: n.type,
      classification: n.properties.dataClassification as string | undefined
    })),
    flows: project.flows.map((f) => ({
      label: f.label,
      source: nodeLabel(f.source),
      target: nodeLabel(f.target),
      encrypted: !!f.properties.encrypted,
      authenticated: !!f.properties.authenticated,
      classification: f.properties.dataClassification
    })),
    boundaries: project.boundaries.map((b) => ({
      label: b.label,
      type: b.type,
      nodeCount: b.nodeIds.length
    })),
    notes: project.notes.map((n) => ({ category: n.category, content: n.content })),
    summary: {
      total: findings.length,
      bySeverity
    },
    findings: sortedFindings.map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      title: f.title,
      severity: f.severity,
      category: f.category,
      description: f.description,
      rationale: f.rationale,
      affectedComponents: f.affectedNodeIds.map(nodeLabel),
      affectedFlows: f.affectedFlowIds.map(flowLabel),
      frameworks: f.frameworkRefs.map((r) => `${r.framework} ${r.id} — ${r.name}`),
      mitigations: f.mitigations,
      recommendation: f.recommendation
    }))
  }
}
