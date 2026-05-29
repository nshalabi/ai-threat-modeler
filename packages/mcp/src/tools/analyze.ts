/**
 * analyze_threat_model — the deterministic result. Validates the model, runs
 * the same core engine the desktop app uses, and returns the versioned public
 * result contract.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  modelInputShape,
  validateModelInput,
  errorReply,
  engine,
  ENGINE_NAME,
  SERVER_VERSION,
  KNOWLEDGE_PACK_VERSION,
  type ModelInput
} from '../common'
import { toPublicResult } from '../contract/result'

export function registerAnalyzeTool(server: McpServer): void {
  server.registerTool(
    'analyze_threat_model',
    {
      title: 'Analyze Threat Model',
      description: `Run the deterministic threat-analysis engine over a threat model and return findings. This is the core capability: the SAME rules engine the AI Threat Modeler desktop app uses — no LLM judgement, fully reproducible for a given model + knowledge-pack version.

Call validate_model first if you are unsure the model is well-formed; if the model is invalid this tool returns the validation errors instead of a result.

Args:
  - model (object): a complete, valid threat model.

Returns JSON (resultSchemaVersion "1.0" — a stable public contract):
{
  "resultSchemaVersion": "1.0",
  "engine": { "name": string, "version": string, "knowledgePackVersion": string },
  "analyzedAt": string,                 // ISO 8601
  "project": { "name", "componentCount", "flowCount", "boundaryCount" },
  "summary": { "total": number, "bySeverity": { "critical","high","medium","low","informational": number } },
  "findings": [ {
    "key": string,                      // stable identity across re-analyses
    "ruleId", "title", "severity", "category", "description", "rationale",
    "affectedComponents": string[],     // component labels
    "affectedFlows": string[],          // flow labels
    "frameworkReferences": [ { "framework","id","name","url"? } ],
    "mitigations": string[],
    "recommendation": string,
    "attackPath"?: { "chain": string[], "missingControl": string, "vulnerableTargetCount": number }
  } ]
}

A finding with an \`attackPath\` is a multi-hop chain: an untrusted source can reach a sensitive target along \`chain\` because \`missingControl\` is absent. An empty findings array means no rule fired (note: this reflects the modeled design, not a guarantee the real system is secure).`,
      inputSchema: modelInputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ model }: ModelInput) => {
      const outcome = validateModelInput(model)
      if (!outcome.valid) {
        return errorReply(
          'Model is invalid; cannot analyze. Fix these errors (or call ' +
            'validate_model) and retry:\n' +
            outcome.errors.map((e) => `  - ${e}`).join('\n')
        )
      }

      const result = engine.analysisEngine.analyze(outcome.project!)
      const output = toPublicResult(outcome.project!, result, {
        engineName: ENGINE_NAME,
        engineVersion: SERVER_VERSION,
        knowledgePackVersion: KNOWLEDGE_PACK_VERSION
      })

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: output as unknown as Record<string, unknown>
      }
    }
  )
}
