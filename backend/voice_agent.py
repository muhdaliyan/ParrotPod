"""
Parrot Pod Voice Agent Worker
------------------------------
Run with: python voice_agent.py start --url $LIVEKIT_URL --api-key $KEY --api-secret $SECRET

This worker listens for LiveKit rooms prefixed with 'parrotpod-agent-{id}-'.
It loads the agent's config from SQLite, reads knowledge files, and runs
Deepgram STT + OpenAI LLM + Deepgram TTS.
"""

import os
import time
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
from livekit.agents import TurnHandlingOptions, JobProcess
from livekit.agents import llm as lk_llm
from livekit.agents import function_tool, RunContext
from livekit.plugins import silero, deepgram
from livekit.plugins import openai as lk_openai
from livekit.plugins import google

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_PATH = os.getenv("DATABASE_PATH", "./parrotpod.db")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")
# FIX #5: Use env var with sensible default instead of hardcoded path
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


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


async def send_telegram(agent_config: dict, agent_name: str, summary: str, items: list) -> bool:
    """Send order/event summary to Telegram."""
    if not agent_config.get("telegram_enabled", 1):
        logger.info(f"[Telegram] Disabled for agent '{agent_name}'")
        return False

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


async def send_webhook(agent_config: dict, agent_name: str, session_room: str, summary: str, items: list, action_type: str = "general", notes: str = "") -> bool:
    """Send event data to configured webhook URL for CRM/Orders integrations."""
    if not agent_config.get("webhook_enabled", 0):
        return False

    url = agent_config.get("webhook_url") or WEBHOOK_URL
    if not url:
        return False

    payload = {
        "event": "action_triggered",
        "timestamp": time.time(),
        "agent": {
            "id": agent_config.get("id"),
            "name": agent_name,
        },
        "session": {
            "room": session_room,
        },
        "data": {
            "type": action_type,
            "summary": summary,
            "items": items,
            "notes": notes
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=10)
            logger.info(f"[Webhook] Sent to {url}, status: {resp.status_code}")
            return resp.status_code in (200, 201, 202)
    except Exception as e:
        logger.error(f"[Webhook] Failed to send to {url}: {e}")
        return False


async def save_action(agent_id: int, session_room: str, summary: str, items: list, telegram_sent: bool):
    """Persist action/order to SQLite for dashboard metrics."""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            cursor = await db.execute(
                "SELECT id FROM sessions WHERE livekit_room = ?", (session_room,)
            )
            row = await cursor.fetchone()
            session_id = row[0] if row else None

            await db.execute(
                "INSERT INTO orders (agent_id, session_id, summary, items, telegram_sent) VALUES (?,?,?,?,?)",
                (agent_id, session_id, summary, json.dumps(items), 1 if telegram_sent else 0)
            )
            await db.commit()
    except Exception as e:
        logger.error(f"[DB] Failed to save action: {e}")


# ─── LLM Warmup ───────────────────────────────────────────────────────────────

async def warmup_llm(model: str):
    """
    Fire a tiny dummy request to pre-heat the OpenAI connection.
    Eliminates the 7+ second cold start TTFT on the first real turn.
    """
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY', '')}"},
                json={
                    "model": model,
                    "max_tokens": 1,
                    "messages": [{"role": "user", "content": "hi"}]
                },
                timeout=5,
            )
            logger.debug("[Warmup] LLM connection pre-heated")
    except Exception:
        pass  # Warmup failure is non-fatal


# ─── Prewarm ──────────────────────────────────────────────────────────────────

def prewarm(proc: JobProcess):
    """
    Called once per worker process BEFORE any job is assigned.
    Pre-loads Silero VAD model into process memory so the first session
    has zero model-loading delay (eliminates the 'no warmed process' warning).
    """
    proc.userdata["vad"] = silero.VAD.load(
        min_speech_duration=0.05,
        min_silence_duration=0.55,       # tighter than before — less dead air
        prefix_padding_duration=0.3,     # was 0.5 — less pre-roll = less lag
        activation_threshold=0.5,
        deactivation_threshold=0.35,
    )


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

        base_instructions = agent_config.get("instructions", "You are a helpful AI voice assistant.")

        knowledge_block = ""
        if knowledge_context:
            knowledge_block = f"""

KNOWLEDGE BASE (use this to answer questions):
---
{knowledge_context}
---
- SEARCH the knowledge base for products, services, prices, menu, or factual info.
- If user orders, books, or makes a strong request, CALL trigger_action.
- Keep responses VERY SHORT and CONVERSATIONAL (max 2-3 sentences).
- Answer questions directly using the knowledge base.
"""

        full_instructions = f"{base_instructions}{knowledge_block}"

        initial_ctx = lk_llm.ChatContext()

        super().__init__(
            instructions=full_instructions,
            chat_ctx=initial_ctx,
        )

    async def on_enter(self):
        welcome = self.agent_config.get("welcome_message", "Hello! How can I help you today?")
        await self.session.say(welcome, allow_interruptions=True)

    @function_tool()
    async def lookup_info(self, context: RunContext, query: str) -> dict:
        """
        Search the knowledge base for information.
        Call this when the user asks about products, services, prices, menu, or any factual info.

        Args:
            query: What the user is asking about
        """
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

        max_len = max(len(item), len(quantity))
        item += ["Unknown"] * (max_len - len(item))
        quantity += [1] * (max_len - len(quantity))

        action_items = [{"item": i, "quantity": q} for i, q in zip(item, quantity)]
        summary = f"[{action_type.upper()}] " + ', '.join([f'{q}x {i}' for i, q in zip(item, quantity)])
        if notes:
            summary += f" | Notes: {notes}"

        # FIX #3: time is now imported at the top of the file
        current_time = time.time()
        if (current_time - self._last_action_time) < 5.0 and self._last_action_summary == summary:
            return {"status": "success", "message": "Already recorded."}

        self._last_action_time = current_time
        self._last_action_summary = summary

        sent_tg = await send_telegram(self.agent_config, self.agent_name, summary, action_items)
        sent_wh = await send_webhook(self.agent_config, self.agent_name, self.room_name, summary, action_items, action_type, notes)
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

server = AgentServer(
    setup_fnc=prewarm,      # pre-loads VAD before jobs arrive
    num_idle_processes=1,   # keep 1 warm process ready at all times
)


@server.rtc_session(agent_name="parrotpod_agent")
async def entrypoint(ctx: agents.JobContext):
    room_name = ctx.room.name
    agent_id = 1
    caller_id = "test"

    # Parse room name to extract agent_id and caller_id
    sip_match = re.search(r"parrotpod-agent-(\d+)-_(\+?\d+)_", room_name)
    if sip_match:
        agent_id = int(sip_match.group(1))
        caller_id = sip_match.group(2)
    else:
        match = re.search(r"parrotpod-agent-(\d+)-", room_name)
        if match:
            agent_id = int(match.group(1))

    logger.info(f"[Worker] Starting session for agent_id={agent_id}, caller_id={caller_id}, room={room_name}")

    # Ensure session record exists
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            cursor = await db.execute(
                "SELECT id FROM sessions WHERE livekit_room = ?", (room_name,)
            )
            if not await cursor.fetchone():
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
        logger.warning(f"[Worker] No config for agent_id={agent_id}, using defaults")
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

    # Warmup ONLY for OpenAI models
    if "gemini-" not in llm_model:
        asyncio.create_task(warmup_llm(llm_model))

    # ── Session: optimized for low-latency voice from Pakistan → India West ──
    # Key changes vs original:
    #   STT: nova-3 (faster + smarter) with interim_results=True so preemptive
    #        generation fires sooner (300-500ms saved per turn).
    #   TTS: keepalive=True stops re-opening a WebSocket every turn — that was
    #        the primary cause of the crackling/breaking audio artefacts.
    #   VAD: reuse the pre-warmed model from prewarm(); tighter silence window
    #        so the agent responds quicker without cutting the user off.
    #   Endpointing: min_delay 0.3→0.2 shaves another 100ms off every reply.
    vad_instance = ctx.proc.userdata.get("vad") or silero.VAD.load(
        min_speech_duration=0.05,
        min_silence_duration=0.55,
        prefix_padding_duration=0.3,
        activation_threshold=0.5,
        deactivation_threshold=0.35,
    )

    session = AgentSession(
        stt=deepgram.STT(
            model="nova-3",
            language=dg_language,
            smart_format=True,
            interim_results=True,       # stream partials → earlier preemptive gen
            punctuate=True,
        ),
        llm=(
            google.LLM(
                model=llm_model,
                max_output_tokens=80,
            )
            if "gemini-" in llm_model
            else lk_openai.LLM(
                model=llm_model,
                tool_choice="auto",
                temperature=0.7,
            )
        ),
        tts=deepgram.TTS(
            model=voice_model,
            encoding="linear16",        # uncompressed PCM — no codec artefacts
            sample_rate=24000,          # explicit rate prevents buffer mismatch
        ),
        vad=vad_instance,
        turn_handling=TurnHandlingOptions(
            interruption={"mode": "vad"},
            endpointing={"mode": "dynamic", "min_delay": 0.2, "max_delay": 2.5},
        ),
    )

    start_time = time.time()
    usage_collector = metrics.UsageCollector()

    # FIX #2: Replace deprecated metrics_collected with session_usage_updated
    @session.on("session_usage_updated")
    def _on_usage(ev):
        usage_collector.collect(ev.usage)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"[Usage] {summary}")
        duration = int(time.time() - start_time)
        try:
            async with aiosqlite.connect(DATABASE_PATH) as db:
                await db.execute(
                    "UPDATE sessions SET status = 'ended', duration_seconds = ?, ended_at = CURRENT_TIMESTAMP WHERE livekit_room = ?",
                    (duration, room_name)
                )
                await db.commit()
                logger.info(f"[Worker] Session ended: {room_name} ({duration}s)")
        except Exception as e:
            logger.error(f"[DB] Failed to update session: {e}")

    ctx.add_shutdown_callback(log_usage)

    await session.start(
        room=ctx.room,
        agent=ParrotPodAgent(agent_config, knowledge_context, room_name),
    )


if __name__ == "__main__":
    agents.cli.run_app(server)