/**
 * The PUBLIC, VERSIONED analysis-result contract returned by
 * `analyze_threat_model`.
 *
 * This shape is a deliberate public commitment, DECOUPLED from the engine's
 * internal `Finding` / `AnalysisResult` types via the mapper below. Internal
 * types may change freely; this contract evolves ADDITIVELY only, gated by
 * `resultSchemaVersion`. Agents and CI tooling code against this — never
 * against the internal types.
 *
 * Design choices that differ from the internal types on purpose:
 *  - Components / flows are exposed by human-readable LABEL, not internal id.
 *  - Each finding carries a STABLE `key` (ruleId + sorted node/flow ids) so an
 *    agent can correlate the same finding across re-analyses, even though the
 *    per-run `Finding.id` is a fresh nanoid (which we deliberately omit).
 *  - The internal per-condition `derivation` trace is omitted; the attack-path
 *    chain (the agent-actionable part) is surfaced explicitly.
 */
import type { AnalysisResult, Finding } from '@shared/types/analysis'
import type { ThreatModelProject } from '@shared/types/model'
import type { Severity } from '@shared/types/knowledge'
import { findingKeyOf } from '@core'

export const RESULT_SCHEMA_VERSION = '1.0' as const

export interface PublicFrameworkReference {
  framework: string
  id: string
  name: string
  url?: string
}

export interface PublicAttackPath {
  /** Ordered component labels from untrusted source to target/sink. */
  chain: string[]
  /** The control whose absence on the path lets the chain through. */
  missingControl: string
  /** How many distinct vulnerable targets this rule found in the model. */
  vulnerableTargetCount: number
}

export interface PublicFinding {
  /** Stable identity across re-analyses: ruleId + sorted node/flow ids. */
  key: string
  ruleId: string
  title: string
  severity: Severity
  category: string
  description: string
  /** Why the rule matched this model, in plain language. */
  rationale: string
  /** Labels of affected components. */
  affectedComponents: string[]
  /** Labels of affected data flows. */
  affectedFlows: string[]
  frameworkReferences: PublicFrameworkReference[]
  mitigations: string[]
  recommendation: string
  /** Present only for multi-hop (attack-path) findings. */
  attackPath?: PublicAttackPath
}

export interface PublicAnalysisResult {
  resultSchemaVersion: typeof RESULT_SCHEMA_VERSION
  engine: {
    name: string
    version: string
    /** Version of the knowledge pack the rules came from (reproducibility). */
    knowledgePackVersion: string
  }
  analyzedAt: string
  project: {
    name: string
    componentCount: number
    flowCount: number
    boundaryCount: number
  }
  summary: {
    total: number
    bySeverity: Record<Severity, number>
  }
  findings: PublicFinding[]
}

export interface MapResultOptions {
  engineName: string
  engineVersion: string
  knowledgePackVersion: string
}

/**
 * Project the internal `AnalysisResult` onto the public contract, resolving
 * node/flow ids to labels and stamping each finding with its stable key.
 */
export function toPublicResult(
  project: ThreatModelProject,
  result: AnalysisResult,
  opts: MapResultOptions
): PublicAnalysisResult {
  const nodeLabel = (id: string): string =>
    project.nodes.find((n) => n.id === id)?.label ?? id
  const flowLabel = (id: string): string =>
    project.flows.find((f) => f.id === id)?.label ?? id

  const findings: PublicFinding[] = result.findings.map((f: Finding) => {
    const attackPath: PublicAttackPath | undefined = f.derivation.path
      ? {
          chain: f.derivation.path.nodeIds.map(nodeLabel),
          missingControl: f.derivation.path.missingControl,
          vulnerableTargetCount: f.derivation.path.vulnerableTargetCount
        }
      : undefined

    return {
      key: findingKeyOf(f),
      ruleId: f.ruleId,
      title: f.title,
      severity: f.severity,
      category: f.category,
      description: f.description,
      rationale: f.rationale,
      affectedComponents: f.affectedNodeIds.map(nodeLabel),
      affectedFlows: f.affectedFlowIds.map(flowLabel),
      frameworkReferences: f.frameworkRefs.map((r) => ({
        framework: r.framework,
        id: r.id,
        name: r.name,
        ...(r.url ? { url: r.url } : {})
      })),
      mitigations: f.mitigations,
      recommendation: f.recommendation,
      ...(attackPath ? { attackPath } : {})
    }
  })

  return {
    resultSchemaVersion: RESULT_SCHEMA_VERSION,
    engine: {
      name: opts.engineName,
      version: opts.engineVersion,
      knowledgePackVersion: opts.knowledgePackVersion
    },
    analyzedAt: result.timestamp,
    project: {
      name: project.name,
      componentCount: project.nodes.length,
      flowCount: project.flows.length,
      boundaryCount: project.boundaries.length
    },
    summary: result.summary,
    findings
  }
}
