import React, { useState, useEffect } from 'react';
import { Play, FolderOpen, Plus, Trophy, ArrowLeft, Settings, Users } from 'lucide-react';

const MainMenu = ({ onNavigate, refreshState }) => {
    const [menuState, setMenuState] = useState('main'); // main, load, new_type, new_existing, new_custom
    const [saves, setSaves] = useState([]);
    const [teams, setTeams] = useState([]);
    const [drivers, setDrivers] = useState([]);

    // Form States
    const [saveSlotName, setSaveSlotName] = useState('slot1');
    const [customTeamName, setCustomTeamName] = useState('My Custom Team');
    const [selectedDriver1, setSelectedDriver1] = useState('');
    const [selectedDriver2, setSelectedDriver2] = useState('');
    const [competitiveness, setCompetitiveness] = useState('Midfield');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const fetchSaves = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/saves');
            const data = await res.json();
            setSaves(data.saves);
        } catch (e) { console.error(e); }
    };

    const fetchTeams = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/teams/available');
            const data = await res.json();
            setTeams(data.teams);
        } catch (e) { console.error(e); }
    };

    const fetchDrivers = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/drivers/available');
            const data = await res.json();
            setDrivers(data.drivers);
            if (data.drivers.length >= 2) {
                setSelectedDriver1(data.drivers[0].name);
                setSelectedDriver2(data.drivers[1].name);
            }
        } catch (e) { console.error(e); }
    };

    const handleLoadGame = async (slot) => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slot })
            });
            if (res.ok) {
                await refreshState();
                onNavigate('dashboard');
            } else {
                setErrorMsg("Failed to load save.");
            }
        } catch (e) {
            setErrorMsg("Network error.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewExisting = async (teamName) => {
        if (!saveSlotName) return;
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/new_game/existing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_name: teamName, save_slot: saveSlotName })
            });
            if (res.ok) {
                await refreshState();
                onNavigate('dashboard');
            } else {
                setErrorMsg("Failed to create game.");
            }
        } catch (e) {
            setErrorMsg("Network error.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewCustom = async () => {
        if (!saveSlotName || !customTeamName) return;
        if (selectedDriver1 === selectedDriver2) {
            setErrorMsg("Select two different drivers.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/new_game/custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_name: customTeamName,
                    driver1_name: selectedDriver1,
                    driver2_name: selectedDriver2,
                    competitiveness: competitiveness,
                    save_slot: saveSlotName
                })
            });
            if (res.ok) {
                await refreshState();
                onNavigate('dashboard');
            } else {
                setErrorMsg("Failed to create custom game.");
            }
        } catch (e) {
            setErrorMsg("Network error.");
        } finally {
            setLoading(false);
        }
    };

    // --- Render Views ---

    if (menuState === 'main') {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-8">
                <div className="text-center mb-12">
                    <div className="w-24 h-24 mx-auto bg-f1red rounded-2xl border-4 border-white flex items-center justify-center font-black italic text-5xl mb-6 shadow-[0_0_30px_rgba(238,0,0,0.5)]">F1</div>
                    <h1 className="text-6xl font-black italic tracking-tighter uppercase mb-2">Team Principal</h1>
                    <p className="text-f1accent text-xl tracking-widest uppercase font-medium">Simulator 2026</p>
                </div>

                <div className="space-y-4 w-96">
                    <button
                        onClick={() => setMenuState('new_type')}
                        className="w-full bg-white hover:bg-slate-200 text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors text-lg"
                    >
                        <Play size={24} /> New Career
                    </button>
                    <button
                        onClick={() => { fetchSaves(); setMenuState('load'); }}
                        className="w-full bg-f1panel hover:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 border border-slate-700 transition-colors text-lg"
                    >
                        <FolderOpen size={24} className="text-f1accent" /> Load Career
                    </button>
                </div>
            </div>
        );
    }

    if (menuState === 'load') {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full">
                <div className="w-full flex items-center mb-8">
                    <button onClick={() => { setMenuState('main'); setErrorMsg(''); }} className="text-slate-400 hover:text-white flex items-center gap-2"><ArrowLeft size={20} /> Back</button>
                    <h2 className="text-3xl font-bold ml-auto mr-auto">Load Career</h2>
                </div>

                {errorMsg && <p className="text-f1red mb-4">{errorMsg}</p>}

                <div className="w-full bg-f1panel rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4">
                    {saves.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No save files found.</p>
                    ) : (
                        saves.map(s => (
                            <div key={s} className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <span className="font-medium text-lg text-white">{s}</span>
                                <button
                                    onClick={() => handleLoadGame(s)}
                                    disabled={loading}
                                    className="px-6 py-2 bg-f1accent text-slate-900 font-bold rounded-lg hover:bg-blue-400 transition-colors"
                                >
                                    Load Game
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    if (menuState === 'new_type') {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full space-y-8">
                <div className="w-full flex items-center mb-4">
                    <button onClick={() => setMenuState('main')} className="text-slate-400 hover:text-white flex items-center gap-2"><ArrowLeft size={20} /> Cancel</button>
                    <h2 className="text-3xl font-bold ml-auto mr-auto">Career Path</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <button
                        onClick={() => { fetchTeams(); setMenuState('new_existing'); }}
                        className="bg-f1panel hover:bg-slate-700 p-8 rounded-2xl border border-slate-700 flex flex-col items-center gap-4 transition-all text-left"
                    >
                        <Trophy size={48} className="text-yellow-500 mb-2" />
                        <h3 className="text-xl font-bold text-white text-center">Take Over Team</h3>
                        <p className="text-slate-400 text-sm text-center">Inherit the struggles and triumphs of an existing 2024 Formula 1 constructor.</p>
                    </button>

                    <button
                        onClick={() => { fetchDrivers(); setMenuState('new_custom'); }}
                        className="bg-f1panel hover:bg-slate-700 p-8 rounded-2xl border border-slate-700 flex flex-col items-center gap-4 transition-all text-left"
                    >
                        <Plus size={48} className="text-f1accent mb-2" />
                        <h3 className="text-xl font-bold text-white text-center">Create Custom Team</h3>
                        <p className="text-slate-400 text-sm text-center">Build an 11th team from the ground up. Hire rookies and establish your baseline car performance.</p>
                    </button>
                </div>
            </div>
        );
    }

    if (menuState === 'new_existing') {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full">
                <div className="w-full flex items-center mb-8">
                    <button onClick={() => { setMenuState('new_type'); setErrorMsg(''); }} className="text-slate-400 hover:text-white flex items-center gap-2"><ArrowLeft size={20} /> Back</button>
                    <h2 className="text-3xl font-bold ml-auto mr-auto text-center">Pick Your Team</h2>
                </div>

                {errorMsg && <p className="text-f1red mb-4">{errorMsg}</p>}

                <div className="w-full bg-f1panel p-6 rounded-2xl border border-slate-700 mb-6">
                    <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wide">Save File Name</label>
                    <input
                        type="text"
                        value={saveSlotName}
                        onChange={e => setSaveSlotName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-f1accent mb-4"
                    />
                </div>

                <div className="w-full grid grid-cols-2 gap-4">
                    {teams.map(t => (
                        <button
                            key={t}
                            onClick={() => handleNewExisting(t)}
                            disabled={loading}
                            className="bg-slate-800 hover:bg-f1accent hover:text-slate-900 border border-slate-700 text-white font-bold p-4 rounded-xl transition-all"
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (menuState === 'new_custom') {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full pt-8 pb-8 overflow-y-auto">
                <div className="w-full flex items-center mb-8 shrink-0">
                    <button onClick={() => { setMenuState('new_type'); setErrorMsg(''); }} className="text-slate-400 hover:text-white flex items-center gap-2"><ArrowLeft size={20} /> Back</button>
                    <h2 className="text-3xl font-bold ml-auto mr-auto text-center">Team Identity</h2>
                </div>

                {errorMsg && <p className="text-f1red mb-4">{errorMsg}</p>}

                <div className="w-full bg-f1panel p-8 rounded-2xl border border-slate-700 space-y-6">

                    <div>
                        <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wide">Save File Name</label>
                        <input type="text" value={saveSlotName} onChange={e => setSaveSlotName(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-f1accent" />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wide">Custom Team Name</label>
                        <input type="text" value={customTeamName} onChange={e => setCustomTeamName(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-f1accent" />
                    </div>

                    <div className="pt-4 border-t border-slate-700 grid grid-cols-2 gap-6">
                        <div>
                            <label className="flex items-center gap-2 text-slate-400 text-sm font-bold mb-2 uppercase tracking-wide"><Users size={16} /> Driver 1</label>
                            <select value={selectedDriver1} onChange={e => setSelectedDriver1(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-f1accent">
                                {drivers.map(d => <option key={d.name} value={d.name}>{d.name} (OVR {d.rating})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-slate-400 text-sm font-bold mb-2 uppercase tracking-wide"><Users size={16} /> Driver 2</label>
                            <select value={selectedDriver2} onChange={e => setSelectedDriver2(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-f1accent">
                                {drivers.map(d => <option key={d.name} value={d.name}>{d.name} (OVR {d.rating})</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                        <label className="flex items-center gap-2 text-slate-400 text-sm font-bold mb-2 uppercase tracking-wide"><Settings size={16} /> Starting Competitiveness</label>
                        <div className="grid grid-cols-3 gap-4">
                            {['Backmarker', 'Midfield', 'Front Runner'].map(tier => (
                                <button
                                    key={tier}
                                    onClick={() => setCompetitiveness(tier)}
                                    className={`p-3 rounded-lg border font-bold text-sm transition-all ${competitiveness === tier ? 'bg-f1accent text-slate-900 border-f1accent' : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-400'}`}
                                >
                                    {tier}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-3 text-center">
                            {competitiveness === 'Backmarker' && "Lowest car stats. Only $50M starting budget."}
                            {competitiveness === 'Midfield' && "Average car stats. Standard $80M starting budget."}
                            {competitiveness === 'Front Runner' && "High car stats. Maximum $140M starting budget."}
                        </p>
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={handleNewCustom}
                            disabled={loading}
                            className="w-full bg-f1green hover:bg-green-500 text-slate-900 font-bold py-4 rounded-xl transition-all text-lg shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                        >
                            Establish Team
                        </button>
                    </div>

                </div>
            </div>
        );
    }

    return null;
};

export default MainMenu;
