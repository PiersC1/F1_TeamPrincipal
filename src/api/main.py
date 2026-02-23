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
# We keep a placeholder default state until 'load' or 'new_game' is called.
game_state = GameState()
save_manager = SaveLoadManager()
is_game_loaded = False # Useful flag for the frontend to know if menu is needed

# --- Dummy Rookie Pool generator ---
def get_rookie_pool():
    return [
        Driver("Liam Lawson", 1_500_000, 78, 80, 75, 74),
        Driver("Oliver Bearman", 1_200_000, 76, 79, 72, 70),
        Driver("Kimi Antonelli", 1_800_000, 79, 83, 70, 71),
        Driver("Jack Doohan", 1_000_000, 75, 76, 74, 75),
        Driver("Theo Pourchaire", 1_100_000, 77, 78, 76, 74),
        Driver("Felipe Drugovich", 1_000_000, 76, 75, 78, 77)
    ]

# --- Pydantic Models for Input ---
class RaceSimRequest(BaseModel):
    strategy: str

class RDBuyRequest(BaseModel):
    node_id: str

class LoadRequest(BaseModel):
    slot: str

class NewGameExistingRequest(BaseModel):
    team_name: str
    save_slot: str = "slot1"

class NewGameCustomRequest(BaseModel):
    team_name: str
    driver1_name: str
    driver2_name: str
    competitiveness: str # "Backmarker", "Midfield", "Front Runner"
    save_slot: str = "slot1"

# --- API Endpoints ---

@app.get("/api/state")
def get_game_state():
    """Returns the full serialized game state to the React frontend."""
    if not is_game_loaded:
        return {"status": "no_save_loaded"}
    return game_state.to_dict()

# --- Main Menu Endpoints ---
@app.get("/api/saves")
def get_saves():
    return {"saves": save_manager.get_save_slots()}

@app.post("/api/load")
def load_game(req: LoadRequest):
    global game_state, is_game_loaded
    data = save_manager.load_game(req.slot)
    if not data:
        raise HTTPException(status_code=404, detail="Save not found")
    game_state = GameState()
    game_state.load_from_dict(data)
    is_game_loaded = True
    return {"status": "success"}

@app.get("/api/teams/available")
def get_available_teams():
    from src.database.team_database import TeamDatabase
    teams = TeamDatabase.get_initial_teams()
    return {"teams": list(teams.keys())}
    
@app.get("/api/drivers/available")
def get_available_drivers():
    pool = get_rookie_pool()
    return {"drivers": [d.to_dict() for d in pool]}

@app.post("/api/new_game/existing")
def new_game_existing(req: NewGameExistingRequest):
    global game_state, is_game_loaded
    from src.database.team_database import TeamDatabase
    
    db = TeamDatabase.get_initial_teams()
    if req.team_name not in db:
        raise HTTPException(status_code=404, detail="Team not found in DB")
        
    team_data = db[req.team_name]
    game_state = GameState()
    game_state.team_name = req.team_name
    game_state.finance_manager.balance = team_data["budget"]
    game_state.car = team_data["car"]
    game_state.drivers = team_data["drivers"]
    
    # Prunes the AI opponents
    game_state.initialize_ai_grid()
    
    is_game_loaded = True
    save_manager.save_game(req.save_slot, game_state.to_dict())
    return {"status": "success"}

@app.post("/api/new_game/custom")
def new_game_custom(req: NewGameCustomRequest):
    global game_state, is_game_loaded
    game_state = GameState()
    game_state.team_name = req.team_name
    
    # 1. Grab Drivers
    pool = get_rookie_pool()
    d1 = next((d for d in pool if d.name == req.driver1_name), pool[0])
    d2 = next((d for d in pool if d.name == req.driver2_name), pool[1])
    game_state.drivers = [d1, d2]
    
    # 2. Setup Competitiveness
    comp = req.competitiveness.lower()
    from src.models.car.car import Car
    game_state.car = Car()
    if comp == "front runner":
        game_state.car.aero.downforce = 92; game_state.car.aero.drag_efficiency = 90
        game_state.car.chassis.weight_reduction = 90; game_state.car.chassis.tire_preservation = 88
        game_state.car.powertrain.power_output = 93; game_state.car.powertrain.reliability = 90
        game_state.finance_manager.balance = 140_000_000
    elif comp == "midfield":
        game_state.car.aero.downforce = 82; game_state.car.aero.drag_efficiency = 80
        game_state.car.chassis.weight_reduction = 80; game_state.car.chassis.tire_preservation = 78
        game_state.car.powertrain.power_output = 85; game_state.car.powertrain.reliability = 82
        game_state.finance_manager.balance = 80_000_000
    else: # Backmarker
        game_state.car.aero.downforce = 72; game_state.car.aero.drag_efficiency = 70
        game_state.car.chassis.weight_reduction = 70; game_state.car.chassis.tire_preservation = 68
        game_state.car.powertrain.power_output = 75; game_state.car.powertrain.reliability = 70
        game_state.finance_manager.balance = 50_000_000
    
    # Setup grid
    game_state.initialize_ai_grid()
        
    is_game_loaded = True
    save_manager.save_game(req.save_slot, game_state.to_dict())
    return {"status": "success"}

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
