import React from 'react';
import { ChevronLeft, Activity, Shield, Wind, Zap } from 'lucide-react';

const CarRankings = ({ gameState, onNavigate }) => {
    if (!gameState) return null;

    const { car, ai_teams, team_name } = gameState;

    const getCarStats = (targetCar) => {
        if (!targetCar) return { aero: 0, chassis: 0, power: 0, overall: 0 };
        const aero = Math.round((targetCar.aero.downforce + targetCar.aero.drag_efficiency) / 2);
        const chassis = Math.round((targetCar.chassis.weight_reduction + targetCar.chassis.tire_preservation) / 2);
        const power = Math.round((targetCar.powertrain.power_output + targetCar.powertrain.reliability) / 2);
        const overall = Math.round((aero + chassis + power) / 3);
        return { aero, chassis, power, overall };
    };

    const playerStats = { name: team_name, isPlayer: true, ...getCarStats(car) };

    const aiStats = Object.keys(ai_teams).map(name => ({
        name,
        isPlayer: false,
        ...getCarStats(ai_teams[name].car)
    }));

    const allTeams = [playerStats, ...aiStats].sort((a, b) => b.overall - a.overall);

    const highestOverall = allTeams[0].overall;

    return (
        <div className="flex flex-col h-full space-y-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => onNavigate('dashboard')}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Activity className="text-f1accent" size={28} />
                    Grid Performance Rankings
                </h1>
            </div>

            <div className="bg-f1panel rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-800 bg-slate-800/50 text-slate-400 font-bold text-sm tracking-wider uppercase">
                    <div className="col-span-1 text-center">Pos</div>
                    <div className="col-span-5">Constructor</div>
                    <div className="col-span-2 text-center flex items-center justify-center gap-1"><Wind size={14} /> Aero</div>
                    <div className="col-span-2 text-center flex items-center justify-center gap-1"><Shield size={14} /> Chassis</div>
                    <div className="col-span-2 text-center flex items-center justify-center gap-1"><Zap size={14} /> Power</div>
                </div>

                <div className="divide-y divide-slate-800/50">
                    {allTeams.map((team, index) => (
                        <div
                            key={team.name}
                            className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors ${team.isPlayer ? 'bg-f1accent/10 hover:bg-f1accent/20' : 'hover:bg-slate-800/30'
                                }`}
                        >
                            <div className="col-span-1 text-center font-bold text-slate-500">
                                {index + 1}
                            </div>

                            <div className="col-span-5 flex items-center gap-3">
                                <div>
                                    <div className={`font-bold text-lg ${team.isPlayer ? 'text-white' : 'text-slate-200'}`}>
                                        {team.name}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-48 bg-slate-800 rounded-full h-1.5 hidden md:block">
                                            <div
                                                className={`h-1.5 rounded-full ${team.isPlayer ? 'bg-f1accent' : 'bg-slate-500'}`}
                                                style={{ width: `${(team.overall / highestOverall) * 100}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold ${team.isPlayer ? 'text-f1accent' : 'text-slate-400'}`}>
                                            {team.overall} OVR
                                        </span>
                                    </div>
                                </div>
                                {team.isPlayer && (
                                    <span className="px-2 py-0.5 bg-f1accent text-slate-900 text-[10px] font-bold rounded uppercase ml-auto">
                                        Player
                                    </span>
                                )}
                            </div>

                            <div className="col-span-2 text-center font-mono text-slate-300">
                                {team.aero}
                            </div>
                            <div className="col-span-2 text-center font-mono text-slate-300">
                                {team.chassis}
                            </div>
                            <div className="col-span-2 text-center font-mono text-slate-300">
                                {team.power}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CarRankings;
