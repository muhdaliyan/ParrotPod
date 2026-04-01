import asyncio
import aiosqlite

async def cleanup():
    async with aiosqlite.connect('./parrotpod.db') as db:
        cur = await db.execute("SELECT COUNT(*) FROM sessions WHERE status='active'")
        count = (await cur.fetchone())[0]
        print(f'Active sessions before: {count}')

        await db.execute("""
            UPDATE sessions
            SET status = 'ended',
                ended_at = CURRENT_TIMESTAMP,
                duration_seconds = CAST((julianday(CURRENT_TIMESTAMP) - julianday(created_at)) * 86400 AS INTEGER)
            WHERE status = 'active'
            AND created_at < datetime('now', '-5 minutes')
        """)
        await db.commit()

        cur = await db.execute("SELECT COUNT(*) FROM sessions WHERE status='active'")
        remaining = (await cur.fetchone())[0]
        print(f'Active sessions after (< 5min old): {remaining}')
        print('Cleanup done!')

asyncio.run(cleanup())
