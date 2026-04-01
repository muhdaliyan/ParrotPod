from fastapi import APIRouter, HTTPException, UploadFile, File
from database import get_db, close_db
from models import FileOut
import os, aiofiles, aiosqlite

router = APIRouter(prefix="/api", tags=["files"])

UPLOAD_DIR = "./uploads"
ALLOWED_TYPES = {
    "text/plain": "txt",
    "text/csv": "csv",
    "application/pdf": "pdf",
    "application/vnd.ms-excel": "csv",
    "application/octet-stream": "txt",
}


async def agent_or_404(agent_id: int, db: aiosqlite.Connection):
    cursor = await db.execute("SELECT id FROM agents WHERE id = ?", (agent_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Agent not found")


@router.post("/agents/{agent_id}/files", response_model=FileOut, status_code=201)
async def upload_file(agent_id: int, file: UploadFile = File(...)):
    db = await get_db()
    try:
        await agent_or_404(agent_id, db)

        # Determine file type
        content_type = file.content_type or "application/octet-stream"
        ext = ALLOWED_TYPES.get(content_type, file.filename.split(".")[-1] if "." in file.filename else "txt")

        # Save file to disk
        agent_dir = os.path.join(UPLOAD_DIR, str(agent_id))
        os.makedirs(agent_dir, exist_ok=True)
        filepath = os.path.join(agent_dir, file.filename)

        content = await file.read()
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)

        filesize = len(content)

        cursor = await db.execute(
            "INSERT INTO files (agent_id, filename, filepath, filetype, filesize) VALUES (?, ?, ?, ?, ?)",
            (agent_id, file.filename, filepath, ext, filesize)
        )
        await db.commit()
        file_id = cursor.lastrowid

        cursor = await db.execute("SELECT * FROM files WHERE id = ?", (file_id,))
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await close_db(db)


@router.get("/agents/{agent_id}/files", response_model=list[FileOut])
async def list_files(agent_id: int):
    db = await get_db()
    try:
        await agent_or_404(agent_id, db)
        cursor = await db.execute(
            "SELECT * FROM files WHERE agent_id = ? ORDER BY created_at DESC", (agent_id,)
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await close_db(db)


@router.delete("/files/{file_id}", status_code=204)
async def delete_file(file_id: int):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM files WHERE id = ?", (file_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")

        file_data = dict(row)
        # Remove from disk
        if os.path.exists(file_data["filepath"]):
            os.remove(file_data["filepath"])

        await db.execute("DELETE FROM files WHERE id = ?", (file_id,))
        await db.commit()
    finally:
        await close_db(db)
