from typing import Dict, List, Any
from src.models.personnel.driver import Driver
from src.models.personnel.technical_director import TechnicalDirector
from src.models.personnel.head_of_aero import HeadOfAerodynamics
from src.models.personnel.powertrain_lead import PowertrainLead

class MarketDatabase:
    """Contains the initial pool of free agents available to hire."""
    
    @staticmethod
    def get_free_agents() -> Dict[str, List[Any]]:
        return {
            "drivers": [
                Driver("Franco Colapinto", 1_800_000, 78, 80, 77, 75, age=21),
                Driver("Liam Lawson", 1_500_000, 78, 80, 75, 74, age=22),
                Driver("Oliver Bearman", 1_200_000, 76, 79, 72, 70, age=19),
                Driver("Kimi Antonelli", 1_800_000, 79, 83, 70, 71, age=17),
                Driver("Jack Doohan", 1_000_000, 75, 76, 74, 75, age=21),
                Driver("Theo Pourchaire", 1_100_000, 77, 78, 76, 74, age=20),
                Driver("Felipe Drugovich", 1_000_000, 76, 75, 78, 77, age=24),
                Driver("Mick Schumacher", 1_500_000, 77, 77, 78, 76, age=25),
                Driver("Isack Hadjar", 900_000, 74, 76, 70, 75, age=19),
                Driver("Paul Aron", 850_000, 73, 75, 72, 72, age=20),
                Driver("Zane Maloney", 800_000, 72, 74, 69, 73, age=20),
                Driver("Gabriel Bortoleto", 950_000, 76, 77, 71, 74, age=20),
                Driver("Alex Palou", 2_500_000, 81, 82, 85, 78, age=27),
                Driver("Pato O'Ward", 2_000_000, 80, 82, 78, 80, age=25),
                Driver("Colton Herta", 1_800_000, 79, 83, 75, 77, age=24),
                Driver("Robert Shwartzman", 1_200_000, 75, 75, 76, 74, age=24),
                Driver("Callum Ilott", 1_100_000, 76, 76, 77, 75, age=25)
            ],
            "technical_directors": [
                TechnicalDirector("Adrian Newey", 15_000_000, 98, 96, 98, 85, 65, 3),
                TechnicalDirector("James Allison", 12_000_000, 94, 94, 92, 88, 56, 3),
                TechnicalDirector("Pierre Wache", 10_000_000, 92, 90, 95, 86, 49, 4),
                TechnicalDirector("Dan Fallows", 8_000_000, 88, 92, 85, 80, 50, 4),
                TechnicalDirector("Pat Fry", 6_000_000, 85, 84, 86, 82, 60, 2),
                TechnicalDirector("Mattia Binotto", 9_000_000, 89, 85, 82, 95, 54, 3),
                TechnicalDirector("James Key", 7_000_000, 86, 88, 84, 80, 52, 3),
                TechnicalDirector("Jody Egginton", 5_500_000, 83, 85, 84, 78, 48, 4),
                TechnicalDirector("Jan Monchaux", 6_500_000, 84, 86, 85, 79, 45, 3),
                TechnicalDirector("Aldo Costa", 11_000_000, 93, 90, 94, 91, 62, 2),
                TechnicalDirector("Paddy Lowe", 8_500_000, 87, 85, 88, 89, 61, 2)
            ],
            "head_of_aero": [
                HeadOfAerodynamics("Enrico Cardile", 5_000_000, 89, 90, 49, 3),
                HeadOfAerodynamics("Diego Tondi", 4_000_000, 85, 87, 45, 4),
                HeadOfAerodynamics("Dirk de Beer", 3_500_000, 82, 84, 55, 2),
                HeadOfAerodynamics("Peter Prodromou", 6_000_000, 90, 92, 55, 3),
                HeadOfAerodynamics("Simon Rennie", 4_500_000, 86, 88, 44, 4),
                HeadOfAerodynamics("Eric Blandin", 5_500_000, 88, 89, 48, 3),
                HeadOfAerodynamics("David Sanchez", 5_200_000, 87, 88, 43, 4),
                HeadOfAerodynamics("Andrew Shovlin", 6_500_000, 91, 92, 50, 3),
                HeadOfAerodynamics("Guillaume Rocquelin", 4_800_000, 85, 86, 52, 2)
            ],
            "powertrain_leads": [
                PowertrainLead("Hywel Thomas", 6_000_000, 92, 95, 52, 3),
                PowertrainLead("Enrico Gualtieri", 5_500_000, 88, 91, 50, 4),
                PowertrainLead("Toyoharu Tanabe", 7_000_000, 93, 94, 63, 2),
                PowertrainLead("Mario Illien", 4_000_000, 85, 85, 74, 1),
                PowertrainLead("Gilles Simon", 4_500_000, 84, 86, 65, 2),
                PowertrainLead("Benoit Poulet", 4_800_000, 86, 87, 48, 3),
                PowertrainLead("Tetsushi Kakuda", 5_200_000, 89, 90, 55, 4),
                PowertrainLead("Phil Prew", 6_200_000, 90, 92, 58, 2),
                PowertrainLead("Andy Cowell", 9_000_000, 96, 98, 54, 2)
            ]
        }
