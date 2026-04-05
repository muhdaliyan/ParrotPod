from fastapi import APIRouter, HTTPException
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/voices", tags=["voices"])

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

@router.get("")
async def list_voices():
    if not DEEPGRAM_API_KEY:
        raise HTTPException(status_code=500, detail="Deepgram API key not configured")
    
    url = "https://api.deepgram.com/v1/models"
    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=10)
            if resp.status_code != 200:
                # Fallback to a curated list if the API fails or doesn't return what we expect
                return get_fallback_voices()
            
            data = resp.json()
            # Deepgram models API returns a list of models. 
            # We want to filter for TTS/Aura models.
            models = data.get("models", [])
            tts_voices = []
            
            for m in models:
                if m.get("architecture") in ["aura", "aura-2"] or "aura" in m.get("name", "").lower():
                    # Format standard Aura names
                    name = m.get("name")
                    tts_voices.append({
                        "id": name,
                        "name": name.replace("aura-", "").replace("aura-2-", "").title(),
                        "language": m.get("language", "en"),
                        "description": f"Deepgram {m.get('architecture', 'Aura').title()} Voice"
                    })
            
            if not tts_voices:
                return get_fallback_voices()
                
            return tts_voices
            
    except Exception as e:
        print(f"Error fetching Deepgram voices: {e}")
        return get_fallback_voices()

def get_fallback_voices():
    """Curated list of standard Deepgram Aura voices."""
    return [
        {"id": "aura-2-odysseus-en", "name": "Odysseus", "language": "en", "description": "Aura-2 English (Male)"},
        {"id": "aura-2-athena-en", "name": "Athena", "language": "en", "description": "Aura-2 English (Female)"},
        {"id": "aura-2-luna-en", "name": "Luna", "language": "en", "description": "Aura-2 English (Female)"},
        {"id": "aura-2-stella-en", "name": "Stella", "language": "en", "description": "Aura-2 English (Female)"},
        {"id": "aura-2-hera-en", "name": "Hera", "language": "en", "description": "Aura-2 English (Female)"},
        {"id": "aura-2-orion-en", "name": "Orion", "language": "en", "description": "Aura-2 English (Male)"},
        {"id": "aura-2-arcas-en", "name": "Arcas", "language": "en", "description": "Aura-2 English (Male)"},
        {"id": "aura-2-perseus-en", "name": "Perseus", "language": "en", "description": "Aura-2 English (Male)"},
        {"id": "aura-2-angus-en", "name": "Angus", "language": "en", "description": "Aura-2 English (Male)"},
        {"id": "aura-2-orpheus-en", "name": "Orpheus", "language": "en", "description": "Aura-2 English (Male)"},
        {"id": "aura-2-helios-en", "name": "Helios", "language": "en", "description": "Aura-2 English (Male)"},
        {"id": "aura-2-zeus-en", "name": "Zeus", "language": "en", "description": "Aura-2 English (Male)"},
    ]
