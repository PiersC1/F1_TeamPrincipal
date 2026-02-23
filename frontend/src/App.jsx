import React, { useState, useEffect } from 'react';
import MainMenu from './components/MainMenu';
import Dashboard from './components/Dashboard';
import RDTree from './components/RDTree';
import RaceWeekend from './components/RaceWeekend';
import StaffMarket from './components/StaffMarket';
import CarRankings from './components/CarRankings';

function App() {
  const [gameState, setGameState] = useState(null);
  const [currentView, setCurrentView] = useState('main_menu'); // 'main_menu', 'dashboard', 'rd', 'race'

  const fetchState = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/state');
      const data = await res.json();

      if (data.status === "no_save_loaded") {
        setCurrentView('main_menu');
        setGameState(null);
      } else {
        setGameState(data);
        // Only force dashboard if they were stuck on menu
        if (currentView === 'main_menu') {
          setCurrentView('dashboard');
        }
      }
    } catch (err) {
      console.error("Failed to fetch game state. Is FastAPI running?", err);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleSave = async () => {
    await fetch('http://localhost:8000/api/save', { method: 'POST' });
  };

  const handleQuit = async () => {
    await fetch('http://localhost:8000/api/quit', { method: 'POST' });
    fetchState();
  };

  const handleCheat = async () => {
    await fetch('http://localhost:8000/api/cheat/money', { method: 'POST' });
    fetchState();
  };

  return (
    <div className="h-screen w-screen bg-f1dark text-white overflow-hidden flex flex-col">
      {/* Top Navbar */}
      <nav className="h-16 bg-f1panel border-b border-slate-800 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
          <div className="w-8 h-8 bg-f1red rounded border-2 border-white flex items-center justify-center font-black italic">F1</div>
          <span className="font-bold tracking-widest uppercase">Team Principal Simulator</span>
        </div>
        <div className="flex items-center gap-4">
          {gameState && (
            <>
              <span className="text-slate-400 text-sm border-r border-slate-700 pr-4">
                {gameState.team_name} - {gameState.save_slot}
              </span>
              <button onClick={handleSave} className="text-xs text-f1accent hover:text-white border border-f1accent/30 px-3 py-1 rounded transition-colors">
                Save Game
              </button>
              <button onClick={handleQuit} className="text-xs text-f1red hover:text-white border border-f1red/30 px-3 py-1 rounded transition-colors mr-4 border-r border-slate-700">
                Quit
              </button>
            </>
          )}
          <button onClick={handleCheat} className="text-xs text-yellow-500 hover:text-white border border-yellow-500/30 px-3 py-1 rounded">
            Cheat (+10M)
          </button>
        </div>
      </nav>

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {currentView === 'main_menu' && <MainMenu onNavigate={setCurrentView} refreshState={fetchState} />}
        {currentView === 'dashboard' && <Dashboard gameState={gameState} onNavigate={setCurrentView} refreshState={fetchState} />}
        {currentView === 'rd' && <RDTree gameState={gameState} onNavigate={setCurrentView} refreshState={fetchState} />}
        {currentView === 'race' && <RaceWeekend gameState={gameState} onNavigate={setCurrentView} refreshState={fetchState} />}
        {currentView === 'staff' && <StaffMarket gameState={gameState} onNavigate={setCurrentView} refreshState={fetchState} />}
        {currentView === 'car_rankings' && <CarRankings gameState={gameState} onNavigate={setCurrentView} />}
      </main>
    </div>
  );
}

export default App;
