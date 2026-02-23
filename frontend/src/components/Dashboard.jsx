import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Activity, Users, Trophy, Star } from 'lucide-react';

const Dashboard = ({ gameState, onNavigate, refreshState }) => {
    if (!gameState) return <div className="p-8 text-center animate-pulse">Loading Telemetry...</div>;

    const { finance_manager, car, season, current_race_index, championship_manager } = gameState;

    // Get points dict from backend
    const driverPoints = championship_manager?.driver_standings || {};
    const teamPoints = championship_manager?.constructor_standings || {};

    const [calendar, setCalendar] = useState(null);
    useEffect(() => {
        fetch('http://localhost:8000/api/calendar')
            .then(res => res.json())
            .then(data => setCalendar(data.tracks));
    }, []);

    const totalRaces = calendar ? calendar.length : 24;

    // Safety check in case the API hasn't returned yet
    const rawDrivers = gameState.drivers || [];
    const rawAiTeams = gameState.ai_teams || {};

    // Calculate all drivers including those with 0 points
    const playerDriverNames = new Set(rawDrivers.map(d => d.name));
    const allDrivers = [
        ...rawDrivers.map(d => ({ name: d.name, pts: driverPoints[d.name] || 0 })),
        ...Object.values(rawAiTeams).flatMap(t => t.drivers.map(d => ({ name: d.name, pts: driverPoints[d.name] || 0 })))
    ].sort((a, b) => b.pts - a.pts);

    // Calculate all teams including those with 0 points
    const allTeams = [
        { name: gameState.team_name, pts: teamPoints[gameState.team_name] || 0 },
        ...Object.keys(rawAiTeams).map(name => ({ name, pts: teamPoints[name] || 0 }))
    ].sort((a, b) => b.pts - a.pts);

    const getOverallPerf = (targetCar) => {
        if (!targetCar) return 0;
        const aero = targetCar.aero.downforce + targetCar.aero.drag_efficiency;
        const chass = targetCar.chassis.weight_reduction + targetCar.chassis.tire_preservation;
        const power = targetCar.powertrain.power_output + targetCar.powertrain.reliability;
        return Math.round((aero + chass + power) / 6);
    };

    const getGridMaxPerf = () => {
        let maxPerf = getOverallPerf(car);
        Object.values(rawAiTeams).forEach(team => {
            const teamPerf = getOverallPerf(team.car);
            if (teamPerf > maxPerf) {
                maxPerf = teamPerf;
            }
        });
        return maxPerf;
    };

    const playerPerf = getOverallPerf(car);
    const gridMax = getGridMaxPerf();

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold tracking-tight text-white">Team Principal Dashboard</h1>
                        <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded uppercase border border-slate-600">
                            {gameState.difficulty || 'Normal'}
                        </span>
                    </div>
                    <p className="text-slate-400">Season {season} | Race {Math.min(totalRaces, current_race_index + 1)} of {totalRaces}</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex flex-col items-end mr-2 text-sm bg-slate-800/80 px-4 py-2 rounded-xl border border-f1accent/30">
                        <span className="text-f1accent font-bold text-base flex items-center gap-1">
                            <Activity size={16} />
                            {gameState.rd_manager?.resource_points || 0} RP
                        </span>
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                            <Users size={12} />
                            {(() => {
                                const total = gameState.rd_manager?.total_engineers || 0;
                                const activeDict = gameState.rd_manager?.active_projects || {};
                                const used = Object.values(activeDict).reduce((a, b) => a + b, 0);
                                return `${total - used} / ${total} Free Eng.`;
                            })()}
                        </span>
                    </div>

                    <button
                        onClick={() => onNavigate('rd')}
                        className="flex items-center gap-2 bg-f1panel hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all border border-slate-700 shadow-lg"
                    >
                        <Activity size={20} className="text-f1accent" /> Research & Development
                    </button>
                    <button
                        onClick={async () => {
                            if (current_race_index >= totalRaces) {
                                await fetch('http://localhost:8000/api/season/advance', { method: 'POST' });
                                if (refreshState) refreshState();
                            } else {
                                onNavigate('race');
                            }
                        }}
                        className="flex items-center gap-2 bg-f1accent hover:bg-blue-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-900/50"
                    >
                        <Calendar size={20} /> {current_race_index >= totalRaces ? "Start Year " + (season + 1) : "Advance to Next Race"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Finance Card */}
                <div className="bg-f1panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col">
                    <div className="flex items-center gap-3 mb-4 text-slate-400 font-medium uppercase tracking-wider text-sm">
                        <DollarSign size={18} className="text-f1green" /> Finances
                    </div>
                    <div className="mt-auto">
                        <p className="text-3xl font-bold text-white mb-2">${finance_manager.balance.toLocaleString()}</p>
                        <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                            <div className="bg-f1green h-2 rounded-full" style={{ width: `${(finance_manager.balance / finance_manager.cost_cap) * 100}%` }}></div>
                        </div>
                        <p className="text-sm text-slate-500 flex justify-between">
                            <span>Available Budget</span>
                            <span>Cap: ${finance_manager.cost_cap.toLocaleString()}</span>
                        </p>
                    </div>
                </div>

                {/* Car Dev Card */}
                <div className="bg-f1panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col">
                    <div className="flex items-center gap-3 mb-4 text-slate-400 font-medium uppercase tracking-wider text-sm">
                        <Activity size={18} className="text-f1accent" /> Car Performance
                    </div>
                    <div className="mt-auto">
                        <div className="flex items-end gap-2 mb-2">
                            <p className="text-4xl font-bold text-white">{playerPerf}</p>
                            <p className="text-lg text-slate-400 mb-1">/ {gridMax}</p>
                        </div>
                        <p className="text-sm text-slate-500">Estimated Grid Competitiveness</p>
                    </div>
                    <button
                        onClick={() => onNavigate('car_rankings')}
                        className="w-full mt-4 bg-f1accent/10 hover:bg-f1accent/20 border border-f1accent/30 text-f1accent py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                        View Grid Rankings
                    </button>
                </div>

                {/* Drivers Card */}
                <div className="bg-f1panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col">
                    <div className="flex items-center gap-3 mb-4 text-slate-400 font-medium uppercase tracking-wider text-sm">
                        <Users size={18} /> Driver Roster
                    </div>
                    <div className="space-y-3 mt-auto">
                        {gameState.drivers.map((d, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                                <span className="font-medium text-slate-200">{d.name}</span>
                                <span className="px-2 py-1 bg-slate-700 text-xs rounded-md text-f1accent font-bold">OVR {d.rating}</span>
                            </div>
                        ))}
                        <button
                            onClick={() => onNavigate('staff')}
                            className="w-full mt-4 bg-f1accent/10 hover:bg-f1accent/20 border border-f1accent/30 text-f1accent py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            Manage Staff Market
                        </button>
                    </div>
                </div>
            </div>

            {/* Championship Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[400px]">
                <div className="bg-f1panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-sm shrink-0">
                        <Trophy size={18} className="text-yellow-500" /> Driver's Championship
                    </div>
                    <div className="space-y-2 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {allDrivers.length > 0 ? allDrivers.map((item, index) => {
                            const isPlayer = playerDriverNames.has(item.name);
                            return (
                                <div key={item.name} className={`flex items-center justify-between p-2 rounded-lg ${isPlayer ? 'bg-f1accent/10 border border-f1accent/30' : 'hover:bg-slate-800/30'}`}>
                                    <div className="flex items-center gap-4">
                                        <span className={`w-6 text-center font-bold ${index === 0 ? 'text-yellow-500' : 'text-slate-500'}`}>{index + 1}</span>
                                        <span className={`font-medium ${isPlayer ? 'text-white' : 'text-slate-200'}`}>
                                            {item.name}
                                            {isPlayer && <span className="ml-2 text-xs text-f1accent border border-f1accent rounded px-1">YOU</span>}
                                            {item.name === championship_manager?.last_driver_champion && <Star size={14} className="inline ml-2 text-yellow-500 fill-yellow-500" />}
                                        </span>
                                    </div>
                                    <span className={`font-bold ${item.pts > 0 ? (isPlayer ? 'text-white' : 'text-f1accent') : 'text-slate-600'}`}>{item.pts} pts</span>
                                </div>
                            );
                        }) : <div className="text-center text-slate-600 italic py-8">No Competitors Found</div>}
                    </div>
                </div>

                <div className="bg-f1panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-sm shrink-0">
                        <Trophy size={18} className="text-yellow-500" /> Constructors' Championship
                    </div>
                    <div className="space-y-2 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {allTeams.length > 0 ? allTeams.map((item, index) => {
                            const isPlayer = item.name === gameState.team_name;
                            return (
                                <div key={item.name} className={`flex items-center justify-between p-2 rounded-lg ${isPlayer ? 'bg-f1accent/10 border border-f1accent/30' : 'hover:bg-slate-800/30'}`}>
                                    <div className="flex items-center gap-4">
                                        <span className={`w-6 text-center font-bold ${index === 0 ? 'text-yellow-500' : 'text-slate-500'}`}>{index + 1}</span>
                                        <span className={`font-medium ${isPlayer ? 'text-white' : 'text-slate-200'}`}>
                                            {item.name}
                                            {isPlayer && <span className="ml-2 text-xs text-f1accent border border-f1accent rounded px-1">YOU</span>}
                                            {item.name === championship_manager?.last_constructor_champion && <Star size={14} className="inline ml-2 text-yellow-500 fill-yellow-500" />}
                                        </span>
                                    </div>
                                    <span className={`font-bold ${item.pts > 0 ? (isPlayer ? 'text-white' : 'text-f1accent') : 'text-slate-600'}`}>{item.pts} pts</span>
                                </div>
                            );
                        }) : <div className="text-center text-slate-600 italic py-8">No Teams Found</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
