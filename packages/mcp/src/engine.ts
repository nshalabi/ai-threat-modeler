/**
 * Builds a ready-to-use analysis engine from the built-in knowledge packs.
 *
 * This mirrors exactly what the GUI does in Toolbar.handleRunAnalysis — same
 * core, same packs, same rules — so the MCP server is byte-for-byte equivalent
 * to the desktop app's deterministic analysis. Kept as its own module so the
 * CLI (#7) can reuse the identical construction.
 */
import {
  KnowledgeEngine,
  AnalysisEngine,
  loadBuiltinPacks,
  type AnalysisRule,
  type KnowledgePack
} from '@core'

export interface BuiltEngine {
  knowledgeEngine: KnowledgeEngine
  analysisEngine: AnalysisEngine
  pack: KnowledgePack
  rules: AnalysisRule[]
}

export function buildEngine(): BuiltEngine {
  const knowledgeEngine = new KnowledgeEngine()
  const { pack, rules } = loadBuiltinPacks()
  knowledgeEngine.loadPack(pack)

  const analysisEngine = new AnalysisEngine(knowledgeEngine)
  analysisEngine.loadRules(rules)

  return { knowledgeEngine, analysisEngine, pack, rules }
}
