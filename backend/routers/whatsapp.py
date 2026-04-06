import asyncio
import json
import os
import subprocess
import logging
from fastapi import APIRouter, HTTPException
from database import get_db, close_db
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/config/whatsapp", tags=["whatsapp"])

BRIDGE_SCRIPT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "whatsapp_bridge.js"))

import threading
import queue

class WhatsAppManager:
    _instance = None
    
    def __init__(self):
        self.process = None
        self.qr_code = None
        self.status = self._detect_initial_status()
        self._read_thread = None
        self._stderr_thread = None
        self._loop = None
        
    def _detect_initial_status(self):
        # Check if session exists to avoid flickering to "Not Linked"
        session_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "whatsapp_sessions")
        creds_file = os.path.join(session_dir, "creds.json")
        if os.path.exists(creds_file):
            return "INITIALIZING"
        return "DISCONNECTED"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = WhatsAppManager()
        return cls._instance
        
    async def start(self):
        if self.process and self.process.poll() is None:
            return
            
        import shutil
        node_exe = shutil.which("node") or "node"
        PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        
        if not os.path.exists(BRIDGE_SCRIPT):
            logger.error(f"WhatsApp bridge script not found at: {BRIDGE_SCRIPT}")
            self.status = "ERROR"
            return

        logger.info(f"Starting WhatsApp Bridge. Node: {node_exe}, Script: {BRIDGE_SCRIPT}, Root: {PROJECT_ROOT}")
        self._loop = asyncio.get_running_loop()
        
        # Reset QR on start to avoid stale QR from previous runs
        self.qr_code = None
        
        try:
            # Using synchronous Popen with threads for stability
            self.process = subprocess.Popen(
                [node_exe, BRIDGE_SCRIPT],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE,
                cwd=PROJECT_ROOT,
                text=True,
                bufsize=1
            )
            
            self._read_thread = threading.Thread(target=self._thread_read_stdout, daemon=True)
            self._read_thread.start()
            
            self._stderr_thread = threading.Thread(target=self._thread_read_stderr, daemon=True)
            self._stderr_thread.start()
            
            logger.info("WhatsApp bridge subprocess initiated")
        except Exception as e:
            logger.error(f"Failed to start WhatsApp bridge: {repr(e)}")
            self.status = "ERROR"

    def _thread_read_stderr(self):
        while self.process and self.process.poll() is None:
            line = self.process.stderr.readline()
            if not line: break
            logger.error(f"[WhatsApp Bridge Error] {line.strip()}")

    def _thread_read_stdout(self):
        while self.process and self.process.poll() is None:
            line = self.process.stdout.readline()
            if not line: break
            
            line = line.strip()
            if not line: continue
            
            logger.info(f"[WhatsApp Bridge Stdout] {line}")
            self._loop.call_soon_threadsafe(self._handle_line, line)

    def _handle_line(self, line: str):
        if line.startswith("QR_CODE: "):
            self.qr_code = line[9:]
            self.status = "SCAN_REQUIRED"
            logger.info("WhatsApp QR Code received")
        elif line.startswith("STATE: "):
            # Multi-word state handling (e.g. STATE: UPDATING - connection: ...)
            parts = line[7:].split(" ")
            new_status = parts[0]
            
            # If it says CONNECTED, set status immediately
            if new_status == "CONNECTED":
                self.status = "CONNECTED"
                self.qr_code = None
            elif new_status == "DISCONNECTED":
                self.status = "DISCONNECTED"
            elif new_status == "INITIALIZING" or new_status == "UPDATING":
                # Only change status if we aren't already connected
                if self.status != "CONNECTED":
                    self.status = new_status
            
            logger.info(f"WhatsApp Status Updated: {self.status}")
        elif line.startswith("MESSAGE: "):
            try:
                msg_data = json.loads(line[9:])
                asyncio.create_task(self._handle_message(msg_data))
            except Exception as e:
                logger.error(f"Failed to parse message: {e}")
                
    async def _handle_message(self, msg_data):
        """Handle incoming WhatsApp message by calling the AI agent."""
        sender = msg_data['from']
        text = msg_data['text']
        push_name = msg_data.get('pushName', 'Customer')
        logger.info(f"WhatsApp Message from {push_name} ({sender}): {text}")

    async def send_message(self, to: str, text: str):
        if self.process and self.process.stdin:
            cmd = json.dumps({"type": "send", "to": to, "text": text})
            try:
                self.process.stdin.write(cmd + "\n")
                self.process.stdin.flush()
            except Exception as e:
                logger.error(f"Failed to send message: {e}")

    async def logout(self):
        if self.process and self.process.stdin:
            try:
                cmd = json.dumps({"type": "logout"})
                self.process.stdin.write(cmd + "\n")
                self.process.stdin.flush()
            except:
                pass
            
        if self.process:
            try:
                self.process.terminate()
            except:
                pass
            
        self.process = None
        self.qr_code = None
        self.status = "DISCONNECTED"

manager = WhatsAppManager.get_instance()

@router.get("/status")
async def get_status():
    if not manager.process or manager.process.poll() is not None:
        await manager.start()
        
    return {
        "status": manager.status,
        "qr_code": manager.qr_code
    }

@router.post("/reset")
async def reset_whatsapp():
    logger.info("Resetting WhatsApp Integration...")
    await manager.logout()
    
    # Wait a moment for process to die
    await asyncio.sleep(1)
    
    # Delete session folder
    session_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "whatsapp_sessions")
    if os.path.exists(session_dir):
        try:
            import shutil
            shutil.rmtree(session_dir)
            logger.info("WhatsApp sessions cleared.")
        except Exception as e:
            logger.error(f"Failed to clear sessions: {e}")
            
    # Auto-restart
    await manager.start()
    return {"status": "success", "message": "WhatsApp bridge reset. New QR code will be generated."}

@router.post("/start")
async def start_bridge():
    await manager.start()
    return {"success": True}

@router.post("/disconnect")
async def disconnect():
    await manager.logout()
    return {"success": True}
