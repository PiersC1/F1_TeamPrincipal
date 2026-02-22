# Headless Race Simulator

This module is the core mathematical engine of the game.

`race_simulator.py` receives a list of initialized driver and car objects, the current track, and a strategy profile. It has no dependencies on any UI framework. It processes the lap times based entirely on raw component ratings weighted against the circuit demands, and spits back the final race classification table to the calling function.
