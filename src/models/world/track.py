from typing import Dict, Any

class Track:
    """Represents a racing circuit and its performance weightings."""
    
    def __init__(self, name: str, country: str, laps: int, base_lap_time: float, 
                 aero_weight: float = 1.0, 
                 chassis_weight: float = 1.0, 
                 powertrain_weight: float = 1.0):
        self.name = name
        self.country = country
        self.laps = laps
        self.base_lap_time = base_lap_time # Average lap time in seconds
        
        # Multipliers for car performance. e.g., Monza powertrain_weight = 1.5
        self.aero_weight = aero_weight
        self.chassis_weight = chassis_weight
        self.powertrain_weight = powertrain_weight

    def to_dict(self) -> Dict[str, Any]:
        """Serialize track data for the frontend."""
        return {
            "name": self.name,
            "country": self.country,
            "laps": self.laps,
            "base_lap_time": self.base_lap_time,
            "aero_weight": self.aero_weight,
            "chassis_weight": self.chassis_weight,
            "powertrain_weight": self.powertrain_weight
        }
