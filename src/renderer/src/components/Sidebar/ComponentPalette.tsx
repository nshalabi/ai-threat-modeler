import { useState } from 'react'
import { COMPONENT_LIBRARY } from '@shared/constants/component-library'
import type { ComponentType } from '@shared/types/model'
import { useProjectStore } from '../../stores/project-store'

export function ComponentPalette(): JSX.Element {
  const [search, setSearch] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const connectorMode = useProjectStore((s) => s.connectorMode)
  const setConnectorMode = useProjectStore((s) => s.setConnectorMode)

  const filtered = COMPONENT_LIBRARY.filter(
    (c) =>
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  )

  const standardComponents = filtered.filter((c) => c.category === 'standard')
  const aiComponents = filtered.filter((c) => c.category === 'ai')

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const onDragStart = (event: React.DragEvent, type: ComponentType) => {
    event.dataTransfer.setData('application/aitm-component', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#2e2e3a]">
        <h2 className="text-xs font-semibold text-[#e2e8f0] uppercase tracking-wider mb-2">
          Components
        </h2>
        <input
          type="text"
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-[#0a0a0f] border border-[#2e2e3a] rounded
                     text-[#e2e8f0] placeholder-[#64748b]
                     focus:outline-none focus:border-[#6366f1]
                     transition-colors"
        />
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* Connectors — sets the "pen mode" for the next connection drawn
            on the canvas. Items are clickable (not draggable): they toggle
            between unidirectional and bidirectional channels. The choice
            persists across multiple connections so the user can draw a run
            of one kind without re-selecting each time. */}
        <CategorySection
          title="Connectors"
          color="#10b981"
          collapsed={collapsedSections['connectors'] ?? false}
          onToggle={() => toggleSection('connectors')}
        >
          <ConnectorItem
            kind="unidirectional"
            active={connectorMode === 'unidirectional'}
            onClick={() => setConnectorMode('unidirectional')}
          />
          <ConnectorItem
            kind="bidirectional"
            active={connectorMode === 'bidirectional'}
            onClick={() => setConnectorMode('bidirectional')}
          />
        </CategorySection>

        {/* Standard section */}
        <CategorySection
          title="Standard"
          color="#3b82f6"
          collapsed={collapsedSections['standard'] ?? false}
          onToggle={() => toggleSection('standard')}
        >
          {standardComponents.map((comp) => (
            <PaletteItem
              key={comp.type}
              icon={comp.icon}
              label={comp.label}
              type={comp.type}
              onDragStart={onDragStart}
            />
          ))}
          {standardComponents.length === 0 && (
            <p className="text-[10px] text-[#64748b] px-2 py-1">No matching components</p>
          )}
        </CategorySection>

        {/* AI section */}
        <CategorySection
          title="AI / ML"
          color="#7c3aed"
          collapsed={collapsedSections['ai'] ?? false}
          onToggle={() => toggleSection('ai')}
        >
          {aiComponents.map((comp) => (
            <PaletteItem
              key={comp.type}
              icon={comp.icon}
              label={comp.label}
              type={comp.type}
              onDragStart={onDragStart}
            />
          ))}
          {aiComponents.length === 0 && (
            <p className="text-[10px] text-[#64748b] px-2 py-1">No matching components</p>
          )}
        </CategorySection>
      </div>
    </div>
  )
}

function CategorySection({
  title,
  color,
  collapsed,
  onToggle,
  children
}: {
  title: string
  color: string
  collapsed: boolean
  onToggle: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold
                   text-[#94a3b8] hover:text-[#e2e8f0] transition-colors rounded
                   hover:bg-[#1a1a24] cursor-pointer"
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span>{title}</span>
        <span className="ml-auto text-[10px]">{collapsed ? '+' : '-'}</span>
      </button>
      {!collapsed && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  )
}

function PaletteItem({
  icon,
  label,
  type,
  onDragStart
}: {
  icon: string
  label: string
  type: ComponentType
  onDragStart: (event: React.DragEvent, type: ComponentType) => void
}): JSX.Element {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-grab
                 hover:bg-[#22222e] active:cursor-grabbing transition-colors
                 group"
    >
      <span className="text-sm">{icon}</span>
      <span className="text-xs text-[#94a3b8] group-hover:text-[#e2e8f0] transition-colors truncate">
        {label}
      </span>
    </div>
  )
}

function ConnectorItem({
  kind,
  active,
  onClick
}: {
  kind: 'unidirectional' | 'bidirectional'
  active: boolean
  onClick: () => void
}): JSX.Element {
  const isUni = kind === 'unidirectional'
  const arrow = isUni ? '→' : '↔'
  const label = isUni ? 'Unidirectional' : 'Bidirectional'
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        isUni
          ? 'Next connection drawn becomes a single-direction flow (one arrow).'
          : 'Next connection drawn becomes a bidirectional channel (arrows at both ends).'
      }
      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-left
                  transition-colors group
                  ${
                    active
                      ? 'bg-[#22222e] border border-[#10b981]/50'
                      : 'border border-transparent hover:bg-[#22222e]'
                  }`}
    >
      <span
        className={`text-sm font-mono ${active ? 'text-[#10b981]' : 'text-[#94a3b8] group-hover:text-[#e2e8f0]'}`}
      >
        {arrow}
      </span>
      <span
        className={`text-xs transition-colors truncate ${active ? 'text-[#e2e8f0]' : 'text-[#94a3b8] group-hover:text-[#e2e8f0]'}`}
      >
        {label}
      </span>
      {active && <span className="ml-auto text-[9px] text-[#10b981] uppercase tracking-wider">active</span>}
    </button>
  )
}
