# Parrot Pod – Backend README

## Setup

### 1. Fill in your credentials
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 2. Activate the virtual environment
```bash
# Windows
.\venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. Run the FastAPI backend
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API docs available at: http://localhost:8000/docs

### 4. Run the Voice Agent Worker (separate terminal)
```bash
# Activate venv first
.\venv\Scripts\activate

python voice_agent.py start \
  --url $LIVEKIT_URL \
  --api-key $LIVEKIT_API_KEY \
  --api-secret $LIVEKIT_API_SECRET
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `LIVEKIT_URL` | Your LiveKit server URL (e.g. `wss://myproject.livekit.cloud`) |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `DEEPGRAM_API_KEY` | Deepgram API key (STT + TTS) |
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o-mini) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Your Telegram chat/group ID |
| `DATABASE_PATH` | SQLite path (default: `./parrotpod.db`) |
| `FRONTEND_URL` | Frontend URL for CORS (default: `http://localhost:3000`) |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/agents` | List all agents |
| POST | `/api/agents` | Create agent |
| GET | `/api/agents/{id}` | Get agent |
| PUT | `/api/agents/{id}` | Update agent |
| DELETE | `/api/agents/{id}` | Delete agent |
| POST | `/api/agents/{id}/files` | Upload knowledge file |
| GET | `/api/agents/{id}/files` | List agent files |
| DELETE | `/api/files/{id}` | Delete file |
| POST | `/api/agents/{id}/token` | Get LiveKit JWT token |
| GET | `/api/sessions` | List sessions |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| POST | `/api/notify/telegram` | Send Telegram notification |
| GET | `/api/orders` | List orders |

---

## Voice Agent Architecture

```
Browser (mic) → LiveKit Room → Voice Agent Worker
                                      ↓
                              Deepgram STT (speech to text)
                                      ↓
                              OpenAI GPT-4o-mini (LLM)
                                ↙         ↘
                        lookup_info    place_order
                       (reads files)  (→ Telegram)
                                      ↓
                              Deepgram TTS (text to speech)
                                      ↓
                              Browser (audio)
```
