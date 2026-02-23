from typing import Dict, Any, List
from src.managers.finance_manager import FinanceManager
from src.models.car.car import Car
from src.managers.rd_manager import RDManager
from src.managers.championship_manager import ChampionshipManager
from src.database.team_database import TeamDatabase
from src.models.personnel.driver import Driver
from src.models.personnel.technical_director import TechnicalDirector
from src.models.personnel.head_of_aero import HeadOfAerodynamics
from src.models.personnel.powertrain_lead import PowertrainLead
from src.simulators.race_simulator import RaceEntry
from src.database.market_database import MarketDatabase

class GameState:
    """
    The root data model holding everything in the current game.
    Provides methods to serialize the entire game to a dict for SaveLoadManager.
    """
    
    def __init__(self):
        self.team_name = "Player Racing"
        self.finance_manager = FinanceManager()
        self.car = Car()
        self.rd_manager = RDManager(self.car)
        self.championship_manager = ChampionshipManager()
        self.drivers: List[Driver] = []
        self.technical_director: TechnicalDirector | None = None
        self.head_of_aero: HeadOfAerodynamics | None = None
        self.powertrain_lead: PowertrainLead | None = None
        
        self.season = 1
        self.current_race_index = 0
        self.difficulty = "Normal"
        self.save_slot = "slot1"
        self.ai_teams: Dict[str, Dict[str, Any]] = {} # Populated later
        self.staff_market: Dict[str, List[Any]] = {}
        
    def relink_rd_manager(self):
        """Ensures the R&D manager is pointing to the active car object (fix for ghost car bug) and syncs difficulty."""
        self.rd_manager.car = self.car
        self.rd_manager.difficulty = self.difficulty
        self.rd_manager.head_of_aero = self.head_of_aero
        self.rd_manager.powertrain_lead = self.powertrain_lead
        
    def initialize_ai_grid(self):
        """Builds the AI opposition, ensuring the player's team is excluded and setting up AI R&D Managers."""
        self.ai_teams = TeamDatabase.get_initial_teams()
        self.staff_market = MarketDatabase.get_free_agents()
        if self.team_name in self.ai_teams:
            self.ai_teams.pop(self.team_name)
            
        for team_name, data in self.ai_teams.items():
            ai_car = data["car"]
            ai_rd = RDManager(ai_car, is_ai=True)
            ai_rd.difficulty = self.difficulty
            
            # Apply Difficulty Scales to AI Engineering Workforce
            if self.difficulty.lower() == "easy":
                ai_rd.total_engineers = 50
            elif self.difficulty.lower() == "hard":
                ai_rd.total_engineers = 150
            else:
                ai_rd.total_engineers = 100
                
            # AI teams immediately check for available projects
            ai_rd.update_availability() 
            self.ai_teams[team_name]["rd_manager"] = ai_rd
        
    def get_all_race_entries(self) -> List[RaceEntry]:
        """Helper to package the player's team and the AI database into RaceEntries for the simulator."""
        entries = []
        # Player entries
        for d in self.drivers:
            entries.append(RaceEntry(d, self.car, self.team_name))
            
        # AI entries
        for team_name, data in self.ai_teams.items():
            for ai_driver in data["drivers"]:
                entries.append(RaceEntry(ai_driver, data["car"], team_name))
                
        return entries
        
    def advance_week(self):
        """Processes weekly events like aging staff and generating resource points."""
        # 1. Generate RP based on personnel expertise
        rp_gained = 150 # Base weekly infusion
        
        for d in self.drivers:
            # High rating drivers give better feedback, yielding more RP
            rp_gained += (d.rating * 0.5)
            
        if self.technical_director:
            # TD is the primary driver of development bandwidth
            rp_gained += (self.technical_director.rating * 1.5)
            
        self.rd_manager.resource_points += int(rp_gained)
        
        # 2. Advance Player R&D
        self.rd_manager.advance_time(1)
        
        # 4. Advance AI R&D and generate their Resource Points
        for team_name, data in self.ai_teams.items():
            ai_rd = data.get("rd_manager")
            if ai_rd:
                # Calculate AI Weekly Income (simulating their own staff quality)
                ai_base_rp = 150
                ai_driver_bonus = sum(d.rating * 0.5 for d in data.get("drivers", []))
                ai_td_bonus = 80 * 1.5  # Flat assumption: AI has an ~80 OVR Technical Director
                
                ai_rd.resource_points += int(ai_base_rp + ai_driver_bonus + ai_td_bonus)
                
                # Advance active projects and execute autonomous project selection
                ai_rd.advance_time(1)
                ai_rd.update_availability()
                
    def process_yearly_aging(self):
        """Processes end-of-season aging for every staff member in the simulation."""
        # Player Team
        for d in self.drivers:
            d.process_yearly_aging()
        if self.technical_director:
            self.technical_director.process_yearly_aging()
        if self.head_of_aero:
            self.head_of_aero.process_yearly_aging()
        if self.powertrain_lead:
            self.powertrain_lead.process_yearly_aging()
            
        # AI Teams
        for team_name, data in self.ai_teams.items():
            for d in data.get("drivers", []):
                d.process_yearly_aging()
                
        # Free Agent Market
        for role, staff_list in self.staff_market.items():
            for s in staff_list:
                s.process_yearly_aging()
        
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the entire game state into a dictionary."""
        staff_market_dict = {}
        if self.staff_market:
            for role, staff_list in self.staff_market.items():
                staff_market_dict[role] = [s.to_dict() for s in staff_list]
                
        return {
            "team_name": self.team_name,
            "season": self.season,
            "difficulty": self.difficulty,
            "save_slot": self.save_slot,
            "current_race_index": self.current_race_index,
            "finance_manager": self.finance_manager.to_dict(),
            "championship_manager": self.championship_manager.to_dict(),
            "car": self.car.to_dict(),
            "rd_manager": self.rd_manager.to_dict(),
            "drivers": [d.to_dict() for d in self.drivers],
            "technical_director": self.technical_director.to_dict() if self.technical_director else None,
            "head_of_aero": self.head_of_aero.to_dict() if self.head_of_aero else None,
            "powertrain_lead": self.powertrain_lead.to_dict() if self.powertrain_lead else None,
            "staff_market": staff_market_dict,
            "ai_teams": {
                name: {
                    "car": data["car"].to_dict(),
                    "drivers": [d.to_dict() for d in data["drivers"]],
                    "rd_manager": data["rd_manager"].to_dict() if "rd_manager" in data else None
                }
                for name, data in self.ai_teams.items()
            }
        }
        
    def load_from_dict(self, data: Dict[str, Any]):
        """Populate this GameState object using a loaded dictionary."""
        if not data:
            return # empty or new game
            
        self.team_name = data.get("team_name", "Player Racing")
        self.season = data.get("season", 1)
        self.difficulty = data.get("difficulty", "Normal")
        self.save_slot = data.get("save_slot", "slot1")
        self.current_race_index = data.get("current_race_index", 0)
        
        # Only build first-time if not in data
        if "ai_teams" not in data or "staff_market" not in data:
            self.initialize_ai_grid()
        else:
            self.ai_teams = {}
            for name, team_data in data["ai_teams"].items():
                ai_car = Car.from_dict(team_data["car"])
                ai_rd = RDManager(ai_car, is_ai=True)
                if "rd_manager" in team_data and team_data["rd_manager"]:
                    ai_rd.load_from_dict(team_data["rd_manager"])
                
                ai_rd.difficulty = self.difficulty
                if self.difficulty.lower() == "easy":
                    ai_rd.total_engineers = 50
                elif self.difficulty.lower() == "hard":
                    ai_rd.total_engineers = 150
                else:
                    ai_rd.total_engineers = 100
                    
                
                self.ai_teams[name] = {
                    "car": ai_car,
                    "drivers": [Driver.from_dict(d) for d in team_data["drivers"]],
                    "rd_manager": ai_rd
                }
        
        if "finance_manager" in data:
            self.finance_manager = FinanceManager.from_dict(data["finance_manager"])
            
        if "championship_manager" in data:
            self.championship_manager.load_from_dict(data["championship_manager"])
            
        if "car" in data:
            self.car = Car.from_dict(data["car"])
            self.relink_rd_manager()
            
        if "rd_manager" in data:
            self.rd_manager.load_from_dict(data["rd_manager"])
            
        if "drivers" in data:
            self.drivers = [Driver.from_dict(d) for d in data["drivers"]]
            
        if data.get("technical_director"):
            self.technical_director = TechnicalDirector.from_dict(data["technical_director"])
            
        if data.get("head_of_aero"):
            self.head_of_aero = HeadOfAerodynamics.from_dict(data["head_of_aero"])
            
        if data.get("powertrain_lead"):
            self.powertrain_lead = PowertrainLead.from_dict(data["powertrain_lead"])
            
        if "staff_market" in data:
            self.staff_market = {}
            for role, staff_list in data["staff_market"].items():
                if role == "drivers":
                    self.staff_market[role] = [Driver.from_dict(d) for d in staff_list]
                elif role == "technical_directors":
                    self.staff_market[role] = [TechnicalDirector.from_dict(d) for d in staff_list]
                elif role == "head_of_aero":
                    self.staff_market[role] = [HeadOfAerodynamics.from_dict(d) for d in staff_list]
                elif role == "powertrain_leads":
                    self.staff_market[role] = [PowertrainLead.from_dict(d) for d in staff_list]
            
        # Re-link the newly loaded department leads to the R&D manager
        self.relink_rd_manager()
