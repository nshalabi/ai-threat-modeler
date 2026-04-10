import { useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { COMPONENT_MAP } from '@shared/constants/component-library'
import type { DataClassification, DataType, NoteCategory } from '@shared/types/model'

const DATA_CLASSIFICATIONS: DataClassification[] = ['public', 'internal', 'confidential', 'restricted']
const DATA_TYPES: DataType[] = ['prompts', 'embeddings', 'model-outputs', 'credentials', 'pii', 'regulated-data', 'training-data', 'general']

export function PropertyPanel(): JSX.Element {
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId)
  const selectedFlowId = useProjectStore((s) => s.selectedFlowId)
  const project = useProjectStore((s) => s.project)
  const updateNode = useProjectStore((s) => s.updateNode)
  const updateFlow = useProjectStore((s) => s.updateFlow)
  const removeNode = useProjectStore((s) => s.removeNode)
  const removeFlow = useProjectStore((s) => s.removeFlow)
  const addNote = useProjectStore((s) => s.addNote)
  const removeNote = useProjectStore((s) => s.removeNote)

  const selectedNode = selectedNodeId
    ? project.nodes.find((n) => n.id === selectedNodeId)
    : null
  const selectedFlow = selectedFlowId
    ? project.flows.find((f) => f.id === selectedFlowId)
    : null

  if (!selectedNode && !selectedFlow) {
    return (
      <div className="flex items-center justify-center h-full text-[#64748b] text-xs p-4 text-center">
        Select a component or flow to view properties
      </div>
    )
  }

  if (selectedNode) {
    const definition = COMPONENT_MAP[selectedNode.type]
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2.5 border-b border-[#2e2e3a]">
          <div className="flex items-center gap-2">
            <span className="text-lg">{definition?.icon ?? '?'}</span>
            <div>
              <h3 className="text-xs font-semibold text-[#e2e8f0]">{definition?.label ?? selectedNode.type}</h3>
              <span className="text-[10px] text-[#64748b]">{selectedNode.id}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <FieldGroup label="Label">
            <input
              type="text"
              value={selectedNode.label}
              onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
              className="field-input"
            />
          </FieldGroup>

          <FieldGroup label="Description">
            <textarea
              value={selectedNode.properties.description ?? ''}
              onChange={(e) =>
                updateNode(selectedNode.id, { properties: { description: e.target.value } })
              }
              className="field-input min-h-[60px] resize-y"
              rows={2}
            />
          </FieldGroup>

          <FieldGroup label="Data Classification">
            <select
              value={selectedNode.properties.dataClassification ?? ''}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  properties: { dataClassification: e.target.value as DataClassification || undefined }
                })
              }
              className="field-input"
            >
              <option value="">Not set</option>
              {DATA_CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Provider">
            <input
              type="text"
              value={selectedNode.properties.provider ?? ''}
              onChange={(e) =>
                updateNode(selectedNode.id, { properties: { provider: e.target.value } })
              }
              className="field-input"
              placeholder="e.g., OpenAI, AWS, self-hosted"
            />
          </FieldGroup>

          <div className="space-y-1.5">
            <span className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-wider">Security Properties</span>
            <CheckboxField
              label="Internet Facing"
              checked={selectedNode.properties.internetFacing ?? false}
              onChange={(v) => updateNode(selectedNode.id, { properties: { internetFacing: v } })}
            />
            <CheckboxField
              label="Handles Credentials"
              checked={selectedNode.properties.handlesCredentials ?? false}
              onChange={(v) => updateNode(selectedNode.id, { properties: { handlesCredentials: v } })}
            />
            <CheckboxField
              label="Handles PII"
              checked={selectedNode.properties.handlesPII ?? false}
              onChange={(v) => updateNode(selectedNode.id, { properties: { handlesPII: v } })}
            />
            <CheckboxField
              label="Is External"
              checked={selectedNode.properties.isExternal ?? false}
              onChange={(v) => updateNode(selectedNode.id, { properties: { isExternal: v } })}
            />
            <CheckboxField
              label="Has RBAC"
              checked={selectedNode.properties.hasRBAC ?? false}
              onChange={(v) => updateNode(selectedNode.id, { properties: { hasRBAC: v } })}
            />
            <CheckboxField
              label="Has Approval Flow"
              checked={selectedNode.properties.hasApprovalFlow ?? false}
              onChange={(v) => updateNode(selectedNode.id, { properties: { hasApprovalFlow: v } })}
            />
            <CheckboxField
              label="Has Input Validation"
              checked={selectedNode.properties.hasInputValidation ?? false}
              onChange={(v) => updateNode(selectedNode.id, { properties: { hasInputValidation: v } })}
            />
            <CheckboxField
              label="Has Output Filtering"
              checked={selectedNode.properties.hasOutputFiltering ?? false}
              onChange={(v) => updateNode(selectedNode.id, { properties: { hasOutputFiltering: v } })}
            />
            <CheckboxField
              label="Has Logging"
              checked={selectedNode.properties.hasLogging ?? false}
              onChange={(v) => updateNode(selectedNode.id, { properties: { hasLogging: v } })}
            />
          </div>

          <ElementNotes
            elementId={selectedNode.id}
            elementType="node"
            notes={project.notes.filter((n) => n.linkedNodeId === selectedNode.id)}
            onAdd={(content, category) => addNote(content, category, { nodeId: selectedNode.id })}
            onRemove={removeNote}
          />

          <button
            onClick={() => removeNode(selectedNode.id)}
            className="w-full mt-4 px-3 py-1.5 text-xs text-red-400 border border-red-400/30
                       rounded hover:bg-red-400/10 transition-colors"
          >
            Remove Component
          </button>
        </div>
      </div>
    )
  }

  if (selectedFlow) {
    const sourceNode = project.nodes.find((n) => n.id === selectedFlow.source)
    const targetNode = project.nodes.find((n) => n.id === selectedFlow.target)

    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2.5 border-b border-[#2e2e3a]">
          <h3 className="text-xs font-semibold text-[#e2e8f0]">Data Flow</h3>
          <span className="text-[10px] text-[#64748b]">
            {sourceNode?.label ?? '?'} → {targetNode?.label ?? '?'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <FieldGroup label="Label">
            <input
              type="text"
              value={selectedFlow.label}
              onChange={(e) => updateFlow(selectedFlow.id, { label: e.target.value })}
              className="field-input"
            />
          </FieldGroup>

          <FieldGroup label="Protocol">
            <input
              type="text"
              value={selectedFlow.properties.protocol ?? ''}
              onChange={(e) =>
                updateFlow(selectedFlow.id, { properties: { ...selectedFlow.properties, protocol: e.target.value } })
              }
              className="field-input"
              placeholder="e.g., HTTPS, gRPC, WebSocket"
            />
          </FieldGroup>

          <FieldGroup label="Data Classification">
            <select
              value={selectedFlow.properties.dataClassification}
              onChange={(e) =>
                updateFlow(selectedFlow.id, {
                  properties: { ...selectedFlow.properties, dataClassification: e.target.value as DataClassification }
                })
              }
              className="field-input"
            >
              {DATA_CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FieldGroup>

          <div className="space-y-1.5">
            <span className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-wider">Security</span>
            <CheckboxField
              label="Encrypted"
              checked={selectedFlow.properties.encrypted}
              onChange={(v) =>
                updateFlow(selectedFlow.id, { properties: { ...selectedFlow.properties, encrypted: v } })
              }
            />
            <CheckboxField
              label="Authenticated"
              checked={selectedFlow.properties.authenticated}
              onChange={(v) =>
                updateFlow(selectedFlow.id, { properties: { ...selectedFlow.properties, authenticated: v } })
              }
            />
            <CheckboxField
              label="Crosses Trust Boundary"
              checked={selectedFlow.properties.crossesTrustBoundary ?? false}
              onChange={(v) =>
                updateFlow(selectedFlow.id, {
                  properties: { ...selectedFlow.properties, crossesTrustBoundary: v }
                })
              }
            />
            <CheckboxField
              label="Crosses Provider Boundary"
              checked={selectedFlow.properties.crossesProviderBoundary ?? false}
              onChange={(v) =>
                updateFlow(selectedFlow.id, {
                  properties: { ...selectedFlow.properties, crossesProviderBoundary: v }
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-wider">Data Types</span>
            {DATA_TYPES.map((dt) => (
              <CheckboxField
                key={dt}
                label={dt}
                checked={selectedFlow.properties.dataTypes.includes(dt)}
                onChange={(checked) => {
                  const current = selectedFlow.properties.dataTypes
                  const updated = checked
                    ? [...current, dt]
                    : current.filter((t) => t !== dt)
                  updateFlow(selectedFlow.id, {
                    properties: { ...selectedFlow.properties, dataTypes: updated }
                  })
                }}
              />
            ))}
          </div>

          <ElementNotes
            elementId={selectedFlow.id}
            elementType="flow"
            notes={project.notes.filter((n) => n.linkedFlowId === selectedFlow.id)}
            onAdd={(content, category) => addNote(content, category, { flowId: selectedFlow.id })}
            onRemove={removeNote}
          />

          <button
            onClick={() => removeFlow(selectedFlow.id)}
            className="w-full mt-4 px-3 py-1.5 text-xs text-red-400 border border-red-400/30
                       rounded hover:bg-red-400/10 transition-colors"
          >
            Remove Flow
          </button>
        </div>
      </div>
    )
  }

  return <div />
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

function CheckboxField({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}): JSX.Element {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-[#2e2e3a] bg-[#0a0a0f] text-[#6366f1]
                   focus:ring-1 focus:ring-[#6366f1] focus:ring-offset-0"
      />
      <span className="text-xs text-[#94a3b8] group-hover:text-[#e2e8f0] transition-colors">
        {label}
      </span>
    </label>
  )
}

const NOTE_CATEGORIES: NoteCategory[] = ['general', 'todo', 'assumption', 'decision', 'finding-response']
const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  general: 'General',
  todo: 'TODO',
  assumption: 'Assumption',
  decision: 'Decision',
  'finding-response': 'Finding Response'
}

function ElementNotes({
  elementId,
  elementType,
  notes,
  onAdd,
  onRemove
}: {
  elementId: string
  elementType: 'node' | 'flow'
  notes: { id: string; content: string; category: NoteCategory; createdAt: string }[]
  onAdd: (content: string, category: NoteCategory) => void
  onRemove: (id: string) => void
}): JSX.Element {
  const [isAdding, setIsAdding] = useState(false)
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<NoteCategory>('general')

  const handleAdd = () => {
    if (!content.trim()) return
    onAdd(content.trim(), category)
    setContent('')
    setCategory('general')
    setIsAdding(false)
  }

  return (
    <div className="space-y-1.5 mt-3 pt-3 border-t border-[#2e2e3a]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-wider">
          Notes ({notes.length})
        </span>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-[10px] text-[#6366f1] hover:text-[#818cf8] cursor-pointer"
          >
            + Add
          </button>
        )}
      </div>

      {isAdding && (
        <div className="space-y-1.5 p-2 bg-[#0a0a0f] rounded border border-[#2e2e3a]">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as NoteCategory)}
            className="w-full px-2 py-1 text-[10px] bg-[#12121a] border border-[#2e2e3a] rounded
                       text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
          >
            {NOTE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{NOTE_CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a note..."
            className="w-full px-2 py-1.5 text-xs bg-[#12121a] border border-[#2e2e3a] rounded
                       text-[#e2e8f0] placeholder-[#64748b] resize-y min-h-[40px]
                       focus:outline-none focus:border-[#6366f1]"
            rows={2}
            autoFocus
          />
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              className="flex-1 px-2 py-1 text-[10px] bg-[#6366f1] text-white rounded
                         hover:bg-[#818cf8] cursor-pointer"
            >
              Add
            </button>
            <button
              onClick={() => { setIsAdding(false); setContent('') }}
              className="flex-1 px-2 py-1 text-[10px] text-[#94a3b8] border border-[#2e2e3a] rounded
                         hover:bg-[#1a1a24] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {notes.map((note) => (
        <div
          key={note.id}
          className="p-2 bg-[#0a0a0f] rounded border border-[#2e2e3a] group"
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-[#64748b]">{NOTE_CATEGORY_LABELS[note.category]}</span>
            <button
              onClick={() => onRemove(note.id)}
              className="text-[10px] text-[#64748b] hover:text-red-400 opacity-0 group-hover:opacity-100
                         transition-all cursor-pointer"
            >
              ×
            </button>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed whitespace-pre-wrap">{note.content}</p>
        </div>
      ))}
    </div>
  )
}
