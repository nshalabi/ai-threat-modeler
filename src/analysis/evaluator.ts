import type { ThreatModelProject, ModelNode, DataFlow, TrustBoundary } from '../shared/types/model'
import type {
  RuleCondition,
  AnalysisRule,
  ConditionTrace,
  FindingDerivation,
  PathPattern
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

const DEFAULT_MAX_HOPS = 12

/** All conditions must pass for the object to "match" (AND within a group). */
function matchesAll(
  conditions: RuleCondition[],
  contexts: Record<string, Record<string, unknown> | undefined>
): boolean {
  return conditions.every((c) => {
    const obj = contexts[c.target]
    if (!obj) return false
    return evaluateCondition(c, obj).passed
  })
}

export interface FoundPath {
  sourceId: string
  targetId: string
  nodeIds: string[]
  flowIds: string[]
}

export function describeControl(pp: PathPattern): string {
  return pp.without && pp.without.length > 0
    ? pp.without
        .map((c) => `${c.target}.${c.field} ${c.operator} ${String(c.value ?? '')}`.trim())
        .join(' / ')
    : 'none'
}

/**
 * Core multi-hop search. Existential over simple paths: returns the shortest
 * control-free path to each distinct reachable target node. Shared by rule
 * evaluation and the Attack-path probe so both use one implementation.
 */
export function findControlFreePaths(
  project: ThreatModelProject,
  pp: PathPattern
): FoundPath[] {
  const maxHops = pp.maxHops ?? DEFAULT_MAX_HOPS
  const nodeMap = new Map(project.nodes.map((n) => [n.id, n]))
  const model = project as unknown as Record<string, unknown>

  const nodeCtx = (id: string): Record<string, Record<string, unknown>> => ({
    node: nodeMap.get(id) as unknown as Record<string, unknown>,
    model
  })
  const isFrom = (id: string): boolean => matchesAll(pp.from, nodeCtx(id))
  const isTo = (id: string): boolean => matchesAll(pp.to, nodeCtx(id))
  const isControl = (id: string): boolean =>
    !!pp.without && pp.without.length > 0 && matchesAll(pp.without, nodeCtx(id))

  const adj = new Map<string, Array<{ flowId: string; to: string }>>()
  for (const f of project.flows) {
    if (pp.edge && pp.edge.length > 0) {
      const ok = matchesAll(pp.edge, {
        flow: f as unknown as Record<string, unknown>,
        model
      })
      if (!ok) continue
    }
    if (!adj.has(f.source)) adj.set(f.source, [])
    adj.get(f.source)!.push({ flowId: f.id, to: f.target })
  }

  const fromNodes = project.nodes.filter((n) => isFrom(n.id) && !isControl(n.id))
  if (fromNodes.length === 0) return []

  interface QItem { id: string; nodes: string[]; flows: string[] }
  const queue: QItem[] = fromNodes.map((n) => ({ id: n.id, nodes: [n.id], flows: [] }))
  const visited = new Set<string>(fromNodes.map((n) => n.id))
  const targetPaths = new Map<string, QItem>()

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.flows.length >= maxHops) continue
    for (const edge of adj.get(cur.id) ?? []) {
      if (visited.has(edge.to)) continue
      if (isControl(edge.to)) continue
      const next: QItem = {
        id: edge.to,
        nodes: [...cur.nodes, edge.to],
        flows: [...cur.flows, edge.flowId]
      }
      if (isTo(edge.to) && !targetPaths.has(edge.to)) {
        targetPaths.set(edge.to, next)
      }
      visited.add(edge.to)
      queue.push(next)
    }
  }

  return [...targetPaths.values()].map((p) => ({
    sourceId: p.nodes[0],
    targetId: p.nodes[p.nodes.length - 1],
    nodeIds: p.nodes,
    flowIds: p.flows
  }))
}

/** Untrusted source component types used by the Attack-path probe. */
export const UNTRUSTED_SOURCE_TYPES = [
  'external-actor',
  'prompt-input',
  'external-knowledge-source',
  'dataset-source',
  'document-ingestion-pipeline'
]

/** Control component types whose presence on a path breaks the chain. */
export const CONTROL_NODE_TYPES = [
  'guardrail',
  'moderation-layer',
  'human-in-the-loop',
  'evaluation-engine',
  'output-post-processor'
]

/**
 * Asset / sink component types that are meaningful Attack-path probe
 * targets — things an attacker would want to reach. Mirrors the `to`
 * vocabulary used by the path rules.
 */
export const ASSET_TARGET_TYPES = [
  'llm',
  'hosted-model-api',
  'self-hosted-model',
  'embedding-model',
  'vector-db',
  'memory-store',
  'tool-connector',
  'plugin',
  'database',
  'object-storage',
  'secrets-vault',
  'model-registry',
  'fine-tuning-pipeline',
  'training-data-repo',
  'feature-store',
  'backend-service'
]

/**
 * Attack-path probe: every shortest control-free path from any untrusted
 * source to the given target node. One path per reachable source, sorted
 * shortest-first. Reuses findControlFreePaths per source.
 */
export function probePathsToNode(
  project: ThreatModelProject,
  targetNodeId: string,
  maxHops = DEFAULT_MAX_HOPS
): FoundPath[] {
  const results: FoundPath[] = []
  for (const src of project.nodes) {
    if (!UNTRUSTED_SOURCE_TYPES.includes(src.type)) continue
    if (src.id === targetNodeId) continue
    const found = findControlFreePaths(project, {
      from: [{ target: 'node', field: 'id', operator: 'equals', value: src.id }],
      to: [{ target: 'node', field: 'id', operator: 'equals', value: targetNodeId }],
      without: [
        { target: 'node', field: 'type', operator: 'in', value: CONTROL_NODE_TYPES }
      ],
      maxHops
    })
    const hit = found.find((p) => p.targetId === targetNodeId)
    if (hit) results.push(hit)
  }
  return results.sort((a, b) => a.nodeIds.length - b.nodeIds.length)
}

/**
 * Multi-hop rule evaluation: emit one match per vulnerable target node,
 * evidenced by the shortest control-free path to it.
 */
function evaluatePathRule(
  rule: AnalysisRule,
  project: ThreatModelProject
): EvaluationMatch[] {
  const pp = rule.pathPattern
  if (!pp) return []

  const paths = findControlFreePaths(project, pp)
  if (paths.length === 0) return []

  const nodeMap = new Map(project.nodes.map((n) => [n.id, n]))
  const controlDesc = describeControl(pp)

  return paths.map((p) => {
    const labels = p.nodeIds.map((id) => nodeMap.get(id)?.label ?? id)
    return {
      nodeIds: p.nodeIds,
      flowIds: p.flowIds,
      boundaryIds: [],
      rationale: `Rule "${rule.name}" (${rule.id}) found an attack path: ${labels.join(' -> ')}. No control node (${controlDesc}) on this path. ${rule.description}`,
      derivation: {
        logicOperator: 'and' as const,
        conditions: [],
        path: {
          nodeIds: p.nodeIds,
          flowIds: p.flowIds,
          missingControl: controlDesc,
          vulnerableTargetCount: paths.length
        }
      }
    }
  })
}

export function evaluateRule(rule: AnalysisRule, project: ThreatModelProject): EvaluationMatch[] {
  if (rule.pathPattern) {
    return evaluatePathRule(rule, project)
  }

  const matches: EvaluationMatch[] = []
  const conditions = rule.conditions ?? []
  const logicOperator = rule.logicOperator ?? 'and'

  const hasNodeConditions = conditions.some((c) => c.target === 'node')
  const hasFlowConditions = conditions.some((c) => c.target === 'flow')
  const hasBoundaryConditions = conditions.some((c) => c.target === 'boundary')

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

      const result = evaluateConditions(conditions, logicOperator, context)
      if (result.passed) {
        matches.push({
          nodeIds: [node.id],
          flowIds: [],
          boundaryIds: [],
          rationale: buildRationale(rule, [node.label]),
          derivation: { logicOperator, conditions: result.traces }
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

      const result = evaluateConditions(conditions, logicOperator, context)
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
          derivation: { logicOperator, conditions: result.traces }
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

      const result = evaluateConditions(conditions, logicOperator, context)
      if (result.passed) {
        matches.push({
          nodeIds: boundary.nodeIds,
          flowIds: [],
          boundaryIds: [boundary.id],
          rationale: buildRationale(rule, [boundary.label]),
          derivation: { logicOperator, conditions: result.traces }
        })
      }
    }
  }

  return matches
}
