import json
import os
from typing import Dict, Any, Optional

class SaveLoadManager:
    """Handles serializing the GameState to and from JSON format."""
    
    def __init__(self, save_dir: str = "saves"):
        self.save_dir = save_dir
        if not os.path.exists(self.save_dir):
            os.makedirs(self.save_dir)
            
    def get_last_active_slot(self) -> Optional[str]:
        """Reads the name of the last successfully loaded or created save slot."""
        filepath = os.path.join(self.save_dir, "last_active_slot.txt")
        if not os.path.exists(filepath):
            return None
        try:
            with open(filepath, 'r') as f:
                content = f.read().strip()
                return content if content else None
        except:
            return None
            
    def clear_last_active_slot(self):
        """Clears the active slot tracking so auto-recovery doesn't trigger after a quit."""
        filepath = os.path.join(self.save_dir, "last_active_slot.txt")
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass
            
    def set_last_active_slot(self, slot_name: str):
        """Records the name of the currently active save slot for auto-recovery."""
        filepath = os.path.join(self.save_dir, "last_active_slot.txt")
        try:
            with open(filepath, 'w') as f:
                f.write(slot_name)
        except Exception as e:
            print(f"Error writing last active slot: {e}")

    def save_game(self, slot_name: str, state_data: Dict[str, Any]) -> bool:
        """Saves a dictionary representing the game state to a JSON file."""
        filepath = os.path.join(self.save_dir, f"{slot_name}.json")
        try:
            with open(filepath, 'w') as f:
                json.dump(state_data, f, indent=4)
            return True
        except Exception as e:
            print(f"Error saving game: {e}")
            return False

    def load_game(self, slot_name: str) -> Dict[str, Any]:
        """Loads a game state dictionary from a JSON file. Returns empty dict if not found."""
        filepath = os.path.join(self.save_dir, f"{slot_name}.json")
        if not os.path.exists(filepath):
            return {}
            
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading game: {e}")
            return {}

    def get_save_slots(self) -> list[str]:
        """Returns a list of available save slot names."""
        if not os.path.exists(self.save_dir):
            return []
        
        slots = []
        for filename in os.listdir(self.save_dir):
            if filename.endswith(".json"):
                slots.append(filename[:-5])
        return slots
