from typing import Dict, Any
import uuid

class StaffMember:
    """Base class for all team personnel (Drivers, Tech Directors, etc.)."""
    
    def __init__(self, name: str, salary: int, rating: int, age: int = 30, contract_length_years: int = 2):
        self.id = str(uuid.uuid4())
        self.name = name
        self.salary = salary
        self.rating = rating # 1-100 overall skill representation
        
        self.age = float(age) # Stored as a float to allow fractional aging mid-season
        self.contract_length_years = contract_length_years
        
    def process_yearly_aging(self):
        """
        Simulates time passing across a full season.
        Young staff develop faster the younger they are, old staff decline.
        """
        import random
        self.age += 1.0
        
        # Base generic rating changes (Subclasses handle specialized stats)
        if self.age <= 22.0:
            if random.random() < 0.9: # 90% chance
                self.rating = min(100, self.rating + random.randint(1, 3))
        elif self.age < 26.0:
            if random.random() < 0.7: # 70% chance
                self.rating = min(100, self.rating + random.randint(1, 2))
        elif self.age >= 38.0 and self.age < 65.0:
            if random.random() < 0.6: # 60% chance to decline
                self.rating = max(1, self.rating - random.randint(1, 2))
        elif self.age >= 65.0:
            if random.random() < 0.8: # 80% chance for rapid decline in old age
                self.rating = max(1, self.rating - random.randint(1, 3))

    def to_dict(self) -> Dict[str, Any]:
        """Serialize core attributes for save/load. Subclasses should call this and extend."""
        return {
            "id": self.id,
            "name": self.name,
            "salary": self.salary,
            "rating": self.rating,
            "age": self.age,
            "contract_length_years": self.contract_length_years
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'StaffMember':
        """Deserialize core attributes. Subclasses should override and use this."""
        member = cls(
            name=data["name"],
            salary=data["salary"],
            rating=data["rating"],
            age=data.get("age", 30.0),
            contract_length_years=data.get("contract_length_years", 2)
        )
        member.id = data["id"]
        return member
