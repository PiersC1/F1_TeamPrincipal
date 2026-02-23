class TireCompound:
    """Represents a set of F1 tires with specific performance characteristics."""
    
    def __init__(self, name: str, pace_advantage: float, wear_rate: float):
        self.name = name
        self.pace_advantage = pace_advantage # e.g. 1.2 seconds faster base lap time
        self.wear_rate = wear_rate # Multiplier to base tire degradation
        
    def to_dict(self):
        return {
            "name": self.name,
            "pace_advantage": self.pace_advantage,
            "wear_rate": self.wear_rate
        }

# Predefined F1 compounds
COMPOUNDS = {
    "Soft": TireCompound("Soft", pace_advantage=0.8, wear_rate=1.8),
    "Medium": TireCompound("Medium", pace_advantage=0.3, wear_rate=1.2),
    "Hard": TireCompound("Hard", pace_advantage=0.0, wear_rate=0.8)
}
