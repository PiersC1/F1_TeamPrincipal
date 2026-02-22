# Game State Managers

Managers act as the "controllers" in our architecture. They hold the application state and contain the business logic to mutate that state.

*   `championship_manager.py`: Tracks points awarded after race simulations and calculates the Driver and Constructor standings based on real F1 points rules.
*   `finance_manager.py`: Enforces the Cost Cap.
*   `rd_manager.py`: Tracks R&D progress via a node-based tech tree, unlocking dependencies and applying stat changes to the car.
*   `save_load_manager.py`: Serializes the entire game state to and from JSON for save files.
