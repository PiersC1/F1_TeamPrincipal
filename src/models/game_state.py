from typing import Dict, Any, List
from src.managers.finance_manager import FinanceManager
from src.models.car.car import Car
from src.managers.rd_manager import RDManager
from src.managers.championship_manager import ChampionshipManager
from src.database.team_database import TeamDatabase
from src.models.personnel.driver import Driver
from src.models.personnel.technical_director import TechnicalDirector
from src.simulators.race_simulator import RaceEntry

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
        self.season = 1
        self.current_race_index = 0
        self.ai_teams = {} # Populated later
        
    def initialize_ai_grid(self):
        """Builds the AI opposition, ensuring the player's team is excluded."""
        self.ai_teams = TeamDatabase.get_initial_teams()
        if self.team_name in self.ai_teams:
            self.ai_teams.pop(self.team_name)
        
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
        
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the entire game state into a dictionary."""
        return {
            "team_name": self.team_name,
            "season": self.season,
            "current_race_index": self.current_race_index,
            "finance_manager": self.finance_manager.to_dict(),
            "championship_manager": self.championship_manager.to_dict(),
            "car": self.car.to_dict(),
            "rd_manager": self.rd_manager.to_dict(),
            "drivers": [d.to_dict() for d in self.drivers],
            "technical_director": self.technical_director.to_dict() if self.technical_director else None,
            "ai_teams": {
                name: {
                    "drivers": [d.to_dict() for d in data["drivers"]]
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
        self.current_race_index = data.get("current_race_index", 0)
        
        # Build the grid now that we know the loaded team name
        self.initialize_ai_grid()
        
        if "finance_manager" in data:
            self.finance_manager = FinanceManager.from_dict(data["finance_manager"])
            
        if "championship_manager" in data:
            self.championship_manager.load_from_dict(data["championship_manager"])
            
        if "car" in data:
            self.car = Car.from_dict(data["car"])
            self.rd_manager = RDManager(self.car) # Reset manager with new car reference
            
        if "rd_manager" in data:
            self.rd_manager.load_from_dict(data["rd_manager"])
            
        if "drivers" in data:
            self.drivers = [Driver.from_dict(d) for d in data["drivers"]]
            
        if data.get("technical_director"):
            self.technical_director = TechnicalDirector.from_dict(data["technical_director"])
