from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

load_dotenv()

from database import init_db
from routers import agents, files, sessions, notifications, dashboard, telephony

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

# Register routers
app.include_router(agents.router)
app.include_router(files.router)
app.include_router(sessions.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(telephony.router)


@app.get("/")
async def root():
    return {
        "name": "Parrot Pod API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
