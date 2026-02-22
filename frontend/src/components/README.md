# React Components

This folder contains the core visual breakdown of the UI. Each component expects the `GameState` object as a prop from `App.jsx`.

*   `Dashboard.jsx`: The main hub. Shows your budget, current car performance, and the dynamic Championship standings for both drivers and constructors.
*   `RDTree.jsx`: A visual representation of the car's available upgrades. You can trigger API calls here to start an R&D project.
*   `RaceWeekend.jsx`: Shows upcoming track demands, allows strategy selection, and triggers the `RaceSimulator` on the backend, displaying the final race classification.
