from typing import Dict, Any
from src.models.personnel.staff_member import StaffMember

class TechnicalDirector(StaffMember):
    """Technical Director data model. Highly impacts R&D speed and cost efficiency."""
    
    def __init__(self, name: str, salary: int, rating: int, aero_expertise: int, chassis_expertise: int, powertrain_expertise: int, age: int = 45, contract_length_years: int = 2):
        super().__init__(name, salary, rating, age, contract_length_years)
        self.aero_expertise = aero_expertise
        self.chassis_expertise = chassis_expertise
        self.powertrain_expertise = powertrain_expertise
        
    def process_yearly_aging(self):
        """Technical Directors acquire knowledge long into their careers before retiring."""
        super().process_yearly_aging()
        import random
        
        # Determine dynamic stat growth or decline
        if self.age < 55.0:
            if random.random() < 0.6:
                self.rating = min(100, self.rating + random.randint(1, 2))
                self.aero_expertise = min(100, self.aero_expertise + random.randint(0, 2))
                self.chassis_expertise = min(100, self.chassis_expertise + random.randint(0, 2))
                self.powertrain_expertise = min(100, self.powertrain_expertise + random.randint(0, 2))
        elif self.age >= 65.0:
            if random.random() < 0.8:
                self.rating = max(1, self.rating - random.randint(1, 3))
                self.aero_expertise = max(1, self.aero_expertise - random.randint(0, 2))
                self.chassis_expertise = max(1, self.chassis_expertise - random.randint(0, 2))
                self.powertrain_expertise = max(1, self.powertrain_expertise - random.randint(0, 2))
        
    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "aero_expertise": self.aero_expertise,
            "chassis_expertise": self.chassis_expertise,
            "powertrain_expertise": self.powertrain_expertise
        })
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TechnicalDirector':
        td = cls(
            name=data.get("name", "Unknown TD"),
            salary=data.get("salary", 1_000_000),
            rating=data.get("rating", 70),
            aero_expertise=data.get("aero_expertise", 70),
            chassis_expertise=data.get("chassis_expertise", 70),
            powertrain_expertise=data.get("powertrain_expertise", 70),
            age=data.get("age", 45),
            contract_length_years=data.get("contract_length_years", 2)
        )
        td.id = data.get("id", td.id)
        return td
