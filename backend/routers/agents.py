from fastapi import APIRouter, HTTPException, Depends
from database import get_db, close_db
from models import AgentCreate, AgentUpdate, AgentOut
import aiosqlite
import os
from datetime import datetime
from pydantic import BaseModel
from openai import OpenAI
from typing import List, Optional

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []

class ChatResponse(BaseModel):
    content: str

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
            """INSERT INTO agents (name, description, instructions, welcome_message, voice, llm_model, language, telegram_enabled, webhook_enabled, webhook_url, whatsapp_enabled, whatsapp_number)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload.name, payload.description, payload.instructions,
                payload.welcome_message, payload.voice, payload.llm_model, payload.language,
                1 if payload.telegram_enabled else 0,
                1 if payload.webhook_enabled else 0,
                payload.webhook_url,
                1 if payload.whatsapp_enabled else 0,
                payload.whatsapp_number
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

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(payload: ChatRequest):
    """Centralized chat endpoint for the assistant UI."""
    google_key = os.getenv("GOOGLE_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    # Priority: Google Gemini -> OpenAI
    if google_key:
        client = OpenAI(
            api_key=google_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        model = "gemini-2.5-flash"
    elif openai_key:
        client = OpenAI(api_key=openai_key)
        model = "gpt-4o-mini"
    else:
        raise HTTPException(status_code=500, detail="No LLM API keys configured in backend")

    try:
        system_msg = {
            "role": "system", 
            "content": """You are Parrot Pod AI, a high-end business automation assistant. 
            Deliver information using structured markdown with clear headings, bullet points, and code blocks where appropriate. 
            Prioritize readability, logical formatting, and a premium professional tone. 
            Ensure your output is beautiful when rendered in a chat UI."""
        }
        
        # 1. Save user message to DB
        db = await get_db()
        await db.execute(
            "INSERT INTO chat_history (role, content) VALUES ('user', ?)",
            (payload.message,)
        )
        await db.commit()

        # 2. Build history for LLM
        cursor = await db.execute("SELECT role, content FROM chat_history ORDER BY id DESC LIMIT 20")
        rows = await cursor.fetchall()
        db_history = [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

        response = client.chat.completions.create(
            model=model,
            messages=db_history,
            max_tokens=800,
            temperature=0.7
        )
        ai_content = response.choices[0].message.content

        # 3. Save assistant response to DB
        await db.execute(
            "INSERT INTO chat_history (role, content) VALUES ('assistant', ?)",
            (ai_content,)
        )
        await db.commit()
        await close_db(db)

        return ChatResponse(content=ai_content)
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail="I encountered an error while processing your request.")

@router.get("/chat/history")
async def get_chat_history():
    """Fetch the continuous chat history."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM chat_history ORDER BY timestamp ASC")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await close_db(db)

@router.delete("/chat/history")
async def clear_chat_history():
    """Wipe all chat messages."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM chat_history")
        await db.commit()
        return {"ok": True}
    finally:
        await close_db(db)
