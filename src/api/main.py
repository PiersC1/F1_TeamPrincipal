import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Add the project root to the python path so 'from src...' works
# We need to figure out the path properly based on directory structure
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# Add desktop folder too just in case 
sys.path.append("/Users/pierschatham/Desktop/projects/F1_TeamPrinciple")

from src.models.game_state import GameState
from src.utils.save_load_manager import SaveLoadManager
from src.simulators.race_simulator import RaceSimulator
from src.database.track_database import TrackDatabase
from src.models.personnel.driver import Driver

app = FastAPI(title="F1 Team Principal API", version="1.0.0")

# Allow CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production this should be the React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory game state
game_state = GameState()
save_manager = SaveLoadManager()

def init_new_game():
    """Initializes dummy data if no save file exists."""
    global game_state
    game_state = GameState()
    d1 = Driver("Player Driver 1", 5_000_000, rating=85, speed=88, consistency=90, tire_management=80)
    d2 = Driver("Player Driver 2", 2_000_000, rating=75, speed=78, consistency=70, tire_management=75)
    game_state.drivers.extend([d1, d2])

# Try to load existing save on boot
_loaded_data = save_manager.load_game("slot1")
if _loaded_data:
    game_state.load_from_dict(_loaded_data)
else:
    init_new_game()

# --- Pydantic Models for Input ---
class RaceSimRequest(BaseModel):
    strategy: str

class RDBuyRequest(BaseModel):
    node_id: str

# --- API Endpoints ---

@app.get("/api/state")
def get_game_state():
    """Returns the full serialized game state to the React frontend."""
    return game_state.to_dict()

@app.get("/api/calendar")
def get_calendar():
    """Returns the static 10-race calendar with track metadata."""
    calendar = TrackDatabase.get_calendar()
    return {"tracks": [t.to_dict() for t in calendar]}

@app.post("/api/cheat/money")
def cheat_money():
    """Adds $10M to budget."""
    game_state.finance_manager.cheat_add_funds(10_000_000)
    save_manager.save_game("slot1", game_state.to_dict())
    return {"status": "success", "new_balance": game_state.finance_manager.balance}

@app.post("/api/rd/start")
def start_rd_project(request: RDBuyRequest):
    """Attempts to start an R&D project."""
    node = game_state.rd_manager.nodes.get(request.node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found.")
        
    if node.state != "AVAILABLE":
        raise HTTPException(status_code=400, detail="Project not available.")
        
    if game_state.finance_manager.spend(node.cost):
        if game_state.rd_manager.start_project(request.node_id):
            save_manager.save_game("slot1", game_state.to_dict())
            return {"status": "success"}
            
    raise HTTPException(status_code=400, detail="Not enough funds or already researching.")

@app.post("/api/race/simulate")
def simulate_race(request: RaceSimRequest):
    """Calculates Quali grid, runs the RaceSimulator, updates Championship points, and advances time."""
    calendar = TrackDatabase.get_calendar()
    
    if game_state.current_race_index >= len(calendar):
        return {"status": "season_complete"}
        
    track = calendar[game_state.current_race_index]
    entries = game_state.get_all_race_entries()
    
    # Simple Quali pace sort
    q_sim = RaceSimulator(entries, track)
    for e in entries:
        e.current_lap_time = q_sim._calculate_lap_time(e)
    entries = sorted(entries, key=lambda e: e.current_lap_time)
    
    grid = [{"driver": e.driver.name, "team": e.team_name, "time": f"{e.current_lap_time:.3f}"} for e in entries]

    # Full Simulation
    simulator = RaceSimulator(entries, track)
    results = simulator.run_race()
    
    # Payout Points
    game_state.championship_manager.score_points(results["standings"])
    
    # Time progression
    game_state.current_race_index += 1
    game_state.rd_manager.advance_time(1)
    
    save_manager.save_game("slot1", game_state.to_dict())

    return {
        "status": "success",
        "track": track.name,
        "strategy_used": request.strategy,
        "grid": grid,
        "race_results": results["standings"]
    }
