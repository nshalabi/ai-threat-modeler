import { nanoid } from 'nanoid'
import type { ThreatModelProject } from '../shared/types/model'
import type { AnalysisRule, AnalysisResult, Finding, RuleTarget } from '../shared/types/analysis'
import type { FrameworkReference, Severity } from '../shared/types/knowledge'
import { KnowledgeEngine } from '../knowledge/engine'
import { evaluateRule } from './evaluator'

export class AnalysisEngine {
  private rules: AnalysisRule[] = []
  private knowledgeEngine: KnowledgeEngine

  constructor(knowledgeEngine: KnowledgeEngine) {
    this.knowledgeEngine = knowledgeEngine
  }

  loadRules(rules: AnalysisRule[]): void {
    this.rules.push(...rules)
  }

  analyze(project: ThreatModelProject): AnalysisResult {
    const findings: Finding[] = []

    for (const rule of this.rules) {
      const matches = evaluateRule(rule, project)

      for (const match of matches) {
        // Resolve framework references from all linked threats
        const frameworkRefs: FrameworkReference[] = []
        for (const threatId of rule.threatIds) {
          const refs = this.knowledgeEngine.getFrameworkRefsForThreat(threatId)
          for (const ref of refs) {
            if (!frameworkRefs.some((r) => r.framework === ref.framework && r.id === ref.id)) {
              frameworkRefs.push(ref)
            }
          }
        }

        // Resolve mitigation names
        const mitigationNames: string[] = rule.mitigationIds
          .map((id) => this.knowledgeEngine.getMitigation(id))
          .filter((m) => m !== undefined)
          .map((m) => m.name)

        findings.push({
          id: nanoid(),
          ruleId: rule.id,
          title: rule.name,
          description: rule.description,
          severity: rule.severity,
          category: rule.category,
          affectedNodeIds: match.nodeIds,
          affectedFlowIds: match.flowIds,
          affectedBoundaryIds: match.boundaryIds,
          rationale: match.rationale,
          frameworkRefs,
          mitigations: mitigationNames,
          recommendation: rule.recommendation
        })
      }
    }

    // Sort by severity
    const severityOrder: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      informational: 4
    }
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    const bySeverity: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0
    }
    for (const f of findings) {
      bySeverity[f.severity]++
    }

    return {
      projectId: project.id,
      timestamp: new Date().toISOString(),
      findings,
      summary: {
        total: findings.length,
        bySeverity
      }
    }
  }

  getRules(): AnalysisRule[] {
    return [...this.rules]
  }

  clear(): void {
    this.rules = []
  }
}
