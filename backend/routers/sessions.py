from fastapi import APIRouter, HTTPException
from database import get_db, close_db
from models import TokenResponse, SessionOut
import os, uuid, time
import jwt as pyjwt
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api", tags=["sessions"])

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")


def generate_livekit_token(api_key: str, api_secret: str, room_name: str, identity: str) -> str:
    """Generate a LiveKit JWT token manually per LiveKit's JWT spec."""
    now = int(time.time())
    payload = {
        "iss": api_key,
        "sub": identity,
        "iat": now,
        "nbf": now - 60,
        "exp": now + 3600,  # valid for 1 hour
        "name": "Test User",
        "video": {
            "roomJoin": True,
            "room": room_name,
            "canPublish": True,
            "canSubscribe": True,
        },
    }
    token = pyjwt.encode(payload, api_secret, algorithm="HS256")
    # pyjwt >= 2.0 returns str, older returns bytes
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token





from livekit import api as lkapi


def _lk_client() -> lkapi.LiveKitAPI:
    return lkapi.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)


async def create_livekit_room(room_name: str):
    """Pre-create the LiveKit room so the agent has a room to join."""
    client = _lk_client()
    try:
        room = await client.room.create_room(lkapi.CreateRoomRequest(
            name=room_name,
            empty_timeout=300,
            max_participants=10,
        ))
        print(f"[Room] Created '{room.name}' (sid={room.sid})")
    except Exception as e:
        print(f"[Room] Failed to create room: {e}")
    finally:
        await client.aclose()


async def dispatch_agent_to_room(room_name: str, agent_name: str = "parrotpod_agent"):
    """Dispatch the registered agent worker to a room via livekit-api SDK."""
    client = _lk_client()
    try:
        dispatch = await client.agent_dispatch.create_dispatch(
            lkapi.CreateAgentDispatchRequest(room=room_name, agent_name=agent_name)
        )
        print(f"[Dispatch] Agent '{agent_name}' → room '{room_name}' (id={dispatch.id})")
    except Exception as e:
        print(f"[Dispatch] Failed: {e}")
    finally:
        await client.aclose()

@router.post("/agents/{agent_id}/token", response_model=TokenResponse)
async def create_token(agent_id: int):
    """Generate a LiveKit JWT token and dispatch the agent worker to the room."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id, name FROM agents WHERE id = ?", (agent_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Agent not found")

        room_name = f"parrotpod-agent-{agent_id}-{uuid.uuid4().hex[:8]}"
        identity = "test"

        if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
            raise HTTPException(
                status_code=500,
                detail="LiveKit credentials not configured in .env"
            )

        token = generate_livekit_token(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, room_name, identity)

        # Record session
        await db.execute(
            "INSERT INTO sessions (agent_id, caller_id, livekit_room, status) VALUES (?, ?, ?, 'active')",
            (agent_id, identity, room_name)
        )
        await db.commit()

        # Step 1: Pre-create the room so it exists before dispatch
        await create_livekit_room(room_name)
        # Step 2: Dispatch the agent worker into that room
        await dispatch_agent_to_room(room_name)

        # Get the newly created session id
        cursor = await db.execute(
            "SELECT id FROM sessions WHERE livekit_room = ? ORDER BY id DESC LIMIT 1",
            (room_name,)
        )
        session_row = await cursor.fetchone()
        session_id = session_row["id"] if session_row else 0

        return TokenResponse(
            token=token,
            room_name=room_name,
            livekit_url=LIVEKIT_URL,
            session_id=session_id,
        )
    finally:
        await close_db(db)


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(limit: int = 50):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await close_db(db)


@router.get("/agents/{agent_id}/sessions", response_model=list[SessionOut])
async def agent_sessions(agent_id: int, limit: int = 20):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM sessions WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?",
            (agent_id, limit)
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await close_db(db)


@router.patch("/sessions/{session_id}/end", status_code=200)
async def end_session(session_id: int, duration: int = 0, transcript: str = ""):
    db = await get_db()
    try:
        await db.execute(
            """UPDATE sessions SET status = 'ended', duration_seconds = ?, transcript = ?, 
               ended_at = CURRENT_TIMESTAMP WHERE id = ?""",
            (duration, transcript, session_id)
        )
        await db.commit()
        return {"ok": True}
    finally:
        await close_db(db)
