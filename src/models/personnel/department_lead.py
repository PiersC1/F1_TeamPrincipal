from typing import Dict, Any
from src.models.personnel.staff_member import StaffMember

class DepartmentLead(StaffMember):
    """Base class for R&D Department Leads (e.g., Head of Aero).
    They provide flat stat bonuses to completed R&D nodes based on their expertise.
    """
    
    def __init__(self, name: str, salary: int, rating: int, expertise: int, age: int = 40, contract_length_years: int = 2):
        super().__init__(name, salary, rating, age, contract_length_years)
        self.expertise = expertise # Specialized rating for their department (1-100)
        
    def process_yearly_aging(self):
        """Engineers peak late in their careers."""
        super().process_yearly_aging()
        import random
        
        # Determine dynamic stat growth or decline
        if self.age < 50.0:
            if random.random() < 0.7:
                self.expertise = min(100, self.expertise + random.randint(1, 3))
        elif self.age >= 65.0:
            if random.random() < 0.8:
                self.expertise = max(1, self.expertise - random.randint(1, 3))
                
    def get_rd_bonus(self) -> int:
        """Returns the flat bonus to apply to a completed R&D node.
        0-50: +0
        51-70: +1
        71-85: +2
        86-94: +3
        95-99: +4
        100: +5
        """
        if self.expertise >= 100: return 5
        if self.expertise >= 95: return 4
        if self.expertise >= 86: return 3
        if self.expertise >= 71: return 2
        if self.expertise >= 51: return 1
        return 0

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data["expertise"] = self.expertise
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DepartmentLead':
        lead = cls(
            name=data.get("name", "Unknown Lead"),
            salary=data.get("salary", 500_000),
            rating=data.get("rating", 70),
            expertise=data.get("expertise", 70),
            age=data.get("age", 40.0),
            contract_length_years=data.get("contract_length_years", 2)
        )
        lead.id = data.get("id", lead.id)
        return lead
