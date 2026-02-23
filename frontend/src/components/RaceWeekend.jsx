import React, { useState, useEffect } from 'react';
import { Flag, Settings, ArrowRight, Activity, ArrowLeft } from 'lucide-react';

const RaceWeekend = ({ gameState, onNavigate, refreshState }) => {
    const [calendar, setCalendar] = useState(null);
    const [simResults, setSimResults] = useState(null);
    const [strategy, setStrategy] = useState("Balanced");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('http://localhost:8000/api/calendar')
            .then(res => res.json())
            .then(data => setCalendar(data.tracks));
    }, []);

    if (!gameState || !calendar) return <div className="p-8 text-center animate-pulse">Loading Track Data...</div>;

    // Failsafe if season is over somehow before we catch it on dashboard
    if (gameState.current_race_index >= 10) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-3xl font-bold mb-4">Season Complete!</h1>
                <button
                    onClick={() => onNavigate('dashboard')}
                    className="bg-f1accent text-slate-900 px-6 py-2 rounded font-bold"
                >
                    Back to Hub
                </button>
            </div>
        );
    }

    const currentTrack = calendar[gameState.current_race_index];

    // Failsafe if calendar hasn't re-rendered with new data yet
    if (!currentTrack) return <div className="p-8 text-center animate-pulse">Synchronizing Grid Data...</div>;

    const handleSimulate = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/race/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ strategy })
            });

            if (response.ok) {
                const data = await response.json();
                setSimResults(data);
                refreshState(); // Pull the new championship standings behind the scenes
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- Post Race Results View ---
    if (simResults) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="text-center border-b border-slate-800 pb-8 mb-8">
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase mb-2">Race Classification</h1>
                    <p className="text-xl text-f1accent">{currentTrack.name}</p>
                </div>

                <div className="bg-f1panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl mb-8">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50 text-slate-400 text-sm uppercase tracking-wider">
                            <tr>
                                <th className="p-4 w-16 text-center">POS</th>
                                <th className="p-4">Driver</th>
                                <th className="p-4 hidden md:table-cell">Constructor</th>
                                <th className="p-4 text-right">Time</th>
                                <th className="p-4 w-24 text-center">PTS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {simResults.race_results.map((r, i) => (
                                <tr key={i} className={`hover:bg-slate-800/30 transition-colors ${r.team === "Player Racing" ? "bg-f1accent/10" : ""}`}>
                                    <td className="p-4 text-center font-bold text-slate-500">{i + 1}</td>
                                    <td className="p-4 font-medium text-white">{r.driver}</td>
                                    <td className="p-4 text-slate-400 hidden md:table-cell">{r.team}</td>
                                    <td className="p-4 text-right font-mono text-sm text-slate-300">
                                        {i === 0 ? `${r.total_time.toFixed(3)}s` : `+${(r.total_time - simResults.race_results[0].total_time).toFixed(3)}s`}
                                    </td>
                                    <td className={`p-4 text-center font-bold ${i < 10 ? 'text-f1green' : 'text-slate-600'}`}>
                                        {i < 10 ? `+${[25, 18, 15, 12, 10, 8, 6, 4, 2, 1][i]}` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="flex items-center gap-2 bg-f1accent hover:bg-blue-400 text-slate-900 font-bold px-8 py-4 rounded-xl transition-all shadow-lg"
                    >
                        Continue to Hub <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    // --- Pre Race Strategy View ---
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-8 px-8 pt-8">
                <button
                    onClick={() => onNavigate('dashboard')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} /> Abort Weekend
                </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 px-8 pb-8">

                {/* Left Column: Track & Strategy */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-f1panel rounded-2xl p-6 border border-slate-800 shadow-xl">
                        <div className="flex items-center gap-3 mb-4 text-slate-400 font-medium uppercase tracking-wider text-sm">
                            <Flag size={18} className="text-f1red" /> Circuit Details
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">{currentTrack.name}</h2>
                        <p className="text-slate-400 mb-6">{currentTrack.country} • {currentTrack.laps} Laps</p>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-400">Aero Demand</span>
                                    <span className="text-white font-bold">{currentTrack.aero_weight.toFixed(1)}x</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5">
                                    <div className="bg-f1accent h-1.5 rounded-full" style={{ width: `${Math.min(100, currentTrack.aero_weight * 50)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-400">Power Demand</span>
                                    <span className="text-white font-bold">{currentTrack.powertrain_weight.toFixed(1)}x</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5">
                                    <div className="bg-f1red h-1.5 rounded-full" style={{ width: `${Math.min(100, currentTrack.powertrain_weight * 50)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-400">Chassis Demand</span>
                                    <span className="text-white font-bold">{currentTrack.chassis_weight.toFixed(1)}x</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5">
                                    <div className="bg-f1green h-1.5 rounded-full" style={{ width: `${Math.min(100, currentTrack.chassis_weight * 50)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-f1panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col items-start gap-4">
                        <div className="flex items-center gap-3 w-full text-slate-400 font-medium uppercase tracking-wider text-sm">
                            <Settings size={18} className="text-slate-300" /> Race Strategy
                        </div>
                        <select
                            value={strategy}
                            onChange={(e) => setStrategy(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:border-f1accent"
                        >
                            <option value="Balanced">Balanced (Standard Wear)</option>
                            <option value="Aggressive">Aggressive (High Pace, High Wear)</option>
                            <option value="Conserve">Conserve (Low Pace, 1-Stop)</option>
                        </select>

                        <button
                            onClick={handleSimulate}
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 bg-f1accent hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold px-6 py-4 rounded-xl transition-all shadow-lg mt-4"
                        >
                            {loading ? <Activity className="animate-spin" /> : <><Flag size={20} /> Start Race Simulation</>}
                        </button>
                    </div>
                </div>

                {/* Right Column: Pre-Race Form */}
                <div className="lg:col-span-2 bg-f1panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                        <div className="flex items-center gap-3 text-slate-400 font-medium uppercase tracking-wider text-sm">
                            <Activity size={18} className="text-yellow-500" /> Grid Prediction (Pace Analysis)
                        </div>
                        <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded">Estimated based on track demands</span>
                    </div>

                    {/* A fake qualy order. Since Qualy math is bundled inside the API simulate call right now, 
                we just show the raw driver ratings for flavor here before the race */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 overflow-y-auto pr-4">
                        <div className="text-center italic text-slate-500 py-20 col-span-2">
                            Click 'Start Race Simulation' to calculate Qualifying grid and execute 50 laps.
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RaceWeekend;
