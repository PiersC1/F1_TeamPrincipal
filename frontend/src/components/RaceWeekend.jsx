import React, { useState, useEffect } from 'react';
import { Flag, Settings, ArrowRight, Activity, ArrowLeft, Play, Pause, FastForward } from 'lucide-react';

const RaceWeekend = ({ gameState, onNavigate, refreshState }) => {
    const [calendar, setCalendar] = useState(null);
    const [simResults, setSimResults] = useState(null);
    const [tireEstimates, setTireEstimates] = useState(null);
    const [d1Strategy, setD1Strategy] = useState([]);
    const [d2Strategy, setD2Strategy] = useState([]);
    const [loading, setLoading] = useState(false);

    // Stint Builder State
    const [newStintD1, setNewStintD1] = useState({ compound: 'Soft', laps: 15 });
    const [newStintD2, setNewStintD2] = useState({ compound: 'Medium', laps: 25 });

    // Playback state
    const [currentLap, setCurrentLap] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(2000); // ms per lap
    const [isRaceFinished, setIsRaceFinished] = useState(false);

    useEffect(() => {
        let timer;
        if (isPlaying && simResults && simResults.race_log) {
            timer = setInterval(() => {
                setCurrentLap(prev => {
                    if (prev >= simResults.race_log.length - 1) {
                        setIsPlaying(false);
                        setIsRaceFinished(true);
                        return prev;
                    }
                    return prev + 1;
                });
            }, playbackSpeed);
        }
        return () => clearInterval(timer);
    }, [isPlaying, simResults, playbackSpeed]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const calRes = await fetch('http://localhost:8000/api/calendar');
                const calData = await calRes.json();
                setCalendar(calData.tracks);

                const estRes = await fetch('http://localhost:8000/api/race/tire_estimates');
                const estData = await estRes.json();
                if (estData.status === 'success') {
                    setTireEstimates(estData);
                }
            } catch (err) {
                console.error("Failed to load pre-race info", err);
            }
        };
        loadInitialData();
    }, []);

    if (!gameState || !calendar) return <div className="p-8 text-center animate-pulse">Loading Track Data...</div>;

    // Failsafe if season is over somehow before we catch it on dashboard
    if (!simResults && calendar && gameState.current_race_index >= calendar.length) {
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
    if (!currentTrack || !tireEstimates) return <div className="p-8 text-center animate-pulse">Synchronizing Grid Data...</div>;

    const getStrategyLaps = (strat) => strat.reduce((sum, s) => sum + s.laps, 0);
    const d1TotalLaps = getStrategyLaps(d1Strategy);
    const d2TotalLaps = getStrategyLaps(d2Strategy);

    const isValidStrategy = d1TotalLaps >= currentTrack.laps && d2TotalLaps >= currentTrack.laps;

    const handleSimulate = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/race/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    d1_strategy: d1Strategy,
                    d2_strategy: d2Strategy
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSimResults(data);
                refreshState(); // Pull the new championship standings behind the scenes

                // Initialize telemetry playback engine
                setCurrentLap(0);
                setIsRaceFinished(false);
                setIsPlaying(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- Live Telemetry & Post Race Results View ---
    if (simResults) {
        const lapData = simResults.race_log?.[currentLap] || {
            standings: simResults.race_results,
            lap: currentTrack.laps
        };

        return (
            <div className="p-8 max-w-5xl mx-auto flex flex-col h-full">
                {/* Header & Controls */}
                <div className="flex justify-between items-end border-b border-slate-800 pb-6 mb-6 shrink-0">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase mb-2 flex items-center gap-3">
                            {isRaceFinished ? "Race Classification" : <><span className="w-3 h-3 rounded-full bg-f1red animate-pulse"></span> Live Telemetry</>}
                        </h1>
                        <p className="text-xl text-f1accent">{simResults.track} • Lap {lapData.lap} / {simResults.race_log ? simResults.race_log.length : currentTrack.laps}</p>
                    </div>

                    {!isRaceFinished && (
                        <div className="flex bg-f1panel rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                            <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-slate-800 hover:bg-slate-700 text-white transition-colors border-r border-slate-700">
                                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                            </button>
                            <button onClick={() => setPlaybackSpeed(2000)} className={`px-4 py-2 font-bold text-sm ${playbackSpeed === 2000 ? 'bg-f1accent text-slate-900' : 'text-slate-400 hover:bg-slate-800 transition-colors border-r border-slate-800'}`}>1x</button>
                            <button onClick={() => setPlaybackSpeed(500)} className={`px-4 py-2 font-bold text-sm ${playbackSpeed === 500 ? 'bg-f1accent text-slate-900' : 'text-slate-400 hover:bg-slate-800 transition-colors border-r border-slate-800'}`}>4x</button>
                            <button onClick={() => setPlaybackSpeed(50)} className={`px-4 py-2 font-bold text-sm flex items-center gap-1 ${playbackSpeed === 50 ? 'bg-f1accent text-slate-900' : 'text-slate-400 hover:bg-slate-800 transition-colors'}`}>
                                <FastForward size={14} /> Max
                            </button>
                        </div>
                    )}
                </div>

                {/* Grid Table */}
                <div className="bg-f1panel rounded-2xl border border-slate-800 flex-1 overflow-hidden shadow-2xl flex flex-col mb-6 min-h-0">
                    <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <table className="w-full text-left relative">
                            <thead className="bg-slate-800/90 text-slate-400 text-sm uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="p-4 w-16 text-center">POS</th>
                                    <th className="p-4">Driver</th>
                                    <th className="p-4 hidden md:table-cell">Constructor</th>
                                    <th className="p-4 w-32 text-center hidden sm:table-cell">Tire Life</th>
                                    <th className="p-4 w-20 text-center">Pit</th>
                                    <th className="p-4 w-32 text-right">Interval</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {lapData.standings.map((r, i) => {
                                    const isPlayer = r.team === gameState.team_name;
                                    return (
                                        <tr key={r.driver} className={`hover:bg-slate-800/30 transition-all duration-300 ${isPlayer ? "bg-f1accent/10 border-l-4 border-f1accent" : ""}`}>
                                            <td className="p-4 text-center font-bold text-slate-500">{i + 1}</td>
                                            <td className={`p-4 font-medium flex items-center gap-3 ${isPlayer ? 'text-white font-bold' : 'text-slate-300'}`}>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${r.compound === 'Soft' ? 'bg-f1red border-red-900 text-white' :
                                                    r.compound === 'Medium' ? 'bg-yellow-500 border-yellow-800 text-slate-900' :
                                                        'bg-white border-slate-300 text-slate-900'
                                                    }`}>
                                                    {r.compound?.charAt(0) || '?'}
                                                </div>
                                                <span className="truncate">{r.driver}</span>
                                                {isPlayer && <span className="text-[10px] text-slate-900 bg-f1accent rounded px-1.5 py-0.5 uppercase tracking-wider shrink-0">YOU</span>}
                                            </td>
                                            <td className="p-4 text-slate-400 hidden md:table-cell">{r.team}</td>
                                            <td className="p-4 text-center hidden sm:table-cell">
                                                {r.wear !== undefined ? (
                                                    <div className="w-full h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                                                        <div className={`h-full ${r.wear > 75 ? 'bg-f1red' : r.wear > 50 ? 'bg-yellow-500' : 'bg-f1green'}`} style={{ width: `${Math.max(0, 100 - r.wear)}%` }} />
                                                    </div>
                                                ) : <span className="text-slate-600">-</span>}
                                            </td>
                                            <td className="p-4 text-center text-slate-500 text-xs font-bold">{r.stops ? `${r.stops} Stops` : '-'}</td>
                                            <td className="p-4 text-right font-mono text-sm text-slate-300 whitespace-nowrap">
                                                {i === 0 ? "Leader" : r.interval !== undefined ? `+${r.interval.toFixed(3)}s` : `+${(r.total_time - lapData.standings[0].total_time).toFixed(3)}s`}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Post Race Exit Button */}
                <div className="h-16 shrink-0 flex justify-end items-center transition-opacity duration-500">
                    {isRaceFinished ? (
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className="flex items-center gap-2 bg-f1accent hover:bg-blue-400 text-slate-900 font-bold px-8 py-4 rounded-xl shadow-lg border-2 border-transparent animate-in slide-in-from-bottom-4"
                        >
                            Continue to Hub <ArrowRight size={20} />
                        </button>
                    ) : (
                        <div className="text-slate-500 italic text-sm">Awaiting Checkered Flag...</div>
                    )}
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

                        <div className="mt-6 pt-4 border-t border-slate-800">
                            <div className="flex items-center justify-between mb-3 text-sm">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Tire Degradation</span>
                                <span className={`font-bold px-2 py-0.5 rounded ${tireEstimates.multiplier > 1.2 ? 'bg-f1red text-white' : tireEstimates.multiplier < 0.9 ? 'bg-f1green text-white' : 'bg-yellow-500 text-slate-900'}`}>{tireEstimates.multiplier.toFixed(2)}x Wear Rate</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm p-2 bg-slate-800/50 rounded border border-slate-700">
                                    <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full bg-f1red"></span> <span className="text-slate-300">Soft</span></div>
                                    <div className="text-right"><span className="text-white font-bold">{tireEstimates.estimates.Soft.laps} Laps</span> <span className="text-f1accent text-xs ml-2">-{tireEstimates.estimates.Soft.pace}s pace</span></div>
                                </div>
                                <div className="flex justify-between items-center text-sm p-2 bg-slate-800/50 rounded border border-slate-700">
                                    <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> <span className="text-slate-300">Medium</span></div>
                                    <div className="text-right"><span className="text-white font-bold">{tireEstimates.estimates.Medium.laps} Laps</span> <span className="text-f1accent text-xs ml-2">-{tireEstimates.estimates.Medium.pace}s pace</span></div>
                                </div>
                                <div className="flex justify-between items-center text-sm p-2 bg-slate-800/50 rounded border border-slate-700">
                                    <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full bg-white"></span> <span className="text-slate-300">Hard</span></div>
                                    <div className="text-right"><span className="text-white font-bold">{tireEstimates.estimates.Hard.laps} Laps</span> <span className="text-slate-500 text-xs ml-2">Baseline Pace</span></div>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 text-center uppercase tracking-widest italic">Laps before severe cliff drop-off</p>
                        </div>
                    </div>

                    <div className="bg-f1panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col items-start gap-4">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3 text-slate-400 font-medium uppercase tracking-wider text-sm">
                                <Settings size={18} className="text-slate-300" /> Custom Strategy Builder
                            </div>
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">Target Laps: {currentTrack.laps}</span>
                        </div>

                        {/* Strategy Driver 1 */}
                        <div className="w-full bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-white font-bold">{gameState.drivers[0]?.name || "Driver 1"}</h3>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${d1TotalLaps === currentTrack.laps ? 'bg-f1green text-white' : d1TotalLaps > currentTrack.laps ? 'bg-yellow-500 text-slate-900' : 'bg-f1red/20 text-f1red'}`}>
                                    {d1TotalLaps} / {currentTrack.laps} Laps
                                </span>
                            </div>

                            {/* Visual Bar */}
                            <div className="w-full h-2 bg-slate-900 rounded-full mb-4 flex overflow-hidden">
                                {d1Strategy.map((s, i) => (
                                    <div key={i} className={`h-full border-r border-slate-900 ${s.compound === 'Soft' ? 'bg-f1red' : s.compound === 'Medium' ? 'bg-yellow-500' : 'bg-white'}`} style={{ width: `${(s.laps / currentTrack.laps) * 100}%` }}></div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-2 mb-4">
                                {d1Strategy.map((stint, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-700/50 p-2 rounded text-sm border border-slate-600">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${stint.compound === 'Soft' ? 'bg-f1red' : stint.compound === 'Medium' ? 'bg-yellow-500' : 'bg-white'}`}></span>
                                            <span className="text-white font-bold">Stint {i + 1}</span>
                                        </div>
                                        <span className="text-slate-300 font-mono">{stint.laps} Laps</span>
                                    </div>
                                ))}
                                {d1Strategy.length === 0 && <span className="text-sm text-slate-500 italic text-center py-2">No Stints Built. DNS Warning.</span>}
                            </div>

                            <div className="flex gap-2">
                                <select
                                    value={newStintD1.compound}
                                    onChange={(e) => setNewStintD1({ ...newStintD1, compound: e.target.value })}
                                    className="bg-slate-700 text-white rounded p-2 text-sm flex-1 border border-slate-600 outline-none focus:border-f1accent"
                                >
                                    <option value="Soft">Soft</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                                <input
                                    type="number"
                                    min="1"
                                    max={currentTrack.laps}
                                    value={newStintD1.laps}
                                    onChange={(e) => setNewStintD1({ ...newStintD1, laps: parseInt(e.target.value) || 0 })}
                                    className="w-20 bg-slate-700 text-center text-white rounded p-2 text-sm border border-slate-600 outline-none focus:border-f1accent"
                                />
                                <button
                                    onClick={() => setD1Strategy([...d1Strategy, { ...newStintD1 }])}
                                    className="bg-f1accent hover:bg-blue-400 text-slate-900 font-bold px-3 py-2 rounded text-sm transition-colors"
                                >
                                    Add Stint
                                </button>
                                <button
                                    onClick={() => setD1Strategy(d1Strategy.slice(0, -1))}
                                    disabled={d1Strategy.length === 0}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors"
                                >
                                    Undo
                                </button>
                            </div>
                        </div>

                        {/* Strategy Driver 2 */}
                        <div className="w-full bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-white font-bold">{gameState.drivers[1]?.name || "Driver 2"}</h3>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${d2TotalLaps === currentTrack.laps ? 'bg-f1green text-white' : d2TotalLaps > currentTrack.laps ? 'bg-yellow-500 text-slate-900' : 'bg-f1red/20 text-f1red'}`}>
                                    {d2TotalLaps} / {currentTrack.laps} Laps
                                </span>
                            </div>

                            {/* Visual Bar */}
                            <div className="w-full h-2 bg-slate-900 rounded-full mb-4 flex overflow-hidden">
                                {d2Strategy.map((s, i) => (
                                    <div key={i} className={`h-full border-r border-slate-900 ${s.compound === 'Soft' ? 'bg-f1red' : s.compound === 'Medium' ? 'bg-yellow-500' : 'bg-white'}`} style={{ width: `${(s.laps / currentTrack.laps) * 100}%` }}></div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-2 mb-4">
                                {d2Strategy.map((stint, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-700/50 p-2 rounded text-sm border border-slate-600">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${stint.compound === 'Soft' ? 'bg-f1red' : stint.compound === 'Medium' ? 'bg-yellow-500' : 'bg-white'}`}></span>
                                            <span className="text-white font-bold">Stint {i + 1}</span>
                                        </div>
                                        <span className="text-slate-300 font-mono">{stint.laps} Laps</span>
                                    </div>
                                ))}
                                {d2Strategy.length === 0 && <span className="text-sm text-slate-500 italic text-center py-2">No Stints Built. DNS Warning.</span>}
                            </div>

                            <div className="flex gap-2">
                                <select
                                    value={newStintD2.compound}
                                    onChange={(e) => setNewStintD2({ ...newStintD2, compound: e.target.value })}
                                    className="bg-slate-700 text-white rounded p-2 text-sm flex-1 border border-slate-600 outline-none focus:border-f1accent"
                                >
                                    <option value="Soft">Soft</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                                <input
                                    type="number"
                                    min="1"
                                    max={currentTrack.laps}
                                    value={newStintD2.laps}
                                    onChange={(e) => setNewStintD2({ ...newStintD2, laps: parseInt(e.target.value) || 0 })}
                                    className="w-20 bg-slate-700 text-center text-white rounded p-2 text-sm border border-slate-600 outline-none focus:border-f1accent"
                                />
                                <button
                                    onClick={() => setD2Strategy([...d2Strategy, { ...newStintD2 }])}
                                    className="bg-f1accent hover:bg-blue-400 text-slate-900 font-bold px-3 py-2 rounded text-sm transition-colors"
                                >
                                    Add Stint
                                </button>
                                <button
                                    onClick={() => setD2Strategy(d2Strategy.slice(0, -1))}
                                    disabled={d2Strategy.length === 0}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors"
                                >
                                    Undo
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleSimulate}
                            disabled={loading || !isValidStrategy}
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
