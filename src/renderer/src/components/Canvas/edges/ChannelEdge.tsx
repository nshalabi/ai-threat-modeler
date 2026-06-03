/**
 * ChannelEdge (#12e) — a sibling-aware custom edge.
 *
 * Problem: when two flows connect the same pair of nodes in opposite
 * directions (Employee -> WebApp and WebApp -> Employee), React Flow's
 * default bezier draws both edges as mirror curves that cross at the
 * midpoint, AND both edges want to place their label at that midpoint —
 * producing the lens / X visual and overlapping label text ("UsAnswer st").
 * Moving the boxes does not help because the curves are computed from the
 * box positions.
 *
 * Fix (render-only, no data or engine impact): detect sibling edges (other
 * edges connecting the same unordered endpoint pair) and:
 *   1. Bias each edge's bezier control points perpendicular to the
 *      source -> target axis by `siblingIndex` so the two curves run
 *      parallel instead of crossing.
 *   2. Position each edge's label at a different progress along its path
 *      (~30% and ~70%) so the two labels no longer collide.
 *
 * Single (non-paired) edges fall through to the standard React Flow bezier
 * + midpoint label — no behavior change from before.
 */
import { useMemo } from 'react'
import { BaseEdge, getBezierPath, Position, type EdgeProps } from '@xyflow/react'

export interface ChannelEdgeData {
  /** This edge's position within the sibling group (0-based). */
  siblingIndex: number
  /** Total edges sharing this unordered endpoint pair (>=1). */
  siblingCount: number
  label?: string
  labelStyle?: React.CSSProperties
  labelBgStyle?: React.CSSProperties
}

export function ChannelEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  style,
  markerEnd,
  markerStart,
  data
}: EdgeProps): JSX.Element {
  const {
    siblingIndex = 0,
    siblingCount = 1,
    label,
    labelStyle,
    labelBgStyle
  } = (data as ChannelEdgeData | undefined) ?? ({} as ChannelEdgeData)

  // Only treat exact pairs as siblings worth offsetting. 3+ edges between the
  // same pair is rare and ambiguous — fall back to default rendering.
  const isPaired = siblingCount === 2

  const { path, labelX, labelY } = useMemo(() => {
    // Single edge: standard React Flow bezier + midpoint label.
    if (!isPaired) {
      const [edgePath, lx, ly] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
      })
      return { path: edgePath, labelX: lx, labelY: ly }
    }

    // Paired edge: cubic bezier with control points biased perpendicular to
    // the source -> target axis by an amount that scales with edge length.
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const length = Math.sqrt(dx * dx + dy * dy) || 1

    // Perpendicular unit vector (rotated 90 CCW). One sibling curves to one
    // side, the other to the opposite side, so the two paths diverge.
    const perpX = -dy / length
    const perpY = dx / length
    const offsetAmount = Math.min(60, length * 0.22)
    const offsetSign = siblingIndex === 0 ? 1 : -1
    const offset = offsetAmount * offsetSign

    // Control-point distance from each endpoint along its handle direction —
    // tuned to feel similar to React Flow's default cubic.
    const ctrlDist = Math.min(length * 0.45, 220)
    const srcDir = positionDirection(sourcePosition)
    const tgtDir = positionDirection(targetPosition)

    const c1x = sourceX + srcDir.x * ctrlDist + perpX * offset
    const c1y = sourceY + srcDir.y * ctrlDist + perpY * offset
    const c2x = targetX + tgtDir.x * ctrlDist + perpX * offset
    const c2y = targetY + tgtDir.y * ctrlDist + perpY * offset

    const p = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`

    // Label at offset progress so the two paired labels sit ~40% apart
    // along their curves and never overlap, regardless of edge length.
    const t = siblingIndex === 0 ? 0.3 : 0.7
    const u = 1 - t
    const lx = u * u * u * sourceX + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * targetX
    const ly = u * u * u * sourceY + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * targetY

    return { path: p, labelX: lx, labelY: ly }
  }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, siblingIndex, isPaired])

  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={labelStyle}
      labelShowBg={!!labelBgStyle}
      labelBgStyle={labelBgStyle}
      labelBgPadding={[4, 4]}
      labelBgBorderRadius={2}
    />
  )
}

function positionDirection(p: Position | undefined): { x: number; y: number } {
  switch (p) {
    case Position.Left:
      return { x: -1, y: 0 }
    case Position.Right:
      return { x: 1, y: 0 }
    case Position.Top:
      return { x: 0, y: -1 }
    case Position.Bottom:
      return { x: 0, y: 1 }
    default:
      return { x: 1, y: 0 }
  }
}
