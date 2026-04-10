import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type {
  ThreatModelProject,
  ModelNode,
  DataFlow,
  TrustBoundary,
  ComponentType,
  DataFlowProperties,
  BoundaryType,
  Note,
  NoteCategory
} from '@shared/types/model'
import type { Finding } from '@shared/types/analysis'
import type { Severity } from '@shared/types/knowledge'
import { COMPONENT_MAP } from '@shared/constants/component-library'

interface ProjectState {
  // Project data
  project: ThreatModelProject
  findings: Finding[]
  filePath: string | null
  isDirty: boolean

  // Selected element
  selectedNodeId: string | null
  selectedFlowId: string | null

  // Active panel
  activePanel: 'properties' | 'findings' | 'notes' | null

  // Currently selected finding (drives canvas highlight)
  selectedFindingId: string | null

  // Highlight overlay for canvas (driven by selected finding or high-risk-path)
  highlightedNodeIds: string[]
  highlightedFlowIds: string[]
  highlightSeverity: Severity | null

  // Full-screen canvas mode
  isFullScreen: boolean

  // About dialog visibility
  showAbout: boolean

  // Actions
  newProject: (name: string, description?: string) => void
  setProject: (project: ThreatModelProject, path?: string) => void

  addNode: (type: ComponentType, position: { x: number; y: number }, label?: string) => string
  updateNode: (id: string, updates: Partial<ModelNode>) => void
  removeNode: (id: string) => void
  updateNodePosition: (id: string, position: { x: number; y: number }) => void

  addFlow: (source: string, target: string, label?: string) => string
  updateFlow: (id: string, updates: Partial<DataFlow>) => void
  removeFlow: (id: string) => void

  addBoundary: (type: BoundaryType, label: string, nodeIds: string[]) => string
  updateBoundary: (id: string, updates: Partial<TrustBoundary>) => void
  removeBoundary: (id: string) => void

  addNote: (content: string, category: NoteCategory, linkedTo?: { nodeId?: string; flowId?: string; boundaryId?: string }) => string
  updateNote: (id: string, updates: Partial<Pick<Note, 'content' | 'category'>>) => void
  removeNote: (id: string) => void

  selectNode: (id: string | null) => void
  selectFlow: (id: string | null) => void
  setActivePanel: (panel: 'properties' | 'findings' | 'notes' | null) => void

  setFindings: (findings: Finding[]) => void

  selectFinding: (findingId: string | null) => void
  showHighRiskPath: () => void
  clearHighlight: () => void

  toggleFullScreen: () => void
  setShowAbout: (show: boolean) => void

  markClean: () => void
}

function createEmptyProject(name: string, description = ''): ThreatModelProject {
  const now = new Date().toISOString()
  return {
    version: '1.0',
    id: nanoid(),
    name,
    description,
    createdAt: now,
    updatedAt: now,
    nodes: [],
    flows: [],
    boundaries: [],
    notes: []
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createEmptyProject('Untitled Project'),
  findings: [],
  filePath: null,
  isDirty: false,
  selectedNodeId: null,
  selectedFlowId: null,
  activePanel: null,
  selectedFindingId: null,
  highlightedNodeIds: [],
  highlightedFlowIds: [],
  highlightSeverity: null,
  isFullScreen: false,
  showAbout: false,

  newProject: (name: string, description?: string) => {
    set({
      project: createEmptyProject(name, description),
      findings: [],
      filePath: null,
      isDirty: false,
      selectedNodeId: null,
      selectedFlowId: null
    })
  },

  setProject: (project: ThreatModelProject, path?: string) => {
    set({
      project,
      filePath: path ?? null,
      isDirty: false,
      selectedNodeId: null,
      selectedFlowId: null,
      findings: []
    })
  },

  addNode: (type: ComponentType, position: { x: number; y: number }, label?: string) => {
    const id = nanoid()
    const definition = COMPONENT_MAP[type]
    const node: ModelNode = {
      id,
      type,
      label: label ?? definition?.label ?? type,
      position,
      properties: { ...(definition?.defaultProperties ?? {}) }
    }

    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        nodes: [...state.project.nodes, node]
      },
      isDirty: true
    }))

    return id
  },

  updateNode: (id: string, updates: Partial<ModelNode>) => {
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        nodes: state.project.nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                ...updates,
                properties: updates.properties
                  ? { ...node.properties, ...updates.properties }
                  : node.properties
              }
            : node
        )
      },
      isDirty: true
    }))
  },

  removeNode: (id: string) => {
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        nodes: state.project.nodes.filter((n) => n.id !== id),
        flows: state.project.flows.filter((f) => f.source !== id && f.target !== id),
        boundaries: state.project.boundaries.map((b) => ({
          ...b,
          nodeIds: b.nodeIds.filter((nid) => nid !== id)
        })),
        notes: state.project.notes.filter((n) => n.linkedNodeId !== id)
      },
      isDirty: true,
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    }))
  },

  updateNodePosition: (id: string, position: { x: number; y: number }) => {
    set((state) => ({
      project: {
        ...state.project,
        nodes: state.project.nodes.map((node) =>
          node.id === id ? { ...node, position } : node
        )
      },
      isDirty: true
    }))
  },

  addFlow: (source: string, target: string, label?: string) => {
    const id = nanoid()
    const flow: DataFlow = {
      id,
      source,
      target,
      label: label ?? 'Data Flow',
      properties: {
        encrypted: false,
        authenticated: false,
        dataClassification: 'internal',
        dataTypes: ['general']
      }
    }

    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        flows: [...state.project.flows, flow]
      },
      isDirty: true
    }))

    return id
  },

  updateFlow: (id: string, updates: Partial<DataFlow>) => {
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        flows: state.project.flows.map((flow) =>
          flow.id === id
            ? {
                ...flow,
                ...updates,
                properties: updates.properties
                  ? { ...flow.properties, ...updates.properties }
                  : flow.properties
              }
            : flow
        )
      },
      isDirty: true
    }))
  },

  removeFlow: (id: string) => {
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        flows: state.project.flows.filter((f) => f.id !== id),
        notes: state.project.notes.filter((n) => n.linkedFlowId !== id)
      },
      isDirty: true,
      selectedFlowId: state.selectedFlowId === id ? null : state.selectedFlowId
    }))
  },

  addBoundary: (type: BoundaryType, label: string, nodeIds: string[]) => {
    const id = nanoid()
    const boundary: TrustBoundary = {
      id,
      type,
      label,
      nodeIds
    }

    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        boundaries: [...state.project.boundaries, boundary]
      },
      isDirty: true
    }))

    return id
  },

  updateBoundary: (id: string, updates: Partial<TrustBoundary>) => {
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        boundaries: state.project.boundaries.map((b) =>
          b.id === id ? { ...b, ...updates } : b
        )
      },
      isDirty: true
    }))
  },

  removeBoundary: (id: string) => {
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        boundaries: state.project.boundaries.filter((b) => b.id !== id)
      },
      isDirty: true
    }))
  },

  addNote: (content: string, category: NoteCategory, linkedTo?: { nodeId?: string; flowId?: string; boundaryId?: string }) => {
    const id = nanoid()
    const now = new Date().toISOString()
    const note: Note = {
      id,
      content,
      category,
      createdAt: now,
      updatedAt: now,
      linkedNodeId: linkedTo?.nodeId,
      linkedFlowId: linkedTo?.flowId,
      linkedBoundaryId: linkedTo?.boundaryId
    }

    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        notes: [...state.project.notes, note]
      },
      isDirty: true
    }))

    return id
  },

  updateNote: (id: string, updates: Partial<Pick<Note, 'content' | 'category'>>) => {
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        notes: state.project.notes.map((note) =>
          note.id === id
            ? { ...note, ...updates, updatedAt: new Date().toISOString() }
            : note
        )
      },
      isDirty: true
    }))
  },

  removeNote: (id: string) => {
    set((state) => ({
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
        notes: state.project.notes.filter((n) => n.id !== id)
      },
      isDirty: true
    }))
  },

  selectNode: (id: string | null) => {
    set({
      selectedNodeId: id,
      selectedFlowId: null,
      activePanel: id ? 'properties' : null
    })
  },

  selectFlow: (id: string | null) => {
    set({
      selectedFlowId: id,
      selectedNodeId: null,
      activePanel: id ? 'properties' : null
    })
  },

  setActivePanel: (panel: 'properties' | 'findings' | 'notes' | null) => {
    set({ activePanel: panel })
  },

  setFindings: (findings: Finding[]) => {
    set({
      findings,
      selectedFindingId: null,
      highlightedNodeIds: [],
      highlightedFlowIds: [],
      highlightSeverity: null
    })
  },

  selectFinding: (findingId: string | null) => {
    if (!findingId) {
      set({
        selectedFindingId: null,
        highlightedNodeIds: [],
        highlightedFlowIds: [],
        highlightSeverity: null
      })
      return
    }
    const finding = get().findings.find((f) => f.id === findingId)
    if (!finding) return
    set({
      selectedFindingId: findingId,
      highlightedNodeIds: finding.affectedNodeIds,
      highlightedFlowIds: finding.affectedFlowIds,
      highlightSeverity: finding.severity
    })
  },

  showHighRiskPath: () => {
    const { findings } = get()
    if (findings.length === 0) return

    // Take all critical + high findings; if none, fall back to medium.
    const ranked = findings.filter((f) => f.severity === 'critical' || f.severity === 'high')
    const target = ranked.length > 0 ? ranked : findings.filter((f) => f.severity === 'medium')
    if (target.length === 0) return

    const nodeIds = new Set<string>()
    const flowIds = new Set<string>()
    for (const f of target) {
      f.affectedNodeIds.forEach((n) => nodeIds.add(n))
      f.affectedFlowIds.forEach((n) => flowIds.add(n))
    }

    // Highest severity present in the highlighted set drives the glow color.
    const severity: Severity = ranked.some((f) => f.severity === 'critical')
      ? 'critical'
      : ranked.length > 0
        ? 'high'
        : 'medium'

    set({
      selectedFindingId: null,
      highlightedNodeIds: Array.from(nodeIds),
      highlightedFlowIds: Array.from(flowIds),
      highlightSeverity: severity
    })
  },

  clearHighlight: () => {
    set({
      selectedFindingId: null,
      highlightedNodeIds: [],
      highlightedFlowIds: [],
      highlightSeverity: null
    })
  },

  toggleFullScreen: () => {
    set((state) => ({ isFullScreen: !state.isFullScreen }))
  },

  setShowAbout: (show: boolean) => {
    set({ showAbout: show })
  },

  markClean: () => {
    set({ isDirty: false })
  }
}))
