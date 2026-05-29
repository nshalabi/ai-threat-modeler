/**
 * Headless core — the deterministic analysis engine and its result emitters.
 *
 * Adapter-free: no React, no DOM, no Electron. This is the single documented
 * entry point shared by every consumer — the GUI renderer, the CLI (#7), and
 * the MCP server (#11). Anything importable here runs unchanged in a browser,
 * in Electron, or in a plain Node process.
 *
 * Boundary: the core covers knowledge packs, rule evaluation, attack-path
 * traversal, disposition resolution, and report building. It does NOT cover
 * the project lifecycle UI (canvas, stores) — those live in the renderer.
 */

// --- Knowledge engine ---
export { KnowledgeEngine } from '../knowledge/engine'
export { loadBuiltinPacks, loadPackFromJSON } from '../knowledge/loader'

// --- Analysis engine ---
export { AnalysisEngine } from '../analysis/engine'
export {
  evaluateRule,
  findControlFreePaths,
  probePathsToNode,
  describeControl,
  UNTRUSTED_SOURCE_TYPES,
  CONTROL_NODE_TYPES,
  ASSET_TARGET_TYPES,
  type EvaluationMatch,
  type FoundPath
} from '../analysis/evaluator'

// --- Disposition resolution (#6) ---
export {
  findingKey,
  findingKeyOf,
  resolveDisposition,
  hasDisposition,
  type ResolvedDisposition
} from '../analysis/disposition'

// --- Report building / emitters ---
export {
  buildReportData,
  type ReportData,
  type ReportFinding,
  type ReportDispositionEntry
} from '../reports/report-data'
export { generatePdfReport } from '../reports/pdf-report'
export { generateDocxReport } from '../reports/docx-report'
export { generateCsvReport } from '../reports/csv-report'

// --- Schemas ---
export { validateProject } from '../shared/schemas/project-schema'
export { validateKnowledgePack } from '../shared/schemas/knowledge-pack-schema'

// --- Domain types ---
export type * from '../shared/types/model'
export type * from '../shared/types/analysis'
export type * from '../shared/types/knowledge'
