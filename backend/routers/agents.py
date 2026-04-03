from fastapi import APIRouter, HTTPException, Depends
from database import get_db, close_db
from models import AgentCreate, AgentUpdate, AgentOut
import aiosqlite
from datetime import datetime

router = APIRouter(prefix="/api/agents", tags=["agents"])


async def agent_or_404(agent_id: int, db: aiosqlite.Connection) -> dict:
    cursor = await db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Agent not found")
    return dict(row)


@router.get("", response_model=list[AgentOut])
async def list_agents():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM agents ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await close_db(db)


@router.post("", response_model=AgentOut, status_code=201)
async def create_agent(payload: AgentCreate):
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO agents (name, description, instructions, welcome_message, voice, llm_model, language, telegram_enabled, webhook_enabled, webhook_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload.name, payload.description, payload.instructions,
                payload.welcome_message, payload.voice, payload.llm_model, payload.language,
                1 if payload.telegram_enabled else 0,
                1 if payload.webhook_enabled else 0,
                payload.webhook_url
            )
        )
        await db.commit()
        agent_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await close_db(db)


@router.get("/{agent_id}", response_model=AgentOut)
async def get_agent(agent_id: int):
    db = await get_db()
    try:
        return await agent_or_404(agent_id, db)
    finally:
        await close_db(db)


@router.put("/{agent_id}", response_model=AgentOut)
async def update_agent(agent_id: int, payload: AgentUpdate):
    db = await get_db()
    try:
        existing = await agent_or_404(agent_id, db)
        updates = payload.model_dump(exclude_none=True)
        if not updates:
            return existing

        updates["updated_at"] = datetime.utcnow().isoformat()
        set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
        values = list(updates.values()) + [agent_id]

        await db.execute(
            f"UPDATE agents SET {set_clause} WHERE id = ?",
            values
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await close_db(db)


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(agent_id: int):
    db = await get_db()
    try:
        await agent_or_404(agent_id, db)
        await db.execute("DELETE FROM agents WHERE id = ?", (agent_id,))
        await db.commit()
    finally:
        await close_db(db)
