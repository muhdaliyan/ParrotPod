"""
Parrot Pod Voice Agent Worker
------------------------------
Run with: python voice_agent.py start --url $LIVEKIT_URL --api-key $KEY --api-secret $SECRET

This worker listens for LiveKit rooms prefixed with 'parrotpod-agent-{id}-'.
It loads the agent's config from SQLite, reads knowledge files, and runs
Deepgram STT + OpenAI LLM + Deepgram TTS.
"""

import os
import asyncio
import logging
import json
import re
import aiosqlite
import pandas as pd
import httpx

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, room_io, metrics
from livekit.agents import AgentStateChangedEvent, MetricsCollectedEvent
from livekit.agents import llm as lk_llm
from livekit.agents import function_tool, RunContext
from livekit.plugins import silero, deepgram
from livekit.plugins import openai as lk_openai

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_PATH = os.getenv("DATABASE_PATH", "./parrotpod.db")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")
UPLOAD_DIR = "./uploads"


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def load_agent_config(agent_id: int) -> dict:
    """Load agent config from SQLite."""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
            row = await cursor.fetchone()
            return dict(row) if row else {}
    except Exception as e:
        logger.error(f"[DB] Failed to load agent config: {e}")
        return {}


async def load_agent_files(agent_id: int) -> str:
    """Read all knowledge files for the agent and return as context string."""
    context_parts = []
    agent_dir = os.path.join(UPLOAD_DIR, str(agent_id))

    if not os.path.exists(agent_dir):
        return ""

    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM files WHERE agent_id = ?", (agent_id,)
            )
            files = await cursor.fetchall()

        for file_row in files:
            file_data = dict(file_row)
            filepath = file_data["filepath"]
            if not os.path.exists(filepath):
                continue

            ext = file_data["filetype"].lower()
            try:
                if ext == "csv":
                    df = pd.read_csv(filepath)
                    context_parts.append(
                        f"[File: {file_data['filename']}]\n{df.to_string(index=False)}"
                    )
                elif ext == "pdf":
                    import PyPDF2
                    with open(filepath, "rb") as f:
                        reader = PyPDF2.PdfReader(f)
                        text = "\n".join([p.extract_text() or "" for p in reader.pages])
                    context_parts.append(f"[File: {file_data['filename']}]\n{text}")
                else:  # txt
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                    context_parts.append(f"[File: {file_data['filename']}]\n{text}")
            except Exception as e:
                logger.warning(f"[Files] Could not read {filepath}: {e}")

    except Exception as e:
        logger.error(f"[Files] Load error: {e}")

    return "\n\n".join(context_parts)


async def send_telegram(agent_name: str, summary: str, items: list) -> bool:
    """Send order/event summary to Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False

    items_text = ""
    if items:
        items_text = "\n".join([
            f"  • {i.get('item', 'Unknown')} × {i.get('quantity', 1)}" for i in items
        ])

    message = f"🦜 *Parrot Pod – New Event*\n\n🤖 *Agent:* {agent_name}\n📋 *Summary:* {summary}"
    if items_text:
        message += f"\n\n🛒 *Items:*\n{items_text}"
    message += "\n\n_Sent by Parrot Pod Voice Agent_"

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": message,
                "parse_mode": "Markdown",
            }, timeout=10)
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"[Telegram] Failed: {e}")
        return False


async def send_webhook(agent_config: dict, agent_name: str, session_room: str, summary: str, items: list) -> bool:
    """Send event data to configured webhook URL for CRM/Orders integrations."""
    # Try agent config first, fallback to env variable
    url = agent_config.get("webhook_url") or WEBHOOK_URL
    if not url:
        return False

    payload = {
        "agent": agent_name,
        "room": session_room,
        "summary": summary,
        "items": items,
        "event_type": "action_triggered"
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=10)
            return resp.status_code in (200, 201, 202)
    except Exception as e:
        logger.error(f"[Webhook] Failed to send to {url}: {e}")
        return False


async def save_action(agent_id: int, session_room: str, summary: str, items: list, telegram_sent: bool):
    """Persist action/order to SQLite for dashboard metrics."""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            # Find session id
            cursor = await db.execute(
                "SELECT id FROM sessions WHERE livekit_room = ?", (session_room,)
            )
            row = await cursor.fetchone()
            session_id = row[0] if row else None

            # Saving to the generic 'orders' table (acts as actions log)
            await db.execute(
                "INSERT INTO orders (agent_id, session_id, summary, items, telegram_sent) VALUES (?,?,?,?,?)",
                (agent_id, session_id, summary, json.dumps(items), 1 if telegram_sent else 0)
            )
            await db.commit()
    except Exception as e:
        logger.error(f"[DB] Failed to save action: {e}")


# ─── Agent Class ──────────────────────────────────────────────────────────────

class ParrotPodAgent(Agent):
    def __init__(self, agent_config: dict, knowledge_context: str, room_name: str) -> None:
        self.agent_config = agent_config
        self.knowledge_context = knowledge_context
        self.room_name = room_name
        self.agent_id = agent_config.get("id", 0)
        self.agent_name = agent_config.get("name", "AI Assistant")
        self._last_action_time = 0.0
        self._last_action_summary = ""

        # Build system instructions
        base_instructions = agent_config.get("instructions", "You are a helpful AI voice assistant.")
        
        knowledge_block = ""
        if knowledge_context:
            knowledge_block = f"""

KNOWLEDGE BASE (use this to answer questions):
---
{knowledge_context}
---
RULES:
- ALWAYS search the knowledge base before answering questions about products, services, prices, or info.
- If user explicitly orders items, books an appointment, or makes a strong request, call the trigger_action function.
- If you need to search for info, call lookup_info first, then reply "Let me check that for you..." while searching.
- Keep responses SHORT and CONVERSATIONAL (max 2-3 sentences for voice).
"""

        full_instructions = f"{base_instructions}{knowledge_block}"

        initial_ctx = lk_llm.ChatContext()
        initial_ctx.add_message(role="user", content="[session started]")

        super().__init__(
            instructions=full_instructions,
            chat_ctx=initial_ctx,
        )

    async def on_enter(self):
        welcome = self.agent_config.get("welcome_message", "Hello! How can I help you today?")
        await self.session.generate_reply(instructions=f"Say exactly: '{welcome}'")

    @function_tool()
    async def lookup_info(self, context: RunContext, query: str) -> dict:
        """
        Search the knowledge base for information.
        Call this when the user asks about products, services, prices, menu, or any factual info.
        
        Args:
            query: What the user is asking about
        """
        await context.session.generate_reply(
            instructions="Say 'Let me check that for you, one moment...' in a natural way."
        )

        if not self.knowledge_context:
            return {"found": False, "message": "No knowledge base configured"}

        query_lower = query.lower()
        lines = self.knowledge_context.split("\n")
        matches = [line for line in lines if any(word in line.lower() for word in query_lower.split())]

        if matches:
            return {"found": True, "data": "\n".join(matches[:20])}
        else:
            return {"found": False, "message": "No specific info found, try to answer from general knowledge"}

    @function_tool()
    async def trigger_action(self, context: RunContext, item: list[str], quantity: list[int], action_type: str = "general", notes: str = "") -> dict:
        """
        Record a customer action (e.g., placing an order, booking an appointment, capturing a lead).
        Triggers external notifications like Telegram and Webhooks to the admin.
        
        Args:
            item: List of items, services, or entities requested (e.g., ["Coffee", "Muffin"] or ["Dentist Appointment"])
            quantity: List of quantities matching the items (e.g., [1, 2]). Use [1] for non-quantifiable things like appointments.
            action_type: Clarify the type of action ('order', 'booking', 'lead', 'support')
            notes: Any special instructions, dates, preferences, or notes provided by user
        """
        # Normalize inputs
        if isinstance(item, str):
            item = [item]
        if isinstance(quantity, int):
            quantity = [quantity]
        
        # Best effort zip if lengths mismatch
        max_len = max(len(item), len(quantity))
        item += ["Unknown"] * (max_len - len(item))
        quantity += [1] * (max_len - len(quantity))

        action_items = [{"item": i, "quantity": q} for i, q in zip(item, quantity)]
        summary = f"[{action_type.upper()}] " + ', '.join([f'{q}x {i}' for i, q in zip(item, quantity)])
        if notes:
            summary += f" | Notes: {notes}"

        # ── Debounce: Prevent duplicate LLM executions
        import time
        current_time = time.time()
        if (current_time - self._last_action_time) < 5.0 and self._last_action_summary == summary:
            return {"status": "success", "message": "Already recorded."}
        
        self._last_action_time = current_time
        self._last_action_summary = summary
        # ───────────────────────────────────────────

        # 1. Telegram
        sent_tg = await send_telegram(self.agent_name, summary, action_items)
        
        # 2. Webhook
        sent_wh = await send_webhook(self.agent_config, self.agent_name, self.room_name, summary, action_items)
        
        # 3. Database
        await save_action(self.agent_id, self.room_name, summary, action_items, sent_tg)

        return {
            "status": "success",
            "action": action_items,
            "webhook_triggered": sent_wh,
            "message": f"Action '{action_type}' recorded successfully."
        }

    @function_tool()
    async def get_agent_info(self, context: RunContext) -> dict:
        """
        Get information about this voice agent (name, capabilities).
        Call this if the user asks who they're speaking with.
        """
        return {
            "name": self.agent_name,
            "description": self.agent_config.get("description", "AI Voice Assistant"),
            "capabilities": ["answer questions", "take orders", "provide information"]
        }


# ─── Agent Server ─────────────────────────────────────────────────────────────

server = AgentServer()


@server.rtc_session(agent_name="parrotpod_agent")
async def entrypoint(ctx: agents.JobContext):
    # ─── 1. Connect IMMEDIATELY to avoid connection latency issues
    try:
        await ctx.connect(auto_subscribe=True)
        logger.info(f"[Worker] Connected to room: {ctx.room.name}")
    except Exception as e:
        logger.error(f"[Worker] Failed to connect: {e}")
        return

    # ─── 2. Prepare Agent Config
    room_name = ctx.room.name
    agent_id = 1
    caller_id = "test"  # Default if not found
    
    # Try SIP pattern: parrotpod-agent-{id}-_{phone}_{random}
    sip_match = re.search(r"parrotpod-agent-(\d+)-_(\+?\d+)_", room_name)
    if sip_match:
        agent_id = int(sip_match.group(1))
        caller_id = sip_match.group(2)
    else:
        # Fallback to test/other pattern
        match = re.search(r"parrotpod-agent-(\d+)-", room_name)
        if match:
            agent_id = int(match.group(1))
            # If it's a test session, caller_id stays "test"

    logger.info(f"[Worker] Initializing session for agent_id={agent_id}, caller_id={caller_id}")

    # Ensure session exists in database (for SIP calls, it won't exist yet)
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            cursor = await db.execute(
                "SELECT id FROM sessions WHERE livekit_room = ?", (room_name,)
            )
            if not await cursor.fetchone():
                logger.info(f"[Worker] Auto-creating session record for SIP/Room: {room_name}")
                await db.execute(
                    "INSERT INTO sessions (agent_id, caller_id, livekit_room, status) VALUES (?, ?, ?, 'active')",
                    (agent_id, caller_id, room_name)
                )
                await db.commit()
    except Exception as db_err:
        logger.error(f"[DB] Failed to ensure session: {db_err}")

    # Load config + files
    agent_config = await load_agent_config(agent_id)
    knowledge_context = await load_agent_files(agent_id)

    if not agent_config:
        agent_config = {
            "id": agent_id,
            "name": "Parrot Pod Assistant",
            "instructions": "You are a helpful AI voice assistant for Parrot Pod.",
            "welcome_message": "Hello! How can I help you today?",
            "voice": "aura-2-odysseus-en",
            "llm_model": "gpt-4o-mini",
        }

    voice_model = agent_config.get("voice", "aura-2-odysseus-en")
    llm_model = agent_config.get("llm_model", "gpt-4o-mini")
    lang = agent_config.get("language", "en")
    
    lang_map = {"en": "en-US", "ur": "ur", "ar": "ar", "es": "es", "fr": "fr"}
    dg_language = lang_map.get(lang, "en-US")

    # ─── 3. Initialize Session using AgentSession (compatible with 1.5.1)
    session = AgentSession(
        stt=deepgram.STT(
            model="nova-2-general",
            language=dg_language,
            punctuate=True,
            interim_results=False,
        ),
        llm=lk_openai.LLM(
            model=llm_model,
        ),
        tts=deepgram.TTS(
            model=voice_model,
        ),
        vad=silero.VAD.load(
            min_speech_duration=0.02,        # detect speech even faster
            min_silence_duration=0.5,        # wait less before replying (faster turn-taking)
            prefix_padding_duration=0.3,     # less padding
            activation_threshold=0.35,       # more sensitive
            deactivation_threshold=0.25,     # faster deactivation
        ),
    )

    import time
    start_time = time.time()

    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def update_session_status():
        """Helper to mark session as ended in DB."""
        duration = int(time.time() - start_time)
        print(f"[Worker] --- Session Ending: {room_name} (Duration: {duration}s) ---")
        try:
            async with aiosqlite.connect(DATABASE_PATH) as db:
                logger.info(f"[Worker] Marking session as 'ended' in DB for Room: {room_name}")
                await db.execute(
                    """UPDATE sessions 
                       SET status = 'ended', duration_seconds = ?, ended_at = CURRENT_TIMESTAMP 
                       WHERE livekit_room = ?""",
                    (duration, room_name)
                )
                await db.commit()
                print(f"[Worker] --- Database Updated: {room_name} status=ended ---")
        except Exception as e:
            logger.error(f"[DB] Failed to update session status: {e}")
            print(f"[Worker] Error updating DB: {e}")

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"[Usage] {summary}")
        # Secondary safety update
        await update_session_status()

    ctx.add_shutdown_callback(log_usage)

    # ─── 4. Start Session
    try:
        await session.start(
            room=ctx.room,
            agent=ParrotPodAgent(agent_config, knowledge_context, room_name),
        )
    except Exception as e:
        logger.error(f"[Worker] Session error: {e}")
    finally:
        # Prompt update as soon as start() completes
        await update_session_status()


if __name__ == "__main__":
    agents.cli.run_app(server)
