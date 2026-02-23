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

def _ensure_state(allow_missing=False):
    """Auto-recovers the GameState from disk if the backend restarts during a session."""
    global game_state, is_game_loaded
    if not is_game_loaded:
        last_slot = save_manager.get_last_active_slot()
        if last_slot:
            data = save_manager.load_game(last_slot)
            if data:
                game_state = GameState()
                game_state.load_from_dict(data)
                is_game_loaded = True
                
        if not is_game_loaded and not allow_missing:
            raise HTTPException(status_code=400, detail="No active game loaded and no save found.")

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
    d1_strategy: list[dict]
    d2_strategy: list[dict]

class RDBuyRequest(BaseModel):
    node_id: str

class RDAllocateRequest(BaseModel):
    node_id: str
    new_amount: int

class HireRequest(BaseModel):
    slot: str
    staff_id: str

class FireRequest(BaseModel):
    slot: str

class LoadRequest(BaseModel):
    slot: str

class NewGameExistingRequest(BaseModel):
    team_name: str
    difficulty: str = "Normal"
    save_slot: str = "slot1"

class NewGameCustomRequest(BaseModel):
    team_name: str
    driver1_name: str
    driver2_name: str
    competitiveness: str # "Backmarker", "Midfield", "Front Runner"
    difficulty: str = "Normal"
    save_slot: str = "slot1"

# --- API Endpoints ---

@app.post("/api/save")
def manual_save_game():
    """Manually saves the game to the active slot."""
    _ensure_state()
    save_manager.save_game(game_state.save_slot, game_state.to_dict())
    return {"status": "success", "slot": game_state.save_slot}

@app.post("/api/quit")
def quit_game():
    """Unloads the game state and returns to main menu context."""
    global game_state, is_game_loaded
    game_state = GameState()
    is_game_loaded = False
    save_manager.clear_last_active_slot()
    return {"status": "success"}

@app.get("/api/state")
def get_game_state():
    """Returns the full serialized game state to the React frontend."""
    _ensure_state(allow_missing=True)
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
    save_manager.set_last_active_slot(req.slot)
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
    game_state.difficulty = req.difficulty.capitalize()
    game_state.finance_manager.balance = team_data["budget"]
    game_state.car = team_data["car"]
    game_state.drivers = team_data["drivers"]
    
    # Ensure R&D is linked to this team's car!
    game_state.relink_rd_manager()
    
    # Prunes the AI opponents
    game_state.initialize_ai_grid()
    
    is_game_loaded = True
    game_state.save_slot = req.save_slot
    save_manager.set_last_active_slot(req.save_slot)
    save_manager.save_game(req.save_slot, game_state.to_dict())
    return {"status": "success"}

@app.post("/api/new_game/custom")
def new_game_custom(req: NewGameCustomRequest):
    global game_state, is_game_loaded
    game_state = GameState()
    game_state.team_name = req.team_name
    game_state.difficulty = req.difficulty.capitalize()
    
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
    
    # Ensure R&D is linked to this new car object
    game_state.relink_rd_manager()

    # Setup grid
    game_state.initialize_ai_grid()
        
    is_game_loaded = True
    game_state.save_slot = req.save_slot
    save_manager.set_last_active_slot(req.save_slot)
    save_manager.save_game(req.save_slot, game_state.to_dict())
    return {"status": "success"}

@app.get("/api/calendar")
def get_calendar():
    """Returns the static 10-race calendar with track metadata."""
    calendar = TrackDatabase.get_calendar()
    return {"tracks": [t.to_dict() for t in calendar]}

@app.post("/api/season/advance")
def advance_season():
    """Ends the current season, records champions, clears points, and loops the calendar, paying out prize money."""
    global game_state, is_game_loaded
    _ensure_state()
        
    # Calculate Prize Money
    team_points = game_state.championship_manager.constructor_standings.get(game_state.team_name, 0)
    prize_money = 50_000_000 + (team_points * 200_000)
    game_state.finance_manager.balance += prize_money
    
    game_state.championship_manager.end_season()
    game_state.process_yearly_aging()
    game_state.season += 1
    game_state.current_race_index = 0
    save_manager.save_game(game_state.save_slot, game_state.to_dict())
    return {"status": "success", "prize_money": prize_money}

@app.post("/api/cheat/money")
def cheat_money():
    """Adds $10M to budget."""
    _ensure_state()
    game_state.finance_manager.cheat_add_funds(10_000_000)
    save_manager.save_game(game_state.save_slot, game_state.to_dict())
    return {"status": "success", "new_balance": game_state.finance_manager.balance}

@app.post("/api/rd/start")
def start_rd_project(request: RDBuyRequest):
    """Attempts to start an R&D project."""
    _ensure_state()
    if game_state.rd_manager.start_project(request.node_id):
        save_manager.save_game(game_state.save_slot, game_state.to_dict())
        return {"status": "success"}
        
    raise HTTPException(status_code=400, detail="Not enough Resource Points or invalid node.")

@app.post("/api/rd/allocate")
def allocate_rd_project(request: RDAllocateRequest):
    """Attempts to assign or unassign engineers to an active R&D project."""
    _ensure_state()
    if game_state.rd_manager.allocate_engineers(request.node_id, request.new_amount):
        save_manager.save_game(game_state.save_slot, game_state.to_dict())
        return {"status": "success"}
        
    raise HTTPException(status_code=400, detail="Not enough free engineers or node not active.")

# --- Staff Market Endpoints ---
@app.get("/api/staff/market")
def get_staff_market():
    """Returns the available free agents."""
    _ensure_state()
        
    market = {}
    for role, lst in game_state.staff_market.items():
        market[role] = [s.to_dict() for s in lst]
    return {"market": market}

@app.post("/api/staff/hire")
def hire_staff(req: HireRequest):
    """Hires a staff member from the market and optionally fires/replaces the incumbent."""
    _ensure_state()
    # Find the target staff in the market
    target_role = None
    target_staff = None
    
    for r, lst in game_state.staff_market.items():
        for s in lst:
            if s.id == req.staff_id:
                target_role = r
                target_staff = s
                break
        if target_staff:
            break
            
    if not target_staff:
        raise HTTPException(status_code=404, detail="Staff member not found in market.")
        
    # Determine the slot to replace
    incumbent = None
    if req.slot == "driver_0":
        incumbent = game_state.drivers[0]
    elif req.slot == "driver_1":
        incumbent = game_state.drivers[1]
    elif req.slot == "technical_director":
        incumbent = game_state.technical_director
    elif req.slot == "head_of_aero":
        incumbent = game_state.head_of_aero
    elif req.slot == "powertrain_lead":
        incumbent = game_state.powertrain_lead
    else:
        raise HTTPException(status_code=400, detail="Invalid slot.")
        
    # Calculate costs
    signing_bonus = int(target_staff.salary * 0.5)
    severance = 0
    if incumbent:
        severance = int(incumbent.salary * incumbent.contract_length_years * 0.5)
        
    total_cost = signing_bonus + severance
    
    if not game_state.finance_manager.spend(total_cost):
        raise HTTPException(status_code=400, detail=f"Cannot afford ${total_cost:,} total cost (Signing + Severance).")
        
    # Execute the swap
    game_state.staff_market[target_role].remove(target_staff)
    if incumbent:
        # Put the incumbent back into the market
        market_list_key = target_role # Will be the same type
        if market_list_key not in game_state.staff_market:
            game_state.staff_market[market_list_key] = []
        game_state.staff_market[market_list_key].append(incumbent)
        
    # Assign the new staff
    if req.slot == "driver_0":
        game_state.drivers[0] = target_staff
    elif req.slot == "driver_1":
        game_state.drivers[1] = target_staff
    elif req.slot == "technical_director":
        game_state.technical_director = target_staff
    elif req.slot == "head_of_aero":
        game_state.head_of_aero = target_staff
        game_state.relink_rd_manager()
    elif req.slot == "powertrain_lead":
        game_state.powertrain_lead = target_staff
        game_state.relink_rd_manager()
        
    save_manager.save_game(game_state.save_slot, game_state.to_dict())
    return {"status": "success", "signing_bonus": signing_bonus, "severance": severance}

@app.post("/api/staff/fire")
def fire_staff(req: FireRequest):
    """Fires a staff member without directly replacing them (if allowed). Drivers cannot be fired without replacement."""
    _ensure_state()
    if req.slot in ["driver_0", "driver_1"]:
        raise HTTPException(status_code=400, detail="Drivers must be replaced via hiring, cannot be left empty.")
        
    incumbent = None
    market_list_key = ""
    
    if req.slot == "technical_director":
        incumbent = game_state.technical_director
        market_list_key = "technical_directors"
    elif req.slot == "head_of_aero":
        incumbent = game_state.head_of_aero
        market_list_key = "head_of_aero"
    elif req.slot == "powertrain_lead":
        incumbent = game_state.powertrain_lead
        market_list_key = "powertrain_leads"
    else:
        raise HTTPException(status_code=400, detail="Invalid slot.")
        
    if not incumbent:
        raise HTTPException(status_code=400, detail="Slot is already empty.")
        
    severance = int(incumbent.salary * incumbent.contract_length_years * 0.5)
    if not game_state.finance_manager.spend(severance):
        raise HTTPException(status_code=400, detail=f"Cannot afford ${severance:,} severance.")
        
    # Execute firing
    game_state.staff_market[market_list_key].append(incumbent)
    
    if req.slot == "technical_director":
        game_state.technical_director = None
    elif req.slot == "head_of_aero":
        game_state.head_of_aero = None
        game_state.relink_rd_manager()
    elif req.slot == "powertrain_lead":
        game_state.powertrain_lead = None
        game_state.relink_rd_manager()
        
    save_manager.save_game(game_state.save_slot, game_state.to_dict())
    return {"status": "success", "severance": severance}


@app.get("/api/race/tire_estimates")
def get_tire_estimates():
    """Calculates expected lap life for Soft, Medium, and Hard tires based on the upcoming track's wear multiplier."""
    _ensure_state()
    calendar = TrackDatabase.get_calendar()
    if game_state.current_race_index >= len(calendar):
        return {"status": "season_complete"}
        
    track = calendar[game_state.current_race_index]
    multiplier = track.tire_wear_multiplier
    
    # We define the max "safe" wear as around 60%, before the cliff hits.
    # Base wear is 2.1 per lap at 1.0x multiplier.
    base_wear_per_lap = 2.1 * multiplier
    
    from src.models.car.tire.tire_compound import COMPOUNDS
    
    estimates = {}
    for name, compound in COMPOUNDS.items():
        wear_per_lap = base_wear_per_lap * compound.wear_rate
        # Calculate how many laps it takes to hit 65% wear (the theoretical optimal stop window)
        estimated_laps = int(65.0 / wear_per_lap) if wear_per_lap > 0 else 0
        estimates[name] = {"laps": estimated_laps, "pace": compound.pace_advantage}
        
    return {
        "status": "success",
        "track": track.name,
        "total_laps": track.laps,
        "multiplier": multiplier,
        "estimates": estimates
    }

@app.post("/api/race/simulate")
def simulate_race(request: RaceSimRequest):
    """Calculates Quali grid, runs the RaceSimulator, updates Championship points, and advances time."""
    _ensure_state()
    calendar = TrackDatabase.get_calendar()
    
    if game_state.current_race_index >= len(calendar):
        return {"status": "season_complete"}
        
    track = calendar[game_state.current_race_index]
    # Compile strategies for entries
    player_d1_name = game_state.drivers[0].name
    player_d2_name = game_state.drivers[1].name
    
    # We must rebuild entries with the explicit strategies injected
    from src.simulators.race_simulator import RaceEntry
    
    entries = []
    # Player Team
    entries.append(RaceEntry(game_state.drivers[0], game_state.car, game_state.team_name, request.d1_strategy))
    entries.append(RaceEntry(game_state.drivers[1], game_state.car, game_state.team_name, request.d2_strategy))
    
    # AI Teams (Adaptive strategy generation)
    import random
    from src.models.car.tire.tire_compound import COMPOUNDS
    
    base_wear_per_lap = 2.0 * track.tire_wear_multiplier
    safe_soft = int(65.0 / (base_wear_per_lap * COMPOUNDS["Soft"].wear_rate))
    safe_med = int(65.0 / (base_wear_per_lap * COMPOUNDS["Medium"].wear_rate))
    safe_hard = int(65.0 / (base_wear_per_lap * COMPOUNDS["Hard"].wear_rate))
    
    for team_name, data in game_state.ai_teams.items():
        # Generate varied AI strategies per driver
        for d in data["drivers"]:
            target_laps = track.laps
            ai_strat = []
            
            # Simple AI rules: try to make it on a 1 or 2 stop, randomly choosing
            num_stops = random.choice([1, 2, 2]) # Bias towards 2 stops for safety
            
            # 15% chance to do a really dumb strategy (staying out too long on Softs)
            if random.random() < 0.15:
                laps_first = min(target_laps - 1, int(safe_soft * 1.5))
                ai_strat.append({"compound": "Soft", "laps": laps_first})
                if target_laps - laps_first > 0:
                    ai_strat.append({"compound": "Hard", "laps": target_laps - laps_first})
            else:
                if num_stops == 1:
                    # Medium -> Hard
                    laps_first = min(safe_med + random.randint(-2, 3), target_laps - 1)
                    ai_strat.append({"compound": "Medium", "laps": laps_first})
                    if target_laps - laps_first > 0:
                        ai_strat.append({"compound": "Hard", "laps": target_laps - laps_first})
                else:
                    # Soft -> Medium -> Medium OR Soft -> Hard -> Soft
                    if random.choice([True, False]):
                        laps_first = min(safe_soft + random.randint(-1, 2), target_laps - 2)
                        laps_second = min(safe_med + random.randint(-2, 2), (target_laps - laps_first) - 1)
                        if laps_second <= 0: laps_second = 1
                        ai_strat.append({"compound": "Soft", "laps": laps_first})
                        ai_strat.append({"compound": "Medium", "laps": laps_second})
                        if target_laps - laps_first - laps_second > 0:
                            ai_strat.append({"compound": "Medium", "laps": target_laps - laps_first - laps_second})
                    else:
                        laps_first = min(safe_soft + random.randint(-1, 2), target_laps - 2)
                        laps_second = min(safe_hard + random.randint(-2, 5), (target_laps - laps_first) - 1)
                        if laps_second <= 0: laps_second = 1
                        ai_strat.append({"compound": "Soft", "laps": laps_first})
                        ai_strat.append({"compound": "Hard", "laps": laps_second})
                        if target_laps - laps_first - laps_second > 0:
                            ai_strat.append({"compound": "Soft", "laps": target_laps - laps_first - laps_second})
            
            entries.append(RaceEntry(d, data["car"], team_name, ai_strat))
    
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
    
    # Time progression (Player & AI)
    game_state.advance_week()
    
    game_state.current_race_index += 1
    
    save_manager.save_game(game_state.save_slot, game_state.to_dict())

    return {
        "status": "success",
        "track": track.name,
        "grid": grid,
        "race_results": results["standings"],
        "race_log": results["log"]
    }
