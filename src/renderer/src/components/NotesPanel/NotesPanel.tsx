import { useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import type { Note, NoteCategory } from '@shared/types/model'

const CATEGORY_LABELS: Record<NoteCategory, string> = {
  general: 'General',
  todo: 'TODO',
  assumption: 'Assumption',
  decision: 'Decision',
  'finding-response': 'Finding Response'
}

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  general: 'bg-[#64748b]',
  todo: 'bg-yellow-500',
  assumption: 'bg-blue-500',
  decision: 'bg-green-500',
  'finding-response': 'bg-purple-500'
}

const ALL_CATEGORIES: NoteCategory[] = ['general', 'todo', 'assumption', 'decision', 'finding-response']

export function NotesPanel(): JSX.Element {
  const project = useProjectStore((s) => s.project)
  const addNote = useProjectStore((s) => s.addNote)
  const updateNote = useProjectStore((s) => s.updateNote)
  const removeNote = useProjectStore((s) => s.removeNote)
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId)
  const selectedFlowId = useProjectStore((s) => s.selectedFlowId)

  const [filterCategory, setFilterCategory] = useState<NoteCategory | 'all'>('all')
  const [filterScope, setFilterScope] = useState<'all' | 'project' | 'selected'>('all')
  const [isAdding, setIsAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<NoteCategory>('general')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const notes = project.notes.filter((note) => {
    if (filterCategory !== 'all' && note.category !== filterCategory) return false
    if (filterScope === 'project' && (note.linkedNodeId || note.linkedFlowId || note.linkedBoundaryId)) return false
    if (filterScope === 'selected') {
      const matchesNode = selectedNodeId && note.linkedNodeId === selectedNodeId
      const matchesFlow = selectedFlowId && note.linkedFlowId === selectedFlowId
      if (!matchesNode && !matchesFlow) return false
    }
    return true
  })

  const handleAdd = () => {
    if (!newContent.trim()) return
    const linkedTo = filterScope === 'selected'
      ? { nodeId: selectedNodeId ?? undefined, flowId: selectedFlowId ?? undefined }
      : undefined
    addNote(newContent.trim(), newCategory, linkedTo)
    setNewContent('')
    setNewCategory('general')
    setIsAdding(false)
  }

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  const handleSaveEdit = (id: string) => {
    if (editContent.trim()) {
      updateNote(id, { content: editContent.trim() })
    }
    setEditingId(null)
  }

  const resolveLinkedLabel = (note: Note): string | null => {
    if (note.linkedNodeId) {
      const node = project.nodes.find((n) => n.id === note.linkedNodeId)
      return node ? node.label : null
    }
    if (note.linkedFlowId) {
      const flow = project.flows.find((f) => f.id === note.linkedFlowId)
      if (flow) {
        const src = project.nodes.find((n) => n.id === flow.source)
        const tgt = project.nodes.find((n) => n.id === flow.target)
        return `${src?.label ?? '?'} → ${tgt?.label ?? '?'}`
      }
    }
    if (note.linkedBoundaryId) {
      const boundary = project.boundaries.find((b) => b.id === note.linkedBoundaryId)
      return boundary ? boundary.label : null
    }
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#2e2e3a]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-[#e2e8f0] uppercase tracking-wider">Notes</h3>
          <span className="text-[10px] text-[#64748b]">{project.notes.length} total</span>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as NoteCategory | 'all')}
            className="flex-1 px-2 py-1 text-[10px] bg-[#0a0a0f] border border-[#2e2e3a] rounded
                       text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
          >
            <option value="all">All categories</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value as 'all' | 'project' | 'selected')}
            className="flex-1 px-2 py-1 text-[10px] bg-[#0a0a0f] border border-[#2e2e3a] rounded
                       text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
          >
            <option value="all">All notes</option>
            <option value="project">Project-level</option>
            <option value="selected">Selected element</option>
          </select>
        </div>

        {/* Add button */}
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full px-2 py-1.5 text-xs text-[#6366f1] border border-[#6366f1]/30
                       rounded hover:bg-[#6366f1]/10 transition-colors cursor-pointer"
          >
            + Add Note
          </button>
        )}
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="px-3 py-2.5 border-b border-[#2e2e3a] space-y-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as NoteCategory)}
            className="w-full px-2 py-1 text-xs bg-[#0a0a0f] border border-[#2e2e3a] rounded
                       text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write your note..."
            className="w-full px-2.5 py-1.5 text-xs bg-[#0a0a0f] border border-[#2e2e3a] rounded
                       text-[#e2e8f0] placeholder-[#64748b] resize-y min-h-[60px]
                       focus:outline-none focus:border-[#6366f1]"
            rows={3}
            autoFocus
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleAdd}
              className="flex-1 px-2 py-1.5 text-xs bg-[#6366f1] text-white rounded
                         hover:bg-[#818cf8] transition-colors cursor-pointer"
            >
              Add
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewContent('') }}
              className="flex-1 px-2 py-1.5 text-xs text-[#94a3b8] border border-[#2e2e3a] rounded
                         hover:bg-[#1a1a24] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <p className="text-xs text-[#64748b]">
              {project.notes.length === 0
                ? 'No notes yet. Add notes to document assumptions, decisions, and TODOs.'
                : 'No notes match the current filter.'}
            </p>
          </div>
        )}
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            linkedLabel={resolveLinkedLabel(note)}
            isEditing={editingId === note.id}
            editContent={editContent}
            onEditContentChange={setEditContent}
            onStartEdit={() => handleStartEdit(note)}
            onSaveEdit={() => handleSaveEdit(note.id)}
            onCancelEdit={() => setEditingId(null)}
            onChangeCategory={(cat) => updateNote(note.id, { category: cat })}
            onDelete={() => removeNote(note.id)}
          />
        ))}
      </div>
    </div>
  )
}

function NoteCard({
  note,
  linkedLabel,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onChangeCategory,
  onDelete
}: {
  note: Note
  linkedLabel: string | null
  isEditing: boolean
  editContent: string
  onEditContentChange: (value: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onChangeCategory: (category: NoteCategory) => void
  onDelete: () => void
}): JSX.Element {
  const timeAgo = formatTimeAgo(note.updatedAt)

  return (
    <div className="border-b border-[#2e2e3a] px-3 py-2.5 hover:bg-[#1a1a24]/50 transition-colors group">
      {/* Header row */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[note.category]}`} />
        <select
          value={note.category}
          onChange={(e) => onChangeCategory(e.target.value as NoteCategory)}
          className="text-[10px] font-medium text-[#94a3b8] bg-transparent border-none p-0
                     focus:outline-none cursor-pointer hover:text-[#e2e8f0]"
        >
          {ALL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
        <span className="text-[10px] text-[#64748b] ml-auto">{timeAgo}</span>
        <button
          onClick={onDelete}
          className="text-[10px] text-[#64748b] hover:text-red-400 opacity-0 group-hover:opacity-100
                     transition-all cursor-pointer ml-1"
          title="Delete note"
        >
          ×
        </button>
      </div>

      {/* Linked element */}
      {linkedLabel && (
        <div className="text-[10px] text-[#6366f1] mb-1 truncate">
          ↳ {linkedLabel}
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <div className="space-y-1.5">
          <textarea
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            className="w-full px-2 py-1.5 text-xs bg-[#0a0a0f] border border-[#6366f1] rounded
                       text-[#e2e8f0] resize-y min-h-[48px] focus:outline-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-1">
            <button
              onClick={onSaveEdit}
              className="px-2 py-0.5 text-[10px] bg-[#6366f1] text-white rounded hover:bg-[#818cf8] cursor-pointer"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-2 py-0.5 text-[10px] text-[#94a3b8] hover:text-[#e2e8f0] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p
          className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap cursor-pointer hover:text-[#e2e8f0]"
          onClick={onStartEdit}
        >
          {note.content}
        </p>
      )}
    </div>
  )
}

function formatTimeAgo(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  return new Date(isoString).toLocaleDateString()
}
