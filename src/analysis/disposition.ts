/**
 * Disposition resolution (#6). Pure helpers — no React, no store. Used by
 * both the renderer (Findings UI, effective severity) and any future
 * report/CLI integrations (#10/#7).
 */
import type {
  DispositionEntry,
  DispositionStatus,
  SeverityOverride,
  ThreatModelProject
} from '../shared/types/model'
import type { Finding } from '../shared/types/analysis'
import type { Severity } from '../shared/types/knowledge'

/**
 * Stable finding identity that survives re-analysis. `Finding.id` is a fresh
 * nanoid every run, so we key on (ruleId | sorted affectedNodeIds | sorted
 * affectedFlowIds). Re-running Analyze produces matching keys for the same
 * logical findings; if a finding's affected entities change, the key changes
 * too — which correctly means "this is a different finding now."
 */
export function findingKey(
  ruleId: string,
  affectedNodeIds: readonly string[],
  affectedFlowIds: readonly string[]
): string {
  const nodes = [...affectedNodeIds].sort().join(',')
  const flows = [...affectedFlowIds].sort().join(',')
  return `${ruleId}|${nodes}|${flows}`
}

export function findingKeyOf(f: Finding): string {
  return findingKey(f.ruleId, f.affectedNodeIds, f.affectedFlowIds)
}

export interface ResolvedDisposition {
  status: DispositionStatus
  /** Latest applied override; null if engine severity is in effect. */
  override: SeverityOverride | null
  /** Severity to use for sorting / summary counts / canvas glow. */
  effectiveSeverity: Severity
  /** Most recent entry for this finding; null if none. */
  latest: DispositionEntry | null
  /** All entries for this finding, oldest first. */
  history: DispositionEntry[]
}

/**
 * Resolve the current disposition for a finding. Default state: `open`,
 * no override, effective severity = the engine's original.
 */
export function resolveDisposition(
  project: ThreatModelProject,
  finding: Finding
): ResolvedDisposition {
  const key = findingKeyOf(finding)
  const history = (project.dispositions ?? [])
    .filter((e) => e.key === key)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at))
  const latest = history.length > 0 ? history[history.length - 1] : null
  const override = latest?.severityOverride ?? null
  return {
    status: latest?.status ?? 'open',
    override,
    effectiveSeverity: override ? override.to : finding.severity,
    latest,
    history
  }
}

/** True if a disposition has been recorded for this finding (any state). */
export function hasDisposition(
  project: ThreatModelProject,
  finding: Finding
): boolean {
  return !!resolveDisposition(project, finding).latest
}
