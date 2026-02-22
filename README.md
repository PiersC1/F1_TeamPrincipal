# F1 Team Principal Simulator

A motorsport management simulation game where the player acts as a Team Principal. The core gameplay loop focuses on off-track management, car design (R&D tradeoffs), budget management, and executing pre-set race strategies across a structured championship calendar.

## Architecture & Tech Stack

This project is built using a highly decoupled Client/Server architecture to ensure the core mathematical racing simulation is entirely separated from the user interface.

*   **Backend Engine:** Python 3 + FastAPI
    *   Stateful backend that handles the mathematical execution of laps, car performance calculations, R&D progression, and Championship points tracking over a full racing calendar.
    *   Provides RESTful API endpoints for the client to interact with.
*   **Frontend Client:** React 19 + Vite (Tailwind CSS)
    *   A modern, dark-mode web dashboard serving as the Team Principal's command center.
    *   Features a visual R&D tech-tree, real-time championship standings, and an interactive Race Weekend strategy interface.

## Core Features
*   **Decoupled Math Engine:** The `RaceSimulator` is a headless mathematical engine that calculates race pace based on specific Track demands (Aero, Chassis, Powertrain) against a car's unique component ratings.
*   **HoI4-Style R&D Tree:** A complex, visual "Focus Tree" for upgrading the car. Projects take multiple races to complete, cost money, and feature tradeoffs (e.g. gaining downforce at the cost of drag efficiency). Certain development paths will lock out mutually-exclusive alternatives.
*   **Real Grid Simulation:** The game features a 10-race calendar (with varying characteristics like Monza's power dominance vs. Monaco's aero demands) and simulates a full 20-car grid to mathematically determine qualifying positions and race results.
*   **Dynamic Standings:** Driver and Constructor championship points (standard modern F1 point system) are tracked and updated dynamically across the season.
*   **Cost Cap Management:** Players must budget their R&D spending against the FIA financial regulations cap.

## Project Structure

```text
F1_TeamPrinciple/
├── src/                    # Backend Python Engine
│   ├── api/                # FastAPI routes and server initialization
│   ├── database/           # Static game data (Tracks, Teams, Initial Drivers)
│   ├── managers/           # Game state managers (Finance, R&D, Championship)
│   ├── models/             # Core data classes (Car Components, Personnel, Nodes)
│   └── simulators/         # The headless Race execution engine
├── frontend/               # React UI Client
│   ├── src/
│   │   ├── components/     # React Views (Dashboard, RDTree, RaceWeekend)
│   │   ├── App.jsx         # Main router and state-fetcher
│   │   └── index.css       # Global styles and Tailwind imports
└── run_game.sh             # Helper bash script to boot the full application
```

## How to Run Locally

You must run both the Python backend API and the Node frontend development server simultaneously to play the game.

### The Easy Way
A helper script is included in the root directory to instantly boot both servers and handle graceful shutdowns.
```bash
./run_game.sh
```

### The Manual Way
If you prefer to run the components in separate terminal windows to view the isolated logs:

**1. Boot the Backend Engine (Terminal 1)**
```bash
# From the project root:
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```
*The API will be available at `http://localhost:8000`*

**2. Boot the Frontend UI (Terminal 2)**
```bash
# From the project root:
cd frontend
npm run dev
```
*The Web Application will be available at `http://localhost:5173`*
