from fastapi import APIRouter, HTTPException, Depends
from database import get_db, close_db
from models import PasswordVerifyRequest, PasswordChangeRequest, ConfigStatus, TelegramConfig, TelegramConfigUpdate
import aiosqlite
import bcrypt
import httpx

router = APIRouter(prefix="/api/config", tags=["config"])

def hash_password(password: str) -> str:
    """Hash a password with bcrypt (truncated to 72 chars to avoid algorithm limits)."""
    if not password:
        return ""
    # Bcrypt limit is 72 bytes. 
    # Encoding to utf-8 and slicing ensures we don't hit the ValueError.
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hash."""
    if not hashed:
        return False
    try:
        pwd_bytes = password.encode('utf-8')[:72]
        hash_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

async def get_config(key: str, db: aiosqlite.Connection) -> str:
    cursor = await db.execute("SELECT value FROM config WHERE key = ?", (key,))
    row = await cursor.fetchone()
    return row[0] if row else None

async def set_config(key: str, value: str, db: aiosqlite.Connection):
    await db.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
        (key, value)
    )
    await db.commit()

@router.get("/status", response_model=ConfigStatus)
async def get_status():
    db = await get_db()
    try:
        password = await get_config("admin_password", db)
        return {"password_required": password is not None and password != ""}
    finally:
        await close_db(db)

@router.post("/verify")
async def verify_pass(payload: PasswordVerifyRequest):
    db = await get_db()
    try:
        hashed_password = await get_config("admin_password", db)
        if not hashed_password:
            return {"success": True, "message": "No password set"}
            
        if verify_password(payload.password, hashed_password):
            return {"success": True}
        else:
            raise HTTPException(status_code=401, detail="Invalid password")
    finally:
        await close_db(db)

@router.post("/password")
async def update_password(payload: PasswordChangeRequest):
    db = await get_db()
    try:
        current_hash = await get_config("admin_password", db)
        
        # If current password is set, verify it first
        if current_hash:
            if not payload.current_password or not verify_password(payload.current_password, current_hash):
                raise HTTPException(status_code=401, detail="Current password incorrect")
        
        # Update even if current_hash was None (first time setting)
        new_hash = hash_password(payload.new_password)
        await set_config("admin_password", new_hash, db)
        return {"success": True}
    finally:
        await close_db(db)
@router.get("/telegram", response_model=TelegramConfig)
async def get_telegram_config():
    db = await get_db()
    try:
        bot_token = await get_config("telegram_bot_token", db)
        chat_id = await get_config("telegram_chat_id", db)
        return {
            "bot_token": bot_token,
            "chat_id": chat_id,
            "is_integrated": bool(bot_token and chat_id)
        }
    finally:
        await close_db(db)

@router.post("/telegram")
async def update_telegram_config(payload: TelegramConfigUpdate):
    db = await get_db()
    try:
        await set_config("telegram_bot_token", payload.bot_token, db)
        await set_config("telegram_chat_id", payload.chat_id, db)
        return {"success": True}
    finally:
        await close_db(db)

@router.delete("/telegram")
async def delete_telegram_config():
    db = await get_db()
    try:
        await db.execute("DELETE FROM config WHERE key IN ('telegram_bot_token', 'telegram_chat_id')")
        await db.commit()
        return {"success": True}
    finally:
        await close_db(db)

@router.post("/telegram/test")
async def test_telegram_config(payload: TelegramConfigUpdate):
    url = f"https://api.telegram.org/bot{payload.bot_token}/getMe"
    try:
        async with httpx.AsyncClient() as client:
            # First test if bot exists
            resp = await client.get(url, timeout=10)
            if resp.status_code != 200:
                return {"success": False, "message": "Invalid Bot Token"}
            
            # Then try sending a test message
            send_url = f"https://api.telegram.org/bot{payload.bot_token}/sendMessage"
            send_resp = await client.post(send_url, json={
                "chat_id": payload.chat_id,
                "text": "🦜 *Parrot Pod Test Message*\n\nYour Telegram integration is working perfectly!",
                "parse_mode": "Markdown"
            }, timeout=10)
            
            if send_resp.status_code == 200:
                return {"success": True, "message": "Test message sent!"}
            else:
                err_data = send_resp.json()
                return {"success": False, "message": f"Telegram Error: {err_data.get('description', 'Unknown error')}"}
    except Exception as e:
        return {"success": False, "message": f"Connection Error: {str(e)}"}
