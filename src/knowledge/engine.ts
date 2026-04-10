import type {
  KnowledgePack,
  Threat,
  Weakness,
  Control,
  Mitigation,
  FrameworkReference,
} from '../shared/types/knowledge'

export class KnowledgeEngine {
  private packs: KnowledgePack[] = []

  // Internal indexes for fast lookups
  private threatIndex = new Map<string, Threat>()
  private weaknessIndex = new Map<string, Weakness>()
  private controlIndex = new Map<string, Control>()
  private mitigationIndex = new Map<string, Mitigation>()

  // Reverse indexes
  private threatToMitigations = new Map<string, string[]>()
  private mitigationToThreats = new Map<string, string[]>()

  loadPack(pack: KnowledgePack): void {
    this.packs.push(pack)
    this.buildIndexes(pack)
  }

  getLoadedPacks(): KnowledgePack[] {
    return [...this.packs]
  }

  getThreat(id: string): Threat | undefined {
    return this.threatIndex.get(id)
  }

  getControl(id: string): Control | undefined {
    return this.controlIndex.get(id)
  }

  getMitigation(id: string): Mitigation | undefined {
    return this.mitigationIndex.get(id)
  }

  getWeakness(id: string): Weakness | undefined {
    return this.weaknessIndex.get(id)
  }

  getThreatsForMitigation(mitigationId: string): Threat[] {
    const threatIds = this.mitigationToThreats.get(mitigationId) ?? []
    return threatIds
      .map((id) => this.threatIndex.get(id))
      .filter((t): t is Threat => t !== undefined)
  }

  getMitigationsForThreat(threatId: string): Mitigation[] {
    const mitigationIds = this.threatToMitigations.get(threatId) ?? []
    return mitigationIds
      .map((id) => this.mitigationIndex.get(id))
      .filter((m): m is Mitigation => m !== undefined)
  }

  getFrameworkRefsForThreat(threatId: string): FrameworkReference[] {
    const threat = this.threatIndex.get(threatId)
    return threat ? [...threat.frameworkRefs] : []
  }

  searchThreats(query: string): Threat[] {
    const lower = query.toLowerCase()
    const results: Threat[] = []
    this.threatIndex.forEach((threat) => {
      if (
        threat.name.toLowerCase().includes(lower) ||
        threat.description.toLowerCase().includes(lower)
      ) {
        results.push(threat)
      }
    })
    return results
  }

  clear(): void {
    this.packs = []
    this.threatIndex.clear()
    this.weaknessIndex.clear()
    this.controlIndex.clear()
    this.mitigationIndex.clear()
    this.threatToMitigations.clear()
    this.mitigationToThreats.clear()
  }

  private buildIndexes(pack: KnowledgePack): void {
    for (const threat of pack.threats) {
      this.threatIndex.set(threat.id, threat)

      // Build threat -> mitigations mapping
      if (threat.mitigationIds.length > 0) {
        const existing = this.threatToMitigations.get(threat.id) ?? []
        this.threatToMitigations.set(threat.id, [
          ...existing,
          ...threat.mitigationIds,
        ])
      }

      // Build reverse: mitigation -> threats
      for (const mitId of threat.mitigationIds) {
        const existing = this.mitigationToThreats.get(mitId) ?? []
        if (!existing.includes(threat.id)) {
          this.mitigationToThreats.set(mitId, [...existing, threat.id])
        }
      }
    }

    for (const weakness of pack.weaknesses) {
      this.weaknessIndex.set(weakness.id, weakness)
    }

    for (const control of pack.controls) {
      this.controlIndex.set(control.id, control)
    }

    for (const mitigation of pack.mitigations) {
      this.mitigationIndex.set(mitigation.id, mitigation)
    }
  }
}
