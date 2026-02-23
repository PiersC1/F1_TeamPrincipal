from typing import List
from src.models.world.track import Track

class TrackDatabase:
    """Hardcoded 10-race calendar with varying characteristics for MVP."""
    
    @staticmethod
    def get_calendar() -> List[Track]:
        calendar = [
            Track("Bahrain International Circuit", "Bahrain", laps=57, base_lap_time=93.0, 
                  aero_weight=1.0, chassis_weight=1.0, powertrain_weight=1.0),
            Track("Jeddah Corniche Circuit", "Saudi Arabia", laps=50, base_lap_time=89.0, 
                  aero_weight=0.8, chassis_weight=1.0, powertrain_weight=1.3),
            Track("Albert Park Circuit", "Australia", laps=58, base_lap_time=81.0, 
                  aero_weight=0.9, chassis_weight=1.1, powertrain_weight=1.0),
            Track("Suzuka International Racing Course", "Japan", laps=53, base_lap_time=90.0, 
                  aero_weight=1.2, chassis_weight=1.3, powertrain_weight=1.0),
            Track("Shanghai International Circuit", "China", laps=56, base_lap_time=96.0, 
                  aero_weight=1.1, chassis_weight=1.1, powertrain_weight=1.0),
            Track("Miami International Autodrome", "USA", laps=57, base_lap_time=90.0, 
                  aero_weight=0.9, chassis_weight=1.0, powertrain_weight=1.2),
            Track("Autodromo Enzo e Dino Ferrari", "Italy", laps=63, base_lap_time=77.0, 
                  aero_weight=1.0, chassis_weight=1.2, powertrain_weight=1.0),
            Track("Circuit de Monaco", "Monaco", laps=78, base_lap_time=72.0, 
                  aero_weight=1.5, chassis_weight=1.2, powertrain_weight=0.4),
            Track("Circuit Gilles-Villeneuve", "Canada", laps=70, base_lap_time=73.0, 
                  aero_weight=0.7, chassis_weight=1.1, powertrain_weight=1.3),
            Track("Circuit de Barcelona-Catalunya", "Spain", laps=66, base_lap_time=76.0, 
                  aero_weight=1.2, chassis_weight=1.1, powertrain_weight=0.9),
            Track("Red Bull Ring", "Austria", laps=71, base_lap_time=66.0, 
                  aero_weight=0.9, chassis_weight=1.0, powertrain_weight=1.3),
            Track("Silverstone Circuit", "Great Britain", laps=52, base_lap_time=87.0, 
                  aero_weight=1.3, chassis_weight=1.0, powertrain_weight=1.1),
            Track("Hungaroring", "Hungary", laps=70, base_lap_time=79.0, 
                  aero_weight=1.3, chassis_weight=1.2, powertrain_weight=0.7),
            Track("Circuit de Spa-Francorchamps", "Belgium", laps=44, base_lap_time=105.0, 
                  aero_weight=1.1, chassis_weight=0.9, powertrain_weight=1.4),
            Track("Circuit Zandvoort", "Netherlands", laps=72, base_lap_time=72.0, 
                  aero_weight=1.3, chassis_weight=1.1, powertrain_weight=0.8),
            Track("Autodromo Nazionale Monza", "Italy", laps=53, base_lap_time=81.0, 
                  aero_weight=0.5, chassis_weight=1.0, powertrain_weight=1.5),
            Track("Baku City Circuit", "Azerbaijan", laps=51, base_lap_time=103.0, 
                  aero_weight=0.6, chassis_weight=0.9, powertrain_weight=1.4),
            Track("Marina Bay Street Circuit", "Singapore", laps=62, base_lap_time=91.0, 
                  aero_weight=1.4, chassis_weight=1.3, powertrain_weight=0.6),
            Track("Circuit of the Americas", "USA", laps=56, base_lap_time=95.0, 
                  aero_weight=1.1, chassis_weight=1.1, powertrain_weight=1.0),
            Track("Autodromo Hermanos Rodriguez", "Mexico", laps=71, base_lap_time=80.0, 
                  aero_weight=0.9, chassis_weight=1.1, powertrain_weight=1.0),
            Track("Autodromo Jose Carlos Pace", "Brazil", laps=71, base_lap_time=71.0, 
                  aero_weight=1.1, chassis_weight=1.1, powertrain_weight=0.8),
            Track("Las Vegas Strip Circuit", "USA", laps=50, base_lap_time=93.0, 
                  aero_weight=0.6, chassis_weight=0.8, powertrain_weight=1.5),
            Track("Lusail International Circuit", "Qatar", laps=57, base_lap_time=84.0, 
                  aero_weight=1.2, chassis_weight=1.1, powertrain_weight=0.9),
            Track("Yas Marina Circuit", "UAE", laps=58, base_lap_time=85.0, 
                  aero_weight=1.0, chassis_weight=1.2, powertrain_weight=1.2)
        ]
        
        # Apply specific wear multipliers
        wear_multipliers = {
            "Bahrain International Circuit": 1.45,
            "Jeddah Corniche Circuit": 0.85,
            "Albert Park Circuit": 0.95,
            "Suzuka International Racing Course": 1.35,
            "Shanghai International Circuit": 1.15,
            "Miami International Autodrome": 1.05,
            "Autodromo Enzo e Dino Ferrari": 1.10,
            "Circuit de Monaco": 0.60,
            "Circuit Gilles-Villeneuve": 0.85,
            "Circuit de Barcelona-Catalunya": 1.30,
            "Red Bull Ring": 1.00,
            "Silverstone Circuit": 1.25,
            "Hungaroring": 1.10,
            "Circuit de Spa-Francorchamps": 1.20,
            "Circuit Zandvoort": 1.05,
            "Autodromo Nazionale Monza": 0.80,
            "Baku City Circuit": 0.90,
            "Marina Bay Street Circuit": 1.15,
            "Circuit of the Americas": 1.15,
            "Autodromo Hermanos Rodriguez": 0.90,
            "Autodromo Jose Carlos Pace": 1.05,
            "Las Vegas Strip Circuit": 0.85,
            "Lusail International Circuit": 1.35,
            "Yas Marina Circuit": 1.05
        }
        
        for t in calendar:
            t.tire_wear_multiplier = wear_multipliers.get(t.name, 1.0)
            
        return calendar
