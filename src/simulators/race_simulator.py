import random
from typing import List, Dict, Any

from src.models.car.car import Car
from src.models.personnel.driver import Driver
from src.models.world.track import Track
from src.models.car.tire.tire_compound import COMPOUNDS, TireCompound

from src.models.car.car import Car
from src.models.personnel.driver import Driver
from src.models.world.track import Track

class RaceEntry:
    """Helper class to couple a driver and a car for the simulator."""
    def __init__(self, driver: Driver, car: Car, team_name: str, strategy: List[str] = None):
        self.driver = driver
        self.car = car
        self.team_name = team_name
        
        # Strategy parsing (default to a 1-stop Soft->Hard if missing)
        strategy = strategy or ["Soft", "Hard"]
        self.compounds_remaining = [COMPOUNDS[comp] for comp in strategy]
        self.current_compound = self.compounds_remaining.pop(0) if self.compounds_remaining else COMPOUNDS["Hard"]
        
        # Runtime simulation state
        self.current_lap_time = 0.0
        self.total_race_time = 0.0
        self.tire_wear = 0.0 # 0.0 to 100.0
        self.pit_stops = 0

class RaceSimulator:
    """
    Headless simulator execution engine. Completely decoupled from UI.
    Takes a list of RaceEntries and runs mathematical calculations out of them.
    """
    
    def __init__(self, entries: List[RaceEntry], track: Track):
        self.entries = entries
        self.track = track
        self.total_laps = track.laps
        self.base_lap_time = track.base_lap_time
        self.race_log = [] # Generates a lap-by-lap log
        
    def _calculate_lap_time(self, entry: RaceEntry) -> float:
        """Calculates lap time based on driver skill, weighted car performance, and tire wear."""
        # Calculate track-specific weighted car performance
        aero_perf = (entry.car.aero.downforce + entry.car.aero.drag_efficiency) * self.track.aero_weight
        chassis_perf = (entry.car.chassis.weight_reduction + entry.car.chassis.tire_preservation) * self.track.chassis_weight
        powertrain_perf = (entry.car.powertrain.power_output + entry.car.powertrain.reliability) * self.track.powertrain_weight
        
        # Max theoretical rating per module is roughly 200 * weight. Average total around 600.
        weighted_car_perf = aero_perf + chassis_perf + powertrain_perf
        
        # Normalize back to a 100-scale roughly
        normalized_car_perf = min(100.0, weighted_car_perf / 6)
        
        driver_speed = entry.driver.speed # 1-100
        driver_consist = entry.driver.consistency # 1-100
        
        # The higher the rating, the more seconds we subtract from the base lap time
        car_advantage = (normalized_car_perf / 100) * 3.5 
        driver_advantage = (driver_speed / 100) * 2.0
        
        # Consistency affects the randomness of the lap
        mistake_chance = (100 - driver_consist) / 100 
        mistake_penalty = random.uniform(0.0, 1.5) if random.random() < mistake_chance else 0.0
        
        # Tire wear penalty: up to 1.8 seconds lost if tires are dead
        tire_penalty = (entry.tire_wear / 100) * 1.8
        
        # Base math including the compound pace advantage
        raw_lap = self.base_lap_time - car_advantage - driver_advantage + mistake_penalty + tire_penalty
        raw_lap -= entry.current_compound.pace_advantage # Softs are fundamentally faster
        return raw_lap
        
    def _apply_tire_wear(self, entry: RaceEntry):
        """Calculates tire wear based on chassis preservation, driver management, and compound softness."""
        base_wear = 2.1 # Base wear per lap
        chassis_eff = entry.car.chassis.tire_preservation / 100
        driver_eff = entry.driver.tire_management / 100
        
        # Apply the compound's specific degradation multiplier
        compound_wear = base_wear * entry.current_compound.wear_rate
        
        # High stats reduce wear by up to 30% each
        wear = compound_wear * (1 - (chassis_eff * 0.3)) * (1 - (driver_eff * 0.3))
        entry.tire_wear = min(100.0, entry.tire_wear + wear)

    def run_race(self) -> Dict[str, Any]:
        """Executes the headless simulation and returns the logs/results."""
        for lap in range(1, self.total_laps + 1):
            
            for entry in self.entries:
                lap_time = self._calculate_lap_time(entry)
                self._apply_tire_wear(entry)
                
                # Pitstop Strategy logic: Pit if wear is over 70% AND we have tires left in the strategy
                if entry.tire_wear > 70.0 and entry.compounds_remaining:
                    lap_time += 22.0 # Pitlane loss
                    entry.tire_wear = 0.0
                    entry.current_compound = entry.compounds_remaining.pop(0)
                    entry.pit_stops += 1
                elif entry.tire_wear > 95.0:
                    # Blowout prevention: if strategy is empty but tires are literally dead, force an emergent Hard stop
                    lap_time += 25.0
                    entry.tire_wear = 0.0
                    entry.current_compound = COMPOUNDS["Hard"]
                    entry.pit_stops += 1
                
                entry.current_lap_time = lap_time
                entry.total_race_time += lap_time
                
            # Sort current standings for this lap
            lap_standings = sorted(self.entries, key=lambda e: e.total_race_time)
            leader_time = lap_standings[0].total_race_time
            
            lap_data = {
                "lap": lap,
                "standings": [
                    {
                        "driver": e.driver.name, 
                        "team": e.team_name, 
                        "lap_time": e.current_lap_time,
                        "total_time": e.total_race_time,
                        "interval": e.total_race_time - leader_time,
                        "stops": e.pit_stops,
                        "wear": e.tire_wear,
                        "compound": e.current_compound.name
                    }
                    for e in lap_standings
                ]
            }
                
            self.race_log.append(lap_data)
            
        # Sort final standings
        standings = sorted(self.entries, key=lambda e: e.total_race_time)
        return {
            "standings": [{"driver": e.driver.name, "team": e.team_name, "total_time": e.total_race_time, "stops": e.pit_stops} for e in standings],
            "log": self.race_log
        }
