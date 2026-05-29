/**
 * Shared building blocks for the tool handlers.
 *
 * The engine is built ONCE at module load. The server is stateless with
 * respect to the threat model (the agent holds the model in its own context
 * and passes it on every call); the only thing cached here is the immutable
 * knowledge engine + rule set, which is identical for every request.
 */
import { z } from 'zod'
import { validateProject } from '@core'
import type { ThreatModelProject } from '@shared/types/model'
import { buildEngine } from './engine'

export const SERVER_NAME = 'ai-threat-modeler-mcp'
export const SERVER_VERSION = __SERVER_VERSION__
export const ENGINE_NAME = 'AI Threat Modeler'

/** Built once; reused by every request. */
export const engine = buildEngine()

/** Knowledge pack version — the reproducibility-relevant signal. */
export const KNOWLEDGE_PACK_VERSION = engine.pack.version

/** Max characters for a tool's text payload before we warn. */
export const CHARACTER_LIMIT = 50000

/**
 * The model input field, shared by validate_model and analyze_threat_model.
 * Kept loose on purpose: the canonical zod schema (`validateProject`) runs
 * INSIDE the handler so both tools return the same friendly, path-qualified
 * error list instead of the client rejecting malformed input before our code
 * can explain what's wrong.
 */
export const modelInputShape = {
  model: z
    .record(z.unknown())
    .describe(
      "A complete threat model object (the .aitm structure): " +
        "{ version: '1.0', id, name, description, createdAt, updatedAt, " +
        'nodes[], flows[], boundaries[], notes[], dispositions[] }. ' +
        'Use list_component_types / list_rules to learn the vocabulary, and ' +
        'validate_model to check the structure before analyzing.'
    )
} as const

export type ModelInput = { model: Record<string, unknown> }

export interface ValidationOutcome {
  valid: boolean
  project: ThreatModelProject | null
  errors: string[]
}

/** Run the canonical project schema and normalize the outcome. */
export function validateModelInput(model: unknown): ValidationOutcome {
  const result = validateProject(model)
  if (Array.isArray(result)) {
    return { valid: false, project: null, errors: result }
  }
  return { valid: true, project: result as unknown as ThreatModelProject, errors: [] }
}

/** A standard MCP error reply (text + isError flag). */
export function errorReply(message: string): {
  content: { type: 'text'; text: string }[]
  isError: true
} {
  return { content: [{ type: 'text', text: message }], isError: true }
}
