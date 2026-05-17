import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { COMPONENT_MAP } from '@shared/constants/component-library'
import type { ComponentType, NodeProperties } from '@shared/types/model'
import { useProjectStore } from '../../../stores/project-store'
import { SEVERITY_HEX, severityGlowShadow } from '../../../utils/severity-colors'

interface ComponentNodeData extends Record<string, unknown> {
  label: string
  componentType: ComponentType
  properties: NodeProperties
}

function ComponentNodeInner({ id, data, selected }: NodeProps): JSX.Element {
  const nodeData = data as ComponentNodeData
  const definition = COMPONENT_MAP[nodeData.componentType]
  const isAI = definition?.category === 'ai'
  const icon = definition?.icon ?? '?'

  const isHighlighted = useProjectStore((s) => s.highlightedNodeIds.includes(id))
  const severity = useProjectStore((s) => s.highlightSeverity)
  const pathFocus = useProjectStore((s) => s.pathFocus)
  const pathIndex = useProjectStore((s) => s.orderedPathNodeIds.indexOf(id))
  const pathLength = useProjectStore((s) => s.orderedPathNodeIds.length)

  const isOnPath = pathIndex >= 0
  const isSource = isOnPath && pathIndex === 0
  const isTarget = isOnPath && pathIndex === pathLength - 1
  // Spotlight: when a path is focused, dim everything not on it.
  const dimmed = pathFocus && !isOnPath

  const glowStyle =
    isHighlighted && severity
      ? {
          boxShadow: severityGlowShadow(severity),
          borderColor: SEVERITY_HEX[severity]
        }
      : undefined

  return (
    <div
      style={{ ...glowStyle, opacity: dimmed ? 0.25 : 1 }}
      className={`
        relative min-w-[160px] rounded-lg border-2 transition-all duration-200
        ${dimmed ? 'grayscale' : ''}
        ${selected
          ? 'border-[#6366f1] shadow-lg shadow-[#6366f1]/20'
          : isHighlighted
            ? ''
            : isAI
              ? 'border-[#7c3aed]/40 hover:border-[#7c3aed]/70'
              : 'border-[#2e2e3a] hover:border-[#64748b]'
        }
        bg-[#1a1a24]
      `}
    >
      {isOnPath && pathFocus && (
        <>
          <div
            className="absolute -top-2.5 -left-2.5 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
            style={{ background: severity ? SEVERITY_HEX[severity] : '#6366f1' }}
            title={`Step ${pathIndex + 1} of ${pathLength}`}
          >
            {pathIndex + 1}
          </div>
          {isSource && (
            <div className="absolute -top-2.5 left-4 z-10 px-1.5 h-5 rounded-full bg-[#dc2626] text-white text-[9px] font-semibold flex items-center shadow">
              ⚠ ENTRY
            </div>
          )}
          {isTarget && (
            <div className="absolute -top-2.5 right-4 z-10 px-1.5 h-5 rounded-full bg-[#7c3aed] text-white text-[9px] font-semibold flex items-center shadow">
              ◎ TARGET
            </div>
          )}
        </>
      )}
      {/* Category indicator strip */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-lg ${
          isAI ? 'bg-[#7c3aed]' : 'bg-[#3b82f6]'
        }`}
      />

      <div className="px-3 py-2.5 flex items-center gap-2.5">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-[#e2e8f0] truncate">{nodeData.label}</span>
          <span className="text-[10px] text-[#64748b] truncate">
            {definition?.label ?? nodeData.componentType}
          </span>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-[#64748b] !border-2 !border-[#1a1a24]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-[#64748b] !border-2 !border-[#1a1a24]"
      />
    </div>
  )
}

export const ComponentNode = memo(ComponentNodeInner)
