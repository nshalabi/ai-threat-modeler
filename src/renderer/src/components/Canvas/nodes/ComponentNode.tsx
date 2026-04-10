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

  const glowStyle =
    isHighlighted && severity
      ? {
          boxShadow: severityGlowShadow(severity),
          borderColor: SEVERITY_HEX[severity]
        }
      : undefined

  return (
    <div
      style={glowStyle}
      className={`
        relative min-w-[160px] rounded-lg border-2 transition-all duration-200
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
