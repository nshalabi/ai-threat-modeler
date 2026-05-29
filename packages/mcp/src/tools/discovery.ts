/**
 * Discovery tools — teach the agent the engine's vocabulary so it can extract
 * a well-formed threat model from arbitrary input (requirements, designs,
 * code). All read-only, no input.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { COMPONENT_LIBRARY, BOUNDARY_LIBRARY } from '@core'
import { engine } from '../common'

const READONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const

function jsonReply(payload: unknown) {
  const output = payload as Record<string, unknown>
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
    structuredContent: output
  }
}

export function registerDiscoveryTools(server: McpServer): void {
  server.registerTool(
    'list_component_types',
    {
      title: 'List Component Types',
      description: `List every component (node) type the modeling vocabulary supports, with a description, its category (standard infrastructure vs AI-specific), and the default security properties.

Use this FIRST when extracting a threat model from a requirements doc, design, or codebase — it tells you which node \`type\` values are valid and what properties (e.g. internetFacing, hasInputValidation, hasRBAC, dataClassification) the engine reasons about.

Input: none.

Returns JSON: { total: number, componentTypes: [ { type, label, category, description, defaultProperties } ] }`,
      inputSchema: {},
      annotations: READONLY
    },
    async () => {
      const componentTypes = COMPONENT_LIBRARY.map((c) => ({
        type: c.type,
        label: c.label,
        category: c.category,
        description: c.description,
        defaultProperties: c.defaultProperties
      }))
      return jsonReply({ total: componentTypes.length, componentTypes })
    }
  )

  server.registerTool(
    'list_boundary_types',
    {
      title: 'List Trust Boundary Types',
      description: `List the trust-boundary types used to group components into security zones (e.g. public-internet, cloud-tenant, model-provider, sensitive-data-zone).

Input: none.

Returns JSON: { total: number, boundaryTypes: [ { type, label, description } ] }`,
      inputSchema: {},
      annotations: READONLY
    },
    async () => {
      const boundaryTypes = BOUNDARY_LIBRARY.map((b) => ({
        type: b.type,
        label: b.label,
        description: b.description
      }))
      return jsonReply({ total: boundaryTypes.length, boundaryTypes })
    }
  )

  server.registerTool(
    'list_rules',
    {
      title: 'List Analysis Rules',
      description: `List the deterministic analysis rules the engine evaluates. Each rule is either single-component (matches one node/flow) or an attack-path rule (matches a multi-hop chain through the graph).

Use this to understand what the engine can detect, so you can model the parts of the system that matter. The engine is deterministic — these rules, not an LLM, decide the findings.

Input: none.

Returns JSON: { total: number, rules: [ { id, name, severity, category, kind: 'single-component' | 'attack-path', description, recommendation } ] }`,
      inputSchema: {},
      annotations: READONLY
    },
    async () => {
      const rules = engine.rules.map((r) => ({
        id: r.id,
        name: r.name,
        severity: r.severity,
        category: r.category,
        kind: r.pathPattern ? ('attack-path' as const) : ('single-component' as const),
        description: r.description,
        recommendation: r.recommendation
      }))
      return jsonReply({ total: rules.length, rules })
    }
  )

  server.registerTool(
    'list_frameworks',
    {
      title: 'List Referenced Frameworks',
      description: `List the external security frameworks the knowledge pack maps findings to (e.g. MITRE ATLAS, OWASP LLM Top 10, OWASP ML Top 10, NIST AI RMF, NIST CSF), with how many threat references each has.

Input: none.

Returns JSON: { total: number, frameworks: [ { framework, referenceCount } ] }`,
      inputSchema: {},
      annotations: READONLY
    },
    async () => {
      const counts = new Map<string, number>()
      for (const threat of engine.pack.threats) {
        for (const ref of threat.frameworkRefs) {
          counts.set(ref.framework, (counts.get(ref.framework) ?? 0) + 1)
        }
      }
      const frameworks = [...counts.entries()]
        .map(([framework, referenceCount]) => ({ framework, referenceCount }))
        .sort((a, b) => b.referenceCount - a.referenceCount)
      return jsonReply({ total: frameworks.length, frameworks })
    }
  )
}
