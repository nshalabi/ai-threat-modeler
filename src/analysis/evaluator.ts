import type { ThreatModelProject, ModelNode, DataFlow, TrustBoundary } from '../shared/types/model'
import type {
  RuleCondition,
  AnalysisRule,
  ConditionTrace,
  FindingDerivation
} from '../shared/types/analysis'

export interface EvaluationMatch {
  nodeIds: string[]
  flowIds: string[]
  boundaryIds: string[]
  rationale: string
  derivation: FindingDerivation
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

function evaluateCondition(
  condition: RuleCondition,
  obj: Record<string, unknown>
): { passed: boolean; actual: unknown } {
  const value = getNestedValue(obj, condition.field)

  let passed: boolean
  switch (condition.operator) {
    case 'equals':
      passed = value === condition.value
      break
    case 'not-equals':
      passed = value !== condition.value
      break
    case 'contains':
      if (Array.isArray(value)) passed = value.includes(condition.value)
      else if (typeof value === 'string') passed = value.includes(String(condition.value))
      else passed = false
      break
    case 'not-contains':
      if (Array.isArray(value)) passed = !value.includes(condition.value)
      else if (typeof value === 'string') passed = !value.includes(String(condition.value))
      else passed = true
      break
    case 'exists':
      passed = value !== undefined && value !== null
      break
    case 'not-exists':
      passed = value === undefined || value === null
      break
    case 'in':
      passed = Array.isArray(condition.value) ? condition.value.includes(value) : false
      break
    case 'not-in':
      passed = Array.isArray(condition.value) ? !condition.value.includes(value) : true
      break
    default:
      passed = false
  }

  return { passed, actual: value }
}

interface ConditionsResult {
  passed: boolean
  traces: ConditionTrace[]
}

function evaluateConditions(
  conditions: RuleCondition[],
  logicOperator: 'and' | 'or',
  context: Record<string, Record<string, unknown>>
): ConditionsResult {
  const traces: ConditionTrace[] = conditions.map((condition) => {
    const target = context[condition.target]
    if (!target) {
      return {
        target: condition.target,
        field: condition.field,
        operator: condition.operator,
        expected: condition.value,
        actual: undefined,
        passed: false
      }
    }
    const { passed, actual } = evaluateCondition(condition, target)
    return {
      target: condition.target,
      field: condition.field,
      operator: condition.operator,
      expected: condition.value,
      actual,
      passed
    }
  })

  const passed =
    logicOperator === 'and' ? traces.every((t) => t.passed) : traces.some((t) => t.passed)

  return { passed, traces }
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

      const result = evaluateConditions(rule.conditions, rule.logicOperator, context)
      if (result.passed) {
        matches.push({
          nodeIds: [node.id],
          flowIds: [],
          boundaryIds: [],
          rationale: buildRationale(rule, [node.label]),
          derivation: { logicOperator: rule.logicOperator, conditions: result.traces }
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

      const result = evaluateConditions(rule.conditions, rule.logicOperator, context)
      if (result.passed) {
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
          rationale: buildRationale(rule, labels),
          derivation: { logicOperator: rule.logicOperator, conditions: result.traces }
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

      const result = evaluateConditions(rule.conditions, rule.logicOperator, context)
      if (result.passed) {
        matches.push({
          nodeIds: boundary.nodeIds,
          flowIds: [],
          boundaryIds: [boundary.id],
          rationale: buildRationale(rule, [boundary.label]),
          derivation: { logicOperator: rule.logicOperator, conditions: result.traces }
        })
      }
    }
  }

  return matches
}
