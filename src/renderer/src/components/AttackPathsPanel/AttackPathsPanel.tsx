/**
 * Attack-path view (#4). Two sources of paths:
 *  - "Detected" — multi-hop path-rule findings (chains the engine flagged)
 *  - "Probe"    — on-demand: select a component, find every control-free
 *                 path from an untrusted source to it
 * Selecting a path drives the canvas overlay (sequence badges, entry/target
 * markers, spotlight) via the shared highlight infra.
 */
import { useMemo } from 'react'
import { useProjectStore } from '../../stores/project-store'
import type { Severity } from '@shared/types/knowledge'
import {
  ASSET_TARGET_TYPES,
  UNTRUSTED_SOURCE_TYPES,
  CONTROL_NODE_TYPES
} from '../../../../analysis/evaluator'

const SEV_TEXT: Record<Severity, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
  informational: 'text-gray-400'
}

export function AttackPathsPanel(): JSX.Element {
  const project = useProjectStore((s) => s.project)
  const findings = useProjectStore((s) => s.findings)
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId)
  const attackProbePaths = useProjectStore((s) => s.attackProbePaths)
  const probeTargetId = useProjectStore((s) => s.probeTargetId)
  const orderedPathNodeIds = useProjectStore((s) => s.orderedPathNodeIds)
  const probeAttackPaths = useProjectStore((s) => s.probeAttackPaths)
  const activatePath = useProjectStore((s) => s.activatePath)
  const clearAttackPaths = useProjectStore((s) => s.clearAttackPaths)

  const label = (id: string): string =>
    project.nodes.find((n) => n.id === id)?.label ?? id

  const detected = useMemo(
    () => findings.filter((f) => f.derivation.path),
    [findings]
  )

  const assetNodes = useMemo(
    () => project.nodes.filter((n) => ASSET_TARGET_TYPES.includes(n.type)),
    [project.nodes]
  )

  const selectedNode = selectedNodeId
    ? project.nodes.find((n) => n.id === selectedNodeId)
    : null

  const isAsset = !!selectedNode && ASSET_TARGET_TYPES.includes(selectedNode.type)
  const selReason = !selectedNode
    ? 'Select an asset on the canvas, or pick a suggested target below.'
    : UNTRUSTED_SOURCE_TYPES.includes(selectedNode.type)
      ? `"${selectedNode.label}" is an untrusted source, not a target.`
      : CONTROL_NODE_TYPES.includes(selectedNode.type)
        ? `"${selectedNode.label}" is a control, not a target.`
        : !isAsset
          ? `"${selectedNode.label}" isn't a typical attack target.`
          : ''

  const activeKey = orderedPathNodeIds.join('>')

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-[#2e2e3a] flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#e2e8f0] uppercase tracking-wider">
          Attack Paths
        </h3>
        {orderedPathNodeIds.length > 0 && (
          <button
            onClick={clearAttackPaths}
            className="text-[10px] text-[#64748b] hover:text-[#e2e8f0] cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Probe */}
      <div className="px-3 py-2.5 border-b border-[#2e2e3a] space-y-1.5">
        <span className="text-[10px] font-medium text-[#64748b] uppercase tracking-wider">
          Probe a component
        </span>
        <button
          disabled={!isAsset}
          onClick={() => isAsset && selectedNode && probeAttackPaths(selectedNode.id)}
          className={`w-full px-2 py-1.5 text-xs rounded transition-colors ${
            isAsset
              ? 'bg-[#6366f1] text-white hover:bg-[#818cf8] cursor-pointer'
              : 'bg-[#1a1a24] text-[#475569] cursor-not-allowed'
          }`}
        >
          {isAsset && selectedNode
            ? `Find paths to "${selectedNode.label}"`
            : 'Select an asset to probe'}
        </button>
        {!isAsset && selReason && (
          <p className="text-[10px] text-[#64748b] leading-relaxed">
            {selReason} Pick an asset (model, tool, datastore, registry…) on the
            canvas or from the suggested targets below.
          </p>
        )}

        {/* Suggested targets — always available */}
        {assetNodes.length > 0 && (
          <div className="pt-1">
            <div className="text-[10px] font-medium text-[#64748b] uppercase tracking-wider mb-1">
              Suggested targets
            </div>
            <div className="flex flex-wrap gap-1">
              {assetNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => probeAttackPaths(n.id)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border cursor-pointer transition-colors ${
                    probeTargetId === n.id
                      ? 'border-[#6366f1] bg-[#1a1a24] text-[#e2e8f0]'
                      : 'border-[#2e2e3a] text-[#94a3b8] hover:bg-[#1a1a24]'
                  }`}
                  title={`Find control-free paths to ${n.label}`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Probe result */}
        {probeTargetId && attackProbePaths.length === 0 && (
          <p className="text-[10px] text-emerald-400 leading-relaxed pt-1">
            ✓ No untrusted source can reach “{label(probeTargetId)}” without a
            control. No exposed attack path.
          </p>
        )}
        {attackProbePaths.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="text-[10px] text-[#64748b]">
              {attackProbePaths.length} control-free path
              {attackProbePaths.length === 1 ? '' : 's'} to “
              {probeTargetId ? label(probeTargetId) : 'target'}”
            </div>
            {attackProbePaths.map((p, i) => {
              const key = p.nodeIds.join('>')
              const active = key === activeKey
              return (
                <button
                  key={i}
                  onClick={() => activatePath(p.nodeIds, p.flowIds, 'high')}
                  className={`w-full text-left px-2 py-1.5 rounded border text-[10px] leading-relaxed cursor-pointer transition-colors ${
                    active
                      ? 'border-[#6366f1] bg-[#1a1a24]'
                      : 'border-[#2e2e3a] hover:bg-[#1a1a24]'
                  }`}
                >
                  <span className="text-[#cbd5e1]">
                    {p.nodeIds.map(label).join('  →  ')}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detected (path-rule findings) */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-medium text-[#64748b] uppercase tracking-wider">
          Detected chains ({detected.length})
        </div>
        {detected.length === 0 && (
          <p className="px-3 text-[10px] text-[#64748b]">
            No multi-hop findings. Run analysis, or probe a component above.
          </p>
        )}
        {detected.map((f) => {
          const path = f.derivation.path!
          const key = path.nodeIds.join('>')
          const active = key === activeKey
          return (
            <button
              key={f.id}
              onClick={() => activatePath(path.nodeIds, path.flowIds, f.severity)}
              className={`w-full text-left px-3 py-2 border-b border-[#2e2e3a] cursor-pointer transition-colors ${
                active ? 'bg-[#1a1a24]' : 'hover:bg-[#1a1a24]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium ${SEV_TEXT[f.severity]}`}>
                  {f.severity.toUpperCase()}
                </span>
                <span className="text-xs text-[#e2e8f0] truncate">{f.title}</span>
              </div>
              <div className="text-[10px] text-[#94a3b8] mt-1 leading-relaxed">
                {path.nodeIds.map(label).join('  →  ')}
              </div>
              <div className="text-[10px] text-[#64748b] mt-0.5">
                No control on path: <code>{path.missingControl}</code>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
