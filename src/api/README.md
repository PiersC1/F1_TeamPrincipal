# FastAPI Server & Routes

This module serves as the entry point for the Web Application replacement of the Pygame client.

`main.py` bootstraps a locally-hosted Uvicorn REST server. It imports the monolithic `GameState` tracker and exposes the Python simulation logic to the React frontend through simple JSON endpoints over HTTP.
