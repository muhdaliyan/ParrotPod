#!/bin/bash
# Start the voice agent worker in the background
echo "[RENDER] Starting Voice Agent Worker..."
python voice_agent.py dev &

# Start the FastAPI server using Gunicorn and Uvicorn workers
echo "[RENDER] Starting FastAPI Server..."
gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
