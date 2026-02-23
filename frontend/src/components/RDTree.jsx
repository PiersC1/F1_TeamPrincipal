import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Zap, Shield, Wind, Activity, Settings, Lock, CheckCircle } from 'lucide-react';
import { ReactFlow, Controls, Background, Handle, Position, MarkerType, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

// --- Custom ReactFlow Node for the Tech Tree ---
const getIconForEffect = (key) => {
    if (key.includes('aero')) return <Wind size={14} />;
    if (key.includes('powertrain')) return <Zap size={14} />;
    if (key.includes('chassis')) return <Settings size={14} />;
    return <Activity size={14} />;
};

const formatEffectKey = (key) => {
    return key.replace('aero.', '').replace('powertrain.', '').replace('chassis.', '').replace('_', ' ').toUpperCase();
};

const TechNode = ({ data }) => {
    const { node, handleStartProject, isActive } = data;

    // Determine colors
    let bgClass = "bg-slate-800 border-slate-700 text-slate-500 opacity-70";
    if (node.state === "COMPLETED") bgClass = "bg-f1green/20 border-f1green text-white";
    else if (node.state === "IN_PROGRESS") bgClass = "bg-f1accent/20 border-f1accent text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]";
    else if (node.state === "AVAILABLE") bgClass = "bg-yellow-500/20 border-yellow-500 text-white cursor-pointer hover:bg-yellow-500/30";
    else if (node.state === "MUTUALLY_LOCKED") bgClass = "bg-f1red/10 border-f1red/50 text-slate-500 opacity-40";

    return (
        <div
            className={`w-[280px] p-4 rounded-xl border-2 transition-all relative ${bgClass} ${isActive ? 'ring-4 ring-f1accent' : ''}`}
            onClick={() => node.state === 'AVAILABLE' && handleStartProject(node.node_id)}
        >
            <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-slate-400 border-none" />

            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-sm leading-tight pr-2 truncate">{node.name}</h4>
                {node.state === 'AVAILABLE' && (
                    <span className="text-[10px] font-black bg-yellow-500/20 px-1 py-0.5 rounded text-yellow-500 shrink-0">
                        ${(node.cost / 1000000).toFixed(1)}M
                    </span>
                )}
            </div>

            <p className="text-xs mb-3 opacity-80 h-8 overflow-hidden">{node.description}</p>

            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1 text-[10px] font-mono bg-black/40 p-1.5 rounded w-full">
                    <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                        <span className="text-slate-400">Time:</span>
                        <span className="font-bold">{node.time_to_complete} RACES</span>
                    </div>
                    {Object.entries(node.effects).map(([key, val]) => (
                        <div key={key} className={`flex items-center justify-between font-bold ${val > 0 ? 'text-f1green' : 'text-f1red'}`}>
                            <div className="flex items-center gap-1">
                                {getIconForEffect(key)}
                                <span>{formatEffectKey(key)}</span>
                            </div>
                            <span>{val > 0 ? '+' : ''}{val}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-slate-400 border-none" />
        </div>
    );
};

// --- DAGRE Graph Layout Algorithm ---
const getLayoutedElements = (nodes, edges, direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 300, height: 160 }); // Approx node sizes
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.position = {
            x: nodeWithPosition.x - 300 / 2,
            y: nodeWithPosition.y - 160 / 2,
        };
        return node;
    });

    return { nodes, edges };
};

// --- Main Component ---
const RDTree = ({ gameState, onNavigate, refreshState }) => {
    if (!gameState) return null;

    const [errorMsg, setErrorMsg] = useState("");
    const { rd_manager, finance_manager } = gameState;
    const rawNodes = rd_manager.nodes || [];

    const handleStartProject = async (nodeId) => {
        try {
            const response = await fetch('http://localhost:8000/api/rd/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ node_id: nodeId })
            });

            if (!response.ok) {
                const error = await response.json();
                setErrorMsg(error.detail || "Failed to start project");
                setTimeout(() => setErrorMsg(""), 3000);
            } else {
                refreshState();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Memoize the node types
    const nodeTypes = useMemo(() => ({ techNode: TechNode }), []);

    // Generate ReactFlow elements from our backend nodes
    const { initialNodes, initialEdges } = useMemo(() => {
        let flowNodes = [];
        let flowEdges = [];

        rawNodes.forEach(node => {
            // Create ReactFlow node
            flowNodes.push({
                id: node.node_id,
                type: 'techNode',
                data: { node, handleStartProject, isActive: rd_manager.active_project === node.node_id },
                position: { x: 0, y: 0 }, // Handled by Dagre
            });

            // Create ReactFlow edges for dependencies
            node.dependencies.forEach(depId => {
                flowEdges.push({
                    id: `e-${depId}-${node.node_id}`,
                    source: depId,
                    target: node.node_id,
                    type: 'smoothstep',
                    animated: node.state === 'AVAILABLE' || node.state === 'IN_PROGRESS',
                    style: {
                        stroke: node.state === 'COMPLETED' ? '#22c55e' : (node.state === 'AVAILABLE' ? '#eab308' : '#334155'),
                        strokeWidth: 2
                    },
                    markerEnd: { type: MarkerType.ArrowClosed, color: node.state === 'COMPLETED' ? '#22c55e' : (node.state === 'AVAILABLE' ? '#eab308' : '#334155') }
                });
            });

            // Optional: You could draw mutually exclusive red lines here if desired, 
            // but it might make the graph extremely cluttered.
        });

        const layouted = getLayoutedElements(flowNodes, flowEdges, 'LR');
        return { initialNodes: layouted.nodes, initialEdges: layouted.edges };
    }, [rawNodes, rd_manager.active_project]);

    // Setup ReactFlow state hooks
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update the layout if the raw nodes change (e.g. state changes meaning color updates)
    useEffect(() => {
        const layouted = getLayoutedElements(initialNodes, initialEdges, 'LR');
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
    }, [rawNodes, rd_manager.active_project, setNodes, setEdges, initialNodes, initialEdges]);

    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-start p-8 pointer-events-none">
                <div className="pointer-events-auto">
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 bg-slate-900/80 px-4 py-2 rounded-full backdrop-blur-sm"
                    >
                        <ArrowLeft size={20} /> Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1 drop-shadow-md">R&D Facilities</h1>

                    {errorMsg && (
                        <div className="bg-f1red/90 border border-f1red text-white font-bold px-6 py-3 rounded-lg mt-4 shadow-xl">
                            {errorMsg}
                        </div>
                    )}
                </div>

                <div className="text-right pointer-events-auto bg-slate-900/80 p-4 rounded-xl backdrop-blur-sm border border-slate-700">
                    <p className="text-slate-400 text-sm uppercase tracking-widest mb-1">Available Budget</p>
                    <p className="text-3xl font-bold text-f1green">${finance_manager.balance.toLocaleString()}</p>
                </div>
            </div>

            {/* Main Interactive Flow Area */}
            <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.1}
                    maxZoom={1.5}
                    proOptions={{ hideAttribution: true }} // Disables the 'React Flow' watermark
                >
                    <Background color="#334155" gap={24} size={2} />
                    <Controls className="!bg-slate-800 !border-slate-700 !fill-white" showInteractive={false} />
                </ReactFlow>

                {/* Legend Overlay */}
                <div className="absolute bottom-8 left-8 z-10 bg-slate-900/80 backdrop-blur-sm p-4 rounded-xl border border-slate-700 pointer-events-none">
                    <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-3">Node Legend</h4>
                    <div className="flex flex-col gap-2 text-xs font-bold text-slate-400">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-f1green rounded-sm"></div> Completed</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-f1accent rounded-sm"></div> In Progress</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-sm"></div> Available to Purchase</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-700 rounded-sm"></div> Dependencies Not Met</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-f1red/50 rounded-sm"></div> Path Locked</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RDTree;
