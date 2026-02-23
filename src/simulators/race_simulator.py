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
    def __init__(self, driver: Driver, car: Car, team_name: str, strategy: List[Dict[str, Any]] = None):
        self.driver = driver
        self.car = car
        self.team_name = team_name
        
        # Strategy parsing. Expected format: [{"compound": "Soft", "laps": 15}, {"compound": "Hard", "laps": 35}]
        strategy = strategy or [{"compound": "Soft", "laps": 10}, {"compound": "Hard", "laps": 60}]
        
        self.stints_remaining = strategy.copy()
        
        first_stint = self.stints_remaining.pop(0) if self.stints_remaining else {"compound": "Hard", "laps": 100}
        self.current_compound = COMPOUNDS.get(first_stint["compound"], COMPOUNDS["Hard"])
        self.current_target_laps = first_stint["laps"]
        self.current_stint_laps = 0
        
        # Runtime simulation state
        self.current_lap_time = 0.0
        self.total_race_time = 0.0
        self.tire_wear = 0.0 # 0.0 to 120.0 (over 100 is critical risk)
        self.pit_stops = 0
        self.dnf = False

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
        
        # Normalize back to a 100-scale roughly (can now exceed 100 for ultimate teams)
        normalized_car_perf = weighted_car_perf / 6
        
        driver_speed = entry.driver.speed # 1-100
        driver_consist = entry.driver.consistency # 1-100
        
        # The higher the rating, the more seconds we subtract from the base lap time
        car_advantage = (normalized_car_perf / 100) * 4.75 
        driver_advantage = (driver_speed / 100) * 2.0
        
        # Consistency affects the randomness of the lap
        mistake_chance = (100 - driver_consist) / 100 
        mistake_penalty = random.uniform(0.0, 1.5) if random.random() < mistake_chance else 0.0
        
        # Tire wear penalty: CLIFF EFFECT
        tire_penalty = 0.0
        if entry.tire_wear <= 60.0:
            # Gentle linear wear loss up to 1 second
            tire_penalty = (entry.tire_wear / 60.0) * 1.0
        else:
            # Exponential cliff loss beyond 60%
            overage = entry.tire_wear - 60.0
            tire_penalty = 1.0 + (min(overage, 40.0) ** 1.35) / 15.0 # Approaches ~4.0s penalty at 100%
            
        if entry.tire_wear > 105.0:
             # Imminent carcass failure risk
             tire_penalty += 5.0
        
        # Base math including the compound pace advantage
        raw_lap = self.base_lap_time - car_advantage - driver_advantage + mistake_penalty + tire_penalty
        raw_lap -= entry.current_compound.pace_advantage # Softs are fundamentally faster
        return raw_lap
        
    def _apply_tire_wear(self, entry: RaceEntry):
        """Calculates tire wear based on chassis preservation, driver management, compound softness, and TRACK multiplier."""
        if entry.dnf: return
        
        base_wear = 2.1 # Base wear per lap at 1.0x multiplier
        chassis_eff = entry.car.chassis.tire_preservation / 100
        driver_eff = entry.driver.tire_management / 100
        
        # Track specific multiplier
        track_wear_base = base_wear * self.track.tire_wear_multiplier
        
        # Apply the compound's specific degradation multiplier
        compound_wear = track_wear_base * entry.current_compound.wear_rate
        
        # High stats reduce wear by up to 30% each
        wear = compound_wear * (1 - (chassis_eff * 0.3)) * (1 - (driver_eff * 0.3))
        entry.tire_wear += wear

    def run_race(self) -> Dict[str, Any]:
        """Executes the headless simulation and returns the logs/results."""
        for lap in range(1, self.total_laps + 1):
            
            for entry in self.entries:
                if entry.dnf:
                    entry.total_race_time += 180.0 # Huge penalty to push them to bottom
                    continue
                    
                entry.current_stint_laps += 1
                lap_time = self._calculate_lap_time(entry)
                self._apply_tire_wear(entry)
                
                # Check for absolute tire failure (DNF)
                if entry.tire_wear > 110.0 and random.random() < 0.3:
                    entry.dnf = True
                    entry.current_lap_time = 0.0
                    continue
                
                # Pitstop Strategy logic: Pit if we hit our target laps for this stint AND we have more scheduled
                if entry.current_stint_laps >= entry.current_target_laps and entry.stints_remaining:
                    lap_time += 22.0 # Pitlane loss
                    entry.tire_wear = 0.0
                    entry.current_stint_laps = 0
                    
                    next_stint = entry.stints_remaining.pop(0)
                    entry.current_compound = COMPOUNDS.get(next_stint["compound"], COMPOUNDS["Hard"])
                    entry.current_target_laps = next_stint["laps"]
                    entry.pit_stops += 1
                elif entry.tire_wear > 100.0 and entry.stints_remaining:
                    # Emergency box if we are completely dead but had a larger target plan
                    lap_time += 25.0 # Slower pitbox interaction
                    entry.tire_wear = 0.0
                    entry.current_stint_laps = 0
                    
                    next_stint = entry.stints_remaining.pop(0)
                    # We might inherit a large target laps, so we just adapt
                    entry.current_compound = COMPOUNDS.get(next_stint["compound"], COMPOUNDS["Hard"])
                    entry.current_target_laps = next_stint["laps"]
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
                        "interval": "DNF" if e.dnf else e.total_race_time - leader_time,
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
            "standings": [{"driver": e.driver.name, "team": e.team_name, "total_time": e.total_race_time, "stops": e.pit_stops, "dnf": e.dnf} for e in standings],
            "log": self.race_log
        }
