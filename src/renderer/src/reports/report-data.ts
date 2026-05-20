/**
 * Builds a structured report data object from the current project + findings.
 * The same data is consumed by every output formatter (PDF, DOCX, CSV).
 *
 * #10: every finding carries its resolved disposition (#6) and, if it's a
 * multi-hop finding, its attack-path chain (#3/#4). Formatters split open /
 * accepted / false-positive into separate sections; risks persist.
 */
import type { ThreatModelProject, DispositionStatus } from '@shared/types/model'
import type { Finding } from '@shared/types/analysis'
import type { Severity } from '@shared/types/knowledge'
import { resolveDisposition } from '../../../analysis/disposition'

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  informational: 4
}

const STATUS_ORDER: Record<DispositionStatus, number> = {
  open: 0,
  accepted: 1,
  'false-positive': 2
}

export interface ReportDispositionEntry {
  name: string
  justification: string
  at: string
  status: DispositionStatus
  override: { from: Severity; to: Severity } | null
}

export interface ReportFinding {
  id: string
  ruleId: string
  title: string
  /** Engine's original severity from the rule pack. */
  engineSeverity: Severity
  /** Effective severity after any #6 override; engineSeverity if none. */
  effectiveSeverity: Severity
  /** Severity override metadata if applied. */
  override: { from: Severity; to: Severity } | null
  /** Disposition status: open / accepted / false-positive. */
  status: DispositionStatus
  /** Latest disposition record (current state); null if status === 'open' and no override. */
  latestDisposition: ReportDispositionEntry | null
  /** Full disposition history for this finding (oldest -> newest). */
  dispositionHistory: ReportDispositionEntry[]
  category: string
  description: string
  rationale: string
  affectedComponents: string[]
  affectedFlows: string[]
  frameworks: string[]
  mitigations: string[]
  recommendation: string
  /** Present for multi-hop findings — the ordered attack-path chain. */
  attackPath: {
    chain: string[]
    missingControl: string
    vulnerableTargetCount: number
  } | null
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
    /** Counts by EFFECTIVE severity (post-override) — the working view. */
    bySeverity: Record<Severity, number>
    byStatus: {
      open: number
      accepted: number
      falsePositive: number
    }
  }
  /** All findings, sorted by effective severity, then status, then ruleId. */
  findings: ReportFinding[]
  /** Convenience partitions for formatters that render separate sections. */
  openFindings: ReportFinding[]
  acceptedFindings: ReportFinding[]
  falsePositiveFindings: ReportFinding[]
  /** Only path findings — used by the dedicated Attack Paths report section. */
  attackPathFindings: ReportFinding[]
}

const APP_NAME = 'AI Threat Modeler'
const APP_VERSION = '0.1.0'
const AUTHOR = 'Nader Shalabi'

export function buildReportData(
  project: ThreatModelProject,
  findings: Finding[]
): ReportData {
  const nodeLabel = (id: string): string =>
    project.nodes.find((n) => n.id === id)?.label ?? id
  const flowLabel = (id: string): string =>
    project.flows.find((f) => f.id === id)?.label ?? id

  const reportFindings: ReportFinding[] = findings.map((f) => {
    const resolved = resolveDisposition(project, f)
    const latest: ReportDispositionEntry | null = resolved.latest
      ? {
          name: resolved.latest.name,
          justification: resolved.latest.justification,
          at: resolved.latest.at,
          status: resolved.latest.status,
          override: resolved.latest.severityOverride ?? null
        }
      : null
    const history: ReportDispositionEntry[] = resolved.history.map((e) => ({
      name: e.name,
      justification: e.justification,
      at: e.at,
      status: e.status,
      override: e.severityOverride ?? null
    }))
    const attackPath = f.derivation.path
      ? {
          chain: f.derivation.path.nodeIds.map(nodeLabel),
          missingControl: f.derivation.path.missingControl,
          vulnerableTargetCount: f.derivation.path.vulnerableTargetCount
        }
      : null
    return {
      id: f.id,
      ruleId: f.ruleId,
      title: f.title,
      engineSeverity: f.severity,
      effectiveSeverity: resolved.effectiveSeverity,
      override: resolved.override,
      status: resolved.status,
      latestDisposition: latest,
      dispositionHistory: history,
      category: f.category,
      description: f.description,
      rationale: f.rationale,
      affectedComponents: f.affectedNodeIds.map(nodeLabel),
      affectedFlows: f.affectedFlowIds.map(flowLabel),
      frameworks: f.frameworkRefs.map(
        (r) => `${r.framework} ${r.id} — ${r.name}`
      ),
      mitigations: f.mitigations,
      recommendation: f.recommendation,
      attackPath
    }
  })

  reportFindings.sort((a, b) => {
    const s = SEVERITY_ORDER[a.effectiveSeverity] - SEVERITY_ORDER[b.effectiveSeverity]
    if (s !== 0) return s
    const st = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (st !== 0) return st
    return a.ruleId.localeCompare(b.ruleId)
  })

  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0
  }
  const byStatus = { open: 0, accepted: 0, falsePositive: 0 }
  for (const f of reportFindings) {
    bySeverity[f.effectiveSeverity]++
    if (f.status === 'accepted') byStatus.accepted++
    else if (f.status === 'false-positive') byStatus.falsePositive++
    else byStatus.open++
  }

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
      total: reportFindings.length,
      bySeverity,
      byStatus
    },
    findings: reportFindings,
    openFindings: reportFindings.filter((f) => f.status === 'open'),
    acceptedFindings: reportFindings.filter((f) => f.status === 'accepted'),
    falsePositiveFindings: reportFindings.filter((f) => f.status === 'false-positive'),
    attackPathFindings: reportFindings.filter((f) => f.attackPath !== null)
  }
}
