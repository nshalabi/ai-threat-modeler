import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  Panel,
  MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useProjectStore } from '../../stores/project-store'
import { ComponentNode } from './nodes/ComponentNode'
import { ChannelEdge } from './edges/ChannelEdge'
import type { ComponentType } from '@shared/types/model'
import { SEVERITY_HEX } from '../../utils/severity-colors'

const nodeTypes: NodeTypes = {
  component: ComponentNode
}

const edgeTypes: EdgeTypes = {
  channel: ChannelEdge
}

export function ThreatModelCanvas(): JSX.Element {
  const project = useProjectStore((s) => s.project)
  const addNode = useProjectStore((s) => s.addNode)
  const addFlow = useProjectStore((s) => s.addFlow)
  const selectNode = useProjectStore((s) => s.selectNode)
  const selectFlow = useProjectStore((s) => s.selectFlow)
  const updateNodePosition = useProjectStore((s) => s.updateNodePosition)
  const highlightedFlowIds = useProjectStore((s) => s.highlightedFlowIds)
  const highlightSeverity = useProjectStore((s) => s.highlightSeverity)
  const connectorMode = useProjectStore((s) => s.connectorMode)

  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // Convert store nodes to React Flow format
  const rfNodes: Node[] = useMemo(
    () =>
      project.nodes.map((node) => ({
        id: node.id,
        type: 'component',
        position: node.position,
        data: {
          label: node.label,
          componentType: node.type,
          properties: node.properties
        }
      })),
    [project.nodes]
  )

  // Convert store flows to React Flow edges.
  //
  // Bidirectional rendering is driven by the data, not inferred at render
  // time: a flow whose `properties.bidirectional` is `true` is treated as a
  // single channel and rendered with arrows at BOTH ends. Otherwise it's a
  // single directed flow with one arrow at the target end. The modeler
  // decides which kind of channel a connection is — the renderer never
  // guesses by pair-detecting reversed endpoints. (An earlier attempt at
  // pair detection conflated "same channel" with "same payload" and lost
  // information for request/response pairs that genuinely carry different
  // dataTypes per direction — different problem, different fix.)
  //
  // Engine semantics: bidirectional is a render + authoring concept only.
  // The deterministic engine still traverses each record source -> target
  // exactly once; rule fires are unchanged by setting the flag.
  const rfEdges: Edge[] = useMemo(() => {
    const highlightSet = new Set(highlightedFlowIds)
    const glowColor = highlightSeverity ? SEVERITY_HEX[highlightSeverity] : null

    // Sibling detection (#12e): two flows that share the same unordered
    // endpoint pair are visual siblings — even when they go in opposite
    // directions. Each edge's siblingIndex / siblingCount tells the custom
    // ChannelEdge whether to offset its curve and label so the pair runs
    // parallel instead of crossing and the labels don't collide. Pure
    // render-time grouping; the data records are unchanged.
    const pairKey = (a: string, b: string): string =>
      a < b ? `${a}::${b}` : `${b}::${a}`
    const flowIdsByPair = new Map<string, string[]>()
    for (const flow of project.flows) {
      const key = pairKey(flow.source, flow.target)
      const ids = flowIdsByPair.get(key) ?? []
      ids.push(flow.id)
      flowIdsByPair.set(key, ids)
    }

    return project.flows.map((flow) => {
      const isHighlighted = highlightSet.has(flow.id)
      const stroke = isHighlighted && glowColor
        ? glowColor
        : flow.properties.encrypted
          ? '#6366f1'
          : '#64748b'
      const strokeWidth = isHighlighted ? 3.5 : 2
      const marker = {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: stroke
      }

      const siblings = flowIdsByPair.get(pairKey(flow.source, flow.target)) ?? [flow.id]
      const siblingIndex = siblings.indexOf(flow.id)
      const siblingCount = siblings.length

      return {
        id: flow.id,
        type: 'channel',
        source: flow.source,
        target: flow.target,
        animated: flow.properties.encrypted,
        markerEnd: marker,
        ...(flow.properties.bidirectional ? { markerStart: marker } : {}),
        style: {
          stroke,
          strokeWidth,
          ...(isHighlighted && glowColor
            ? { filter: `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 12px ${glowColor})` }
            : {})
        },
        // The custom edge reads label + label styling out of `data` so it
        // can position the label at the right progress along the path.
        data: {
          siblingIndex,
          siblingCount,
          label: flow.label,
          labelStyle: {
            fill: '#94a3b8',
            fontSize: 11
          },
          labelBgStyle: {
            fill: '#1a1a24',
            fillOpacity: 0.9
          }
        }
      }
    })
  }, [project.flows, highlightedFlowIds, highlightSeverity])

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges)

  // Sync from store to React Flow state
  useEffect(() => {
    setNodes(rfNodes)
  }, [rfNodes, setNodes])

  useEffect(() => {
    setEdges(rfEdges)
  }, [rfEdges, setEdges])

  // Handle new connection. The currently selected connector pen (#12d —
  // "Unidirectional" / "Bidirectional" in the Connectors palette section)
  // determines the new flow's `bidirectional` property; the renderer then
  // draws single or double arrow accordingly.
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        addFlow(params.source, params.target, undefined, connectorMode === 'bidirectional')
      }
    },
    [addFlow, connectorMode]
  )

  // Handle node drag stop - update position in store
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position)
    },
    [updateNodePosition]
  )

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  // Handle edge click
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      selectFlow(edge.id)
    },
    [selectFlow]
  )

  // Handle click on pane (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null)
    selectFlow(null)
  }, [selectNode, selectFlow])

  // Drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/aitm-component') as ComponentType
      if (!type) return

      const wrapperBounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (!wrapperBounds) return

      const position = {
        x: event.clientX - wrapperBounds.left - 80,
        y: event.clientY - wrapperBounds.top - 30
      }

      addNode(type, position)
    },
    [addNode]
  )

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          // Custom sibling-aware channel edge (#12e). Paired flows over the
          // same endpoint pair are auto-offset perpendicular to each other
          // and their labels positioned at different path progresses so
          // they no longer cross or collide. Falls back to a standard
          // bezier when an edge has no sibling.
          type: 'channel',
          style: { stroke: '#64748b', strokeWidth: 2 }
        }}
      >
        <Background color="#2e2e3a" gap={20} size={1} />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor="#22222e"
          maskColor="rgba(10, 10, 15, 0.7)"
          style={{ backgroundColor: '#12121a' }}
          pannable
          zoomable
        />
        <Panel position="top-right">
          <div className="text-[10px] text-[#64748b] bg-[#12121a] px-2 py-1 rounded border border-[#2e2e3a]">
            {project.nodes.length} components &middot; {project.flows.length} flows
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
