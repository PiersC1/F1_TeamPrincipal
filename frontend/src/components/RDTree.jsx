import React, { useState } from 'react';
import { ArrowLeft, Zap, Shield, Wind, Activity } from 'lucide-react';

const RDTree = ({ gameState, onNavigate, refreshState }) => {
    if (!gameState) return null;

    const [errorMsg, setErrorMsg] = useState("");
    const { rd_manager, finance_manager } = gameState;
    const nodes = rd_manager.nodes;

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

    const getNodeColor = (state) => {
        switch (state) {
            case "COMPLETED": return "bg-f1green/20 border-f1green text-white";
            case "IN_PROGRESS": return "bg-f1accent/20 border-f1accent text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]";
            case "AVAILABLE": return "bg-yellow-500/20 border-yellow-500 text-white cursor-pointer hover:bg-yellow-500/30";
            case "MUTUALLY_LOCKED": return "bg-f1red/10 border-f1red/50 text-slate-500";
            case "LOCKED": default: return "bg-slate-800 border-slate-700 text-slate-500";
        }
    };

    // Helper to visually organize our 4 MVP nodes into a hardcoded tree structure for now
    // In a massive game, we'd use a library like react-flow
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 px-8 pt-8">
                <button
                    onClick={() => onNavigate('dashboard')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} /> Back to Dashboard
                </button>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">R&D Facilities</h1>
                <div className="text-right">
                    <p className="text-slate-400 text-sm uppercase tracking-widest">Available Budget</p>
                    <p className="text-2xl font-bold text-f1green">${finance_manager.balance.toLocaleString()}</p>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-f1red/20 border border-f1red text-red-200 px-6 py-3 rounded-lg mx-8 mb-4 text-center">
                    {errorMsg}
                </div>
            )}

            {/* Active Project Banner */}
            <div className="mx-8 mb-12 bg-f1panel rounded-2xl p-6 border border-slate-700 shadow-xl flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-800 rounded-xl">
                        <Activity className="text-f1accent" size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400 uppercase tracking-widest mb-1">Active Project</p>
                        <p className="text-xl font-bold text-white">
                            {rd_manager.active_project ? rd_manager.nodes.find(n => n.node_id === rd_manager.active_project)?.name : "No Active Project"}
                        </p>
                    </div>
                </div>

                {rd_manager.active_project && (
                    <div className="text-right">
                        <p className="text-sm text-slate-400 mb-2">Time Remaining</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">
                                {rd_manager.nodes.find(n => n.node_id === rd_manager.active_project)?.base_time_to_complete - rd_manager.nodes.find(n => n.node_id === rd_manager.active_project)?.progress_time}
                            </span>
                            <span className="text-slate-500">Races</span>
                        </div>
                    </div>
                )}
            </div>

            {/* The Visual Tree Area */}
            <div className="flex-1 overflow-auto px-8 relative pb-20">
                <div className="min-w-[800px] min-h-[600px] flex flex-col items-center">

                    {/* Root Aero Node */}
                    <div className={`w-80 p-5 rounded-xl border-2 transition-all relative z-10 ${getNodeColor(nodes.find(n => n.node_id === 'aero_b1')?.state)}`}
                        onClick={() => nodes.find(n => n.node_id === 'aero_b1')?.state === 'AVAILABLE' && handleStartProject('aero_b1')}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{nodes.find(n => n.node_id === 'aero_b1')?.name}</h3>
                            {nodes.find(n => n.node_id === 'aero_b1')?.state === 'AVAILABLE' && <span className="text-xs font-bold bg-yellow-500/20 px-2 py-1 rounded text-yellow-500">${(nodes.find(n => n.node_id === 'aero_b1')?.cost / 1000000).toFixed(1)}M</span>}
                        </div>
                        <p className="text-sm mb-4 opacity-80">{nodes.find(n => n.node_id === 'aero_b1')?.description}</p>
                        <div className="flex items-center gap-2 text-xs font-mono bg-black/20 p-2 rounded">
                            <Wind size={14} className="text-f1accent" /> +5 Downforce
                        </div>
                    </div>

                    {/* Connecting Line Vertical */}
                    <div className="w-[2px] h-12 bg-slate-700"></div>
                    {/* Connecting Line Horizontal Fork */}
                    <div className="w-[400px] h-[2px] bg-slate-700 hidden md:block"></div>

                    <div className="flex w-full justify-center gap-20 pt-12 md:pt-0 relative">
                        {/* Left Fork Vertical Line */}
                        <div className="absolute left-[calc(50%-200px)] top-0 w-[2px] h-12 bg-slate-700 hidden md:block"></div>
                        {/* Right Fork Vertical Line */}
                        <div className="absolute right-[calc(50%-200px)] top-0 w-[2px] h-12 bg-slate-700 hidden md:block"></div>

                        {/* High Downforce Node */}
                        <div className={`w-80 p-5 rounded-xl border-2 transition-all relative z-10 ${getNodeColor(nodes.find(n => n.node_id === 'aero_adv')?.state)}`}
                            onClick={() => nodes.find(n => n.node_id === 'aero_adv')?.state === 'AVAILABLE' && handleStartProject('aero_adv')}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg">{nodes.find(n => n.node_id === 'aero_adv')?.name}</h3>
                                {nodes.find(n => n.node_id === 'aero_adv')?.state === 'AVAILABLE' && <span className="text-xs font-bold bg-yellow-500/20 px-2 py-1 rounded text-yellow-500">${(nodes.find(n => n.node_id === 'aero_adv')?.cost / 1000000).toFixed(1)}M</span>}
                            </div>
                            <p className="text-sm mb-4 opacity-80">{nodes.find(n => n.node_id === 'aero_adv')?.description}</p>
                            <div className="flex flex-col gap-1 text-xs font-mono bg-black/20 p-2 rounded">
                                <div className="flex items-center gap-2"><Wind size={14} className="text-f1green" /> +15 Downforce</div>
                                <div className="flex items-center gap-2"><ArrowLeft size={14} className="text-f1red" /> -5 Drag Efficiency</div>
                            </div>
                        </div>

                        {/* Low Drag Node */}
                        <div className={`w-80 p-5 rounded-xl border-2 transition-all relative z-10 ${getNodeColor(nodes.find(n => n.node_id === 'aero_eff')?.state)}`}
                            onClick={() => nodes.find(n => n.node_id === 'aero_eff')?.state === 'AVAILABLE' && handleStartProject('aero_eff')}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg">{nodes.find(n => n.node_id === 'aero_eff')?.name}</h3>
                                {nodes.find(n => n.node_id === 'aero_eff')?.state === 'AVAILABLE' && <span className="text-xs font-bold bg-yellow-500/20 px-2 py-1 rounded text-yellow-500">${(nodes.find(n => n.node_id === 'aero_eff')?.cost / 1000000).toFixed(1)}M</span>}
                            </div>
                            <p className="text-sm mb-4 opacity-80">{nodes.find(n => n.node_id === 'aero_eff')?.description}</p>
                            <div className="flex flex-col gap-1 text-xs font-mono bg-black/20 p-2 rounded">
                                <div className="flex items-center gap-2"><Wind size={14} className="text-f1red" /> -5 Downforce</div>
                                <div className="flex items-center gap-2"><Zap size={14} className="text-f1green" /> +15 Drag Efficiency</div>
                            </div>
                        </div>
                    </div>

                    {/* Completely Unrelated Independent Node just for show */}
                    <div className="mt-20 w-full flex justify-start">
                        <div className={`w-80 p-5 rounded-xl border-2 transition-all relative z-10 ${getNodeColor(nodes.find(n => n.node_id === 'powertrain_power')?.state)}`}
                            onClick={() => nodes.find(n => n.node_id === 'powertrain_power')?.state === 'AVAILABLE' && handleStartProject('powertrain_power')}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg">{nodes.find(n => n.node_id === 'powertrain_power')?.name}</h3>
                                {nodes.find(n => n.node_id === 'powertrain_power')?.state === 'AVAILABLE' && <span className="text-xs font-bold bg-yellow-500/20 px-2 py-1 rounded text-yellow-500">${(nodes.find(n => n.node_id === 'powertrain_power')?.cost / 1000000).toFixed(1)}M</span>}
                            </div>
                            <p className="text-sm mb-4 opacity-80">{nodes.find(n => n.node_id === 'powertrain_power')?.description}</p>
                            <div className="flex flex-col gap-1 text-xs font-mono bg-black/20 p-2 rounded">
                                <div className="flex items-center gap-2"><Zap size={14} className="text-f1green" /> +20 Power</div>
                                <div className="flex items-center gap-2"><Shield size={14} className="text-f1red" /> -10 Reliability</div>
                                <div className="flex items-center gap-2"><ArrowLeft size={14} className="text-f1red" /> -5 Weight Reduction</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RDTree;
