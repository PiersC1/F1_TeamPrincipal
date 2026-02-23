from typing import List, Dict, Any, Optional

class RDNode:
    """
    Represents a single focus tree node in the R&D system (HoI4 style).
    Contains requirements, costs, exact target stat tradeoffs, and tracking logic.
    """
    
    def __init__(self, node_id: str, name: str, description: str, cost: int, time_to_complete: int, effects: Dict[str, int]):
        self.node_id = node_id
        self.name = name
        self.description = description
        
        # Requirements & Locks
        self.cost = cost
        self.base_time_to_complete = time_to_complete # Base time in "Weeks" or "Races"
        self.dependencies: List[str] = [] # List of node_ids that must be completed first
        self.mutually_exclusive: List[str] = [] # List of node_ids this locks out when chosen
        
        # Engine execution data
        # Effects map stat strings to value changes. e.g. {"aero.downforce": 10, "chassis.weight_reduction": -2}
        self.effects = effects 
        
        # State
        self.state = "LOCKED" # LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED, MUTUALLY_LOCKED
        self.progress_time = 0 
        
    def add_dependency(self, node_id: str):
        self.dependencies.append(node_id)
        
    def add_mutually_exclusive(self, node_id: str):
        self.mutually_exclusive.append(node_id)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for both save state and API consumption."""
        return {
            "node_id": self.node_id,
            "name": self.name,
            "description": self.description,
            "cost": self.cost,
            "time_to_complete": self.base_time_to_complete,
            "base_time_to_complete": self.base_time_to_complete,
            "state": self.state,
            "progress_time": self.progress_time,
            "effects": self.effects,
            "dependencies": self.dependencies,
            "mutually_exclusive": self.mutually_exclusive
        }
        
    def load_from_dict(self, data: Dict[str, Any]):
        self.state = data.get("state", "LOCKED")
        self.progress_time = data.get("progress_time", 0)
