import aiosqlite
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_PATH = os.getenv("DATABASE_PATH", "./parrotpod.db")


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Agents table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL DEFAULT 'Unnamed Agent',
                description TEXT DEFAULT '',
                instructions TEXT DEFAULT '',
                welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
                voice TEXT DEFAULT 'aura-2-odysseus-en',
                llm_model TEXT DEFAULT 'gpt-4o-mini',
                language TEXT DEFAULT 'en',
                status TEXT DEFAULT 'draft',
                phone_number TEXT DEFAULT '',
                sip_dispatch_rule_id TEXT DEFAULT '',
                telegram_enabled INTEGER DEFAULT 1,
                webhook_enabled INTEGER DEFAULT 0,
                webhook_url TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Knowledge files table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                filetype TEXT DEFAULT 'txt',
                filesize INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
            )
        """)

        # Voice sessions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id INTEGER,
                caller_id TEXT DEFAULT 'anonymous',
                livekit_room TEXT,
                duration_seconds INTEGER DEFAULT 0,
                transcript TEXT DEFAULT '',
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ended_at DATETIME,
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
            )
        """)

        # Orders / events table (triggers Telegram notification)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id INTEGER,
                session_id INTEGER,
                summary TEXT NOT NULL,
                items TEXT DEFAULT '[]',
                telegram_sent INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
            )
        """)

        await db.commit()
        print("[DB] Tables initialized.")


async def close_db(db: aiosqlite.Connection):
    await db.close()
