import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

load_dotenv()

from database import init_db
from routers import agents, files, sessions, notifications, dashboard, telephony, voices, config, whatsapp

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Parrot Pod API",
    description="AI Voice Agent Builder – Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Register routers
app.include_router(agents.router)
app.include_router(files.router)
app.include_router(sessions.router)
app.include_router(notifications.router)
app.include_router(whatsapp.router)
app.include_router(dashboard.router)
app.include_router(telephony.router)
app.include_router(voices.router)
app.include_router(config.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve static files from frontend/dist
# Note: In Render, the frontend folder is a sibling of the backend folder
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # 1. Check if the file exists in dist/ (e.g. favicon.ico, manifest.json)
        file_path = os.path.join(frontend_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # 2. Otherwise serve index.html for SPA routing
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "name": "Parrot Pod API",
            "version": "1.0.0",
            "status": "running",
            "message": "Frontend not found at " + frontend_path
        }
