from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Agent Models ──────────────────────────────────────────────────────────────

class AgentCreate(BaseModel):
    name: str = Field(default="New Agent", min_length=1, max_length=100)
    description: str = Field(default="")
    instructions: str = Field(default="")
    welcome_message: str = Field(default="Hello! How can I help you today?")
    voice: str = Field(default="aura-2-odysseus-en")
    llm_model: str = Field(default="gpt-4o-mini")
    language: str = Field(default="en-US")
    telegram_enabled: bool = Field(default=True)
    webhook_enabled: bool = Field(default=False)
    webhook_url: str = Field(default="")


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    welcome_message: Optional[str] = None
    voice: Optional[str] = None
    llm_model: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    phone_number: Optional[str] = None
    sip_dispatch_rule_id: Optional[str] = None
    telegram_enabled: Optional[bool] = None
    webhook_enabled: Optional[bool] = None
    webhook_url: Optional[str] = None


class AgentOut(BaseModel):
    id: int
    name: str
    description: str
    instructions: str
    welcome_message: str
    voice: str
    llm_model: str
    language: str
    status: str
    phone_number: str
    sip_dispatch_rule_id: str
    telegram_enabled: bool
    webhook_enabled: bool
    webhook_url: str
    created_at: str
    updated_at: str


# ─── File Models ───────────────────────────────────────────────────────────────

class FileOut(BaseModel):
    id: int
    agent_id: int
    filename: str
    filetype: str
    filesize: int
    created_at: str


# ─── Session Models ────────────────────────────────────────────────────────────

class SessionOut(BaseModel):
    id: int
    agent_id: Optional[int]
    caller_id: str
    livekit_room: Optional[str]
    duration_seconds: int
    transcript: str
    status: str
    created_at: str
    ended_at: Optional[str]


class TokenResponse(BaseModel):
    token: str
    room_name: str
    livekit_url: str
    session_id: int


# ─── Order / Notification Models ───────────────────────────────────────────────

class OrderCreate(BaseModel):
    agent_id: Optional[int] = None
    session_id: Optional[int] = None
    summary: str
    items: List[dict] = []


class OrderOut(BaseModel):
    id: int
    agent_id: Optional[int]
    session_id: Optional[int]
    summary: str
    items: str
    telegram_sent: int
    created_at: str


class TelegramNotifyRequest(BaseModel):
    agent_id: Optional[int] = None
    session_id: Optional[int] = None
    summary: str
    items: List[dict] = []


# ─── Dashboard Models ──────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_agents: int
    active_agents: int
    total_sessions: int
    sessions_today: int
    total_orders: int
    avg_duration_seconds: float
    recent_sessions: List[dict]
    sessions_chart: List[dict]


# ─── Config Models ─────────────────────────────────────────────────────────────

class PasswordVerifyRequest(BaseModel):
    password: str

class PasswordChangeRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str

class ConfigStatus(BaseModel):
    password_required: bool

class TelegramConfig(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None
    is_integrated: bool = False

class TelegramConfigUpdate(BaseModel):
    bot_token: str
    chat_id: str

