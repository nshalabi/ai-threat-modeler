import type { KnowledgePack, Threat, Control, Mitigation } from '../shared/types/knowledge'
import type { AnalysisRule } from '../shared/types/analysis'
import { validateKnowledgePack } from '../shared/schemas/knowledge-pack-schema'

import basePack from './packs/base/pack.json'
import baseThreats from './packs/base/threats.json'
import baseControls from './packs/base/controls.json'
import baseMitigations from './packs/base/mitigations.json'
import baseRules from './packs/base/rules.json'

export function loadPackFromJSON(data: unknown): KnowledgePack {
  const result = validateKnowledgePack(data)
  if (Array.isArray(result)) {
    throw new Error(`Invalid knowledge pack:\n${result.join('\n')}`)
  }
  return result
}

export function loadBuiltinPacks(): { pack: KnowledgePack; rules: AnalysisRule[] } {
  const pack: KnowledgePack = {
    ...basePack,
    threats: baseThreats as unknown as Threat[],
    weaknesses: [],
    controls: baseControls as unknown as Control[],
    mitigations: baseMitigations as unknown as Mitigation[]
  }

  return {
    pack,
    rules: baseRules as unknown as AnalysisRule[]
  }
}
