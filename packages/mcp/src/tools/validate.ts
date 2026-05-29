/**
 * validate_model — check a threat model against the canonical schema and
 * return actionable, path-qualified errors so the agent can self-correct
 * before calling analyze_threat_model.
 */
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { modelInputShape, validateModelInput, type ModelInput } from '../common'

export function registerValidateTool(server: McpServer): void {
  server.registerTool(
    'validate_model',
    {
      title: 'Validate Threat Model',
      description: `Validate a threat model against the canonical schema WITHOUT running analysis. Use this while building a model to catch structural problems early.

Checks: required fields, valid component/boundary/data-classification enum values, well-formed nodes/flows/boundaries, and flow source/target references.

Args:
  - model (object): the threat model to validate (see list_component_types for valid \`type\` values).

Returns JSON: {
  "valid": boolean,
  "errors": string[],              // path-qualified messages, e.g. "nodes.0.type: Invalid enum value"
  "summary": {                     // present only when valid
    "componentCount": number,
    "flowCount": number,
    "boundaryCount": number
  }
}

When valid is false, fix each listed error and call validate_model again. When valid is true, call analyze_threat_model.`,
      inputSchema: modelInputShape,
      outputSchema: {
        valid: z.boolean(),
        errors: z.array(z.string()),
        summary: z
          .object({
            componentCount: z.number(),
            flowCount: z.number(),
            boundaryCount: z.number()
          })
          .optional()
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ model }: ModelInput) => {
      const outcome = validateModelInput(model)
      const output = outcome.valid
        ? {
            valid: true,
            errors: [],
            summary: {
              componentCount: outcome.project!.nodes.length,
              flowCount: outcome.project!.flows.length,
              boundaryCount: outcome.project!.boundaries.length
            }
          }
        : { valid: false, errors: outcome.errors }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      }
    }
  )
}
