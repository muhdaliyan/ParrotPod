from fastapi import APIRouter
from database import get_db, close_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats():
    db = await get_db()
    try:
        # Total agents
        cursor = await db.execute("SELECT COUNT(*) as count FROM agents")
        total_agents = (await cursor.fetchone())["count"]

        # Active agents (status = 'published' or has sessions in last 7 days)
        cursor = await db.execute("SELECT COUNT(*) as count FROM agents WHERE status = 'published'")
        active_agents = (await cursor.fetchone())["count"]

        # Total sessions
        cursor = await db.execute("SELECT COUNT(*) as count FROM sessions")
        total_sessions = (await cursor.fetchone())["count"]

        # Sessions today
        cursor = await db.execute(
            "SELECT COUNT(*) as count FROM sessions WHERE DATE(created_at) = DATE('now')"
        )
        sessions_today = (await cursor.fetchone())["count"]

        # Total orders
        cursor = await db.execute("SELECT COUNT(*) as count FROM orders")
        total_orders = (await cursor.fetchone())["count"]

        # Average session duration
        cursor = await db.execute(
            "SELECT AVG(duration_seconds) as avg FROM sessions WHERE duration_seconds > 0"
        )
        row = await cursor.fetchone()
        avg_duration = float(row["avg"] or 0)

        # Recent sessions (with agent name)
        cursor = await db.execute("""
            SELECT 
                s.id, s.caller_id, s.livekit_room, s.duration_seconds,
                s.status, s.created_at, s.ended_at,
                a.name as agent_name
            FROM sessions s
            LEFT JOIN agents a ON s.agent_id = a.id
            ORDER BY s.created_at DESC
            LIMIT 10
        """)
        recent_sessions = [dict(r) for r in await cursor.fetchall()]

        # Sessions per day (last 7 days for chart)
        cursor = await db.execute("""
            SELECT DATE(created_at) as day, COUNT(*) as count
            FROM sessions
            WHERE created_at >= DATE('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        """)
        sessions_chart = [dict(r) for r in await cursor.fetchall()]

        return {
            "total_agents": total_agents,
            "active_agents": active_agents,
            "total_sessions": total_sessions,
            "sessions_today": sessions_today,
            "total_orders": total_orders,
            "avg_duration_seconds": round(avg_duration, 1),
            "recent_sessions": recent_sessions,
            "sessions_chart": sessions_chart,
        }
    finally:
        await close_db(db)
