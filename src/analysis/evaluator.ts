import type { ThreatModelProject, ModelNode, DataFlow, TrustBoundary } from '../shared/types/model'
import type { RuleCondition, AnalysisRule } from '../shared/types/analysis'

export interface EvaluationMatch {
  nodeIds: string[]
  flowIds: string[]
  boundaryIds: string[]
  rationale: string
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function evaluateCondition(condition: RuleCondition, obj: Record<string, unknown>): boolean {
  const value = getNestedValue(obj, condition.field)

  switch (condition.operator) {
    case 'equals':
      return value === condition.value
    case 'not-equals':
      return value !== condition.value
    case 'contains':
      if (Array.isArray(value)) return value.includes(condition.value)
      if (typeof value === 'string') return value.includes(String(condition.value))
      return false
    case 'not-contains':
      if (Array.isArray(value)) return !value.includes(condition.value)
      if (typeof value === 'string') return !value.includes(String(condition.value))
      return true
    case 'exists':
      return value !== undefined && value !== null
    case 'not-exists':
      return value === undefined || value === null
    case 'in':
      if (Array.isArray(condition.value)) return condition.value.includes(value)
      return false
    case 'not-in':
      if (Array.isArray(condition.value)) return !condition.value.includes(value)
      return true
    default:
      return false
  }
}

function evaluateConditions(
  conditions: RuleCondition[],
  logicOperator: 'and' | 'or',
  context: Record<string, Record<string, unknown>>
): boolean {
  const results = conditions.map((condition) => {
    const target = context[condition.target]
    if (!target) return false
    return evaluateCondition(condition, target)
  })

  return logicOperator === 'and' ? results.every(Boolean) : results.some(Boolean)
}

function buildRationale(rule: AnalysisRule, entityLabels: string[]): string {
  const affected = entityLabels.length > 0 ? entityLabels.join(', ') : 'model'
  return `Rule "${rule.name}" (${rule.id}) triggered on: ${affected}. ${rule.description}`
}

export function evaluateRule(rule: AnalysisRule, project: ThreatModelProject): EvaluationMatch[] {
  const matches: EvaluationMatch[] = []

  const hasNodeConditions = rule.conditions.some((c) => c.target === 'node')
  const hasFlowConditions = rule.conditions.some((c) => c.target === 'flow')
  const hasBoundaryConditions = rule.conditions.some((c) => c.target === 'boundary')

  // Node-targeted rules: check each applicable node
  if (hasNodeConditions && !hasFlowConditions) {
    for (const node of project.nodes) {
      if (rule.appliesTo?.nodeTypes && !rule.appliesTo.nodeTypes.includes(node.type)) {
        continue
      }

      const context: Record<string, Record<string, unknown>> = {
        node: node as unknown as Record<string, unknown>,
        model: project as unknown as Record<string, unknown>
      }

      if (evaluateConditions(rule.conditions, rule.logicOperator, context)) {
        matches.push({
          nodeIds: [node.id],
          flowIds: [],
          boundaryIds: [],
          rationale: buildRationale(rule, [node.label])
        })
      }
    }
  }

  // Flow-targeted rules: check each flow, also resolve source/target nodes
  if (hasFlowConditions) {
    const nodeMap = new Map(project.nodes.map((n) => [n.id, n]))

    for (const flow of project.flows) {
      const targetNode = nodeMap.get(flow.target)
      const sourceNode = nodeMap.get(flow.source)

      // If rule also has node conditions, check the target node type
      if (hasNodeConditions && rule.appliesTo?.nodeTypes) {
        const targetMatches = targetNode && rule.appliesTo.nodeTypes.includes(targetNode.type)
        const sourceMatches = sourceNode && rule.appliesTo.nodeTypes.includes(sourceNode.type)
        if (!targetMatches && !sourceMatches) continue
      }

      const context: Record<string, Record<string, unknown>> = {
        flow: flow as unknown as Record<string, unknown>,
        model: project as unknown as Record<string, unknown>
      }

      // Make target node available for node conditions in flow rules
      if (targetNode) {
        context.node = targetNode as unknown as Record<string, unknown>
      }

      if (evaluateConditions(rule.conditions, rule.logicOperator, context)) {
        const affectedNodes: string[] = []
        const labels: string[] = [flow.label]
        if (sourceNode) {
          affectedNodes.push(sourceNode.id)
          labels.push(sourceNode.label)
        }
        if (targetNode) {
          affectedNodes.push(targetNode.id)
          labels.push(targetNode.label)
        }

        matches.push({
          nodeIds: affectedNodes,
          flowIds: [flow.id],
          boundaryIds: [],
          rationale: buildRationale(rule, labels)
        })
      }
    }
  }

  // Boundary-targeted rules
  if (hasBoundaryConditions) {
    for (const boundary of project.boundaries) {
      if (
        rule.appliesTo?.boundaryTypes &&
        !rule.appliesTo.boundaryTypes.includes(boundary.type)
      ) {
        continue
      }

      const context: Record<string, Record<string, unknown>> = {
        boundary: boundary as unknown as Record<string, unknown>,
        model: project as unknown as Record<string, unknown>
      }

      if (evaluateConditions(rule.conditions, rule.logicOperator, context)) {
        matches.push({
          nodeIds: boundary.nodeIds,
          flowIds: [],
          boundaryIds: [boundary.id],
          rationale: buildRationale(rule, [boundary.label])
        })
      }
    }
  }

  return matches
}
