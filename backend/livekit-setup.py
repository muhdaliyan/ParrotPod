import os
import logging
import time
import json
import requests
from dotenv import load_dotenv

import pandas as pd

from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.agents import AgentStateChangedEvent, MetricsCollectedEvent, metrics
from livekit.agents import llm as lk_llm
from livekit.agents import function_tool, RunContext

from livekit.plugins import silero, noise_cancellation
from livekit.plugins import deepgram
from livekit.plugins import noise_cancellation, silero, openai
from livekit.plugins import openai as lk_openai
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv(".env")
logger = logging.getLogger(__name__)

DATA_FOLDER = "data/"


class Assistant(Agent):
    def __init__(self) -> None:
        initial_ctx = lk_llm.ChatContext()
        initial_ctx.add_message(role="user", content="[session started]")

        super().__init__(
            instructions="""
                You are Alie, hotel assistant.

                CRITICAL RULES:
                - If user asks about price → MUST call get_pricing
                - If user asks about food/menu → MUST call get_menu
                - NEVER answer pricing or menu from memory
                - If input is unclear → ask a question instead of guessing

                Max 12 words. No explanations..
                """,
            chat_ctx=initial_ctx,
        )


    async def on_enter(self):
        await self.session.generate_reply(
            instructions="Greet the user warmly in one short sentence. Max 12 words."
        )


    @function_tool()
    async def lookup_hotel_info(self, context: RunContext, query: str) -> dict:
        """
        Call this for ANY user question about the hotel.
        Searches all data files and returns relevant info.
        
        Args:
            query: What the user is asking about (e.g. "dinner menu", "room price", "attractions")
        """
        
        results = {}
        
        # Loop through every file in /data folder
        for filename in os.listdir(DATA_FOLDER):
            if filename.endswith(".csv"):
                filepath = os.path.join(DATA_FOLDER, filename)
                df = pd.read_csv(filepath)
                
                # Search: check if any column value matches the query
                mask = df.apply(
                    lambda col: col.astype(str).str.contains(query, case=False, na=False)
                ).any(axis=1)
                
                matched = df[mask]
                
                if not matched.empty:
                    # Use filename as key (e.g. "menu", "pricing")
                    key = filename.replace(".csv", "")
                    results[key] = matched.to_dict(orient="records")
        
        if results:
            return {"found": True, "data": results}
        else:
            return {"found": False, "message": "No info found"}


    @function_tool()
    async def place_order(self, context: RunContext, item: list[str], quantity: list[int]) -> dict:
        """
        Place order, store locally, and send to webhook.
        """

        # 🔒 Normalize (VERY IMPORTANT for stability)
        if isinstance(item, str):
            item = [item]
        if isinstance(quantity, int):
            quantity = [quantity]

        # Ensure same length
        if len(item) != len(quantity):
            return {
                "status": "error",
                "message": "Item and quantity length mismatch"
            }

        order = [
            {"item": i, "quantity": q}
            for i, q in zip(item, quantity)
        ]

        with open("orders.txt", "a", encoding="utf-8") as f:
            f.write(json.dumps(order) + "\n")

        try:
            response = requests.post(
                "https://n8n-4195.onrender.com/webhook-test/670a84da-de4b-4ddf-b5e1-0439b75eea89",
                json={
                    "source": "voice-agent",
                    "order": order
                },
                timeout=3  # prevent blocking
            )
            webhook_status = response.status_code
        except Exception as e:
            webhook_status = f"failed: {str(e)}"

        return {
            "status": "success",
            "order": order,
            "webhook_status": webhook_status
        }

server = AgentServer()

@server.rtc_session(agent_name="call_agent")
async def entrypoint(ctx: agents.JobContext):
    session = AgentSession(
        stt=deepgram.STTv2(
            model="flux-general-en",
            eager_eot_threshold=0.6,   # preemptive generation trigger
            eot_threshold=0.7,         # end of turn confidence
            eot_timeout_ms=1000,       # max wait after speech stops
        ),

        llm = lk_openai.LLM(
            base_url="http://localhost:11434/v1",
            api_key="ollama",
            model="gemini-3-flash-preview:cloud",
            tool_choice="auto"
        ),

        # llm=openai.LLM(
        #     model="gpt-4o-mini",
        #     tool_choice="auto"
        # ),

        tts=deepgram.TTS(
            model="aura-2-odysseus-en",
        ),

        vad=silero.VAD.load(
            min_silence_duration=0.2,
            activation_threshold=0.5,
        ),
        # ✅ use Deepgram Flux's built-in turn detection
        turn_detection="stt",

        preemptive_generation=True,
        min_endpointing_delay=0.05,
        max_endpointing_delay=0.3,
        min_interruption_duration=0.2,
        min_interruption_words=1,
    )

    usage_collector = metrics.UsageCollector()
    last_eou_metrics: metrics.EOUMetrics | None = None
    _eou_time: float | None = None

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        nonlocal last_eou_metrics, _eou_time
        if ev.metrics.type == "eou_metrics":
            last_eou_metrics = ev.metrics
            _eou_time = time.time()
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info("Usage Summary: %s", summary)

    ctx.add_shutdown_callback(log_usage)

    @session.on("agent_state_changed")
    def _on_agent_state_changed(ev: AgentStateChangedEvent):
        if ev.new_state == "speaking" and _eou_time:
            elapsed = time.time() - _eou_time
            logger.info(f"Time to first audio: {elapsed:.3f}s")

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )


if __name__ == "__main__":
    agents.cli.run_app(server)