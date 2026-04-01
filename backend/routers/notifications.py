from fastapi import APIRouter, HTTPException
from database import get_db, close_db
from models import TelegramNotifyRequest, OrderCreate, OrderOut
import os, json, httpx
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api", tags=["notifications"])

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


async def send_telegram_message(text: str) -> bool:
    """Send a message via Telegram Bot API."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Telegram] Bot token or chat ID not configured.")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "Markdown",
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10)
            return response.status_code == 200
    except Exception as e:
        print(f"[Telegram] Error sending message: {e}")
        return False


@router.post("/notify/telegram", status_code=200)
async def notify_telegram(payload: TelegramNotifyRequest):
    """Send order/event summary to Telegram and store in DB."""
    db = await get_db()
    try:
        # Build message
        items_text = ""
        if payload.items:
            items_text = "\n".join([
                f"  • {item.get('item', 'Unknown')} × {item.get('quantity', 1)}"
                for item in payload.items
            ])

        agent_name = "Unknown Agent"
        if payload.agent_id:
            cursor = await db.execute("SELECT name FROM agents WHERE id = ?", (payload.agent_id,))
            row = await cursor.fetchone()
            if row:
                agent_name = row["name"]

        message = f"""
🦜 *Parrot Pod – New Event*

🤖 *Agent:* {agent_name}
📋 *Summary:* {payload.summary}
"""
        if items_text:
            message += f"\n🛒 *Items:*\n{items_text}"

        message += "\n\n_Sent by Parrot Pod Voice Agent_"

        # Send to Telegram
        sent = await send_telegram_message(message)

        # Store order in DB
        cursor = await db.execute(
            "INSERT INTO orders (agent_id, session_id, summary, items, telegram_sent) VALUES (?, ?, ?, ?, ?)",
            (
                payload.agent_id,
                payload.session_id,
                payload.summary,
                json.dumps(payload.items),
                1 if sent else 0
            )
        )
        await db.commit()
        order_id = cursor.lastrowid

        return {
            "ok": True,
            "telegram_sent": sent,
            "order_id": order_id,
            "message": "Notification sent" if sent else "Saved but Telegram failed"
        }
    finally:
        await close_db(db)


@router.get("/orders", response_model=list[OrderOut])
async def list_orders(limit: int = 50):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM orders ORDER BY created_at DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await close_db(db)
