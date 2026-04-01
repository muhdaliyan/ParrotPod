import os
import httpx
import aiosqlite
from fastapi import APIRouter, HTTPException
from database import get_db, close_db
from livekit.api import AccessToken, VideoGrants, SIPGrants
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/telephony", tags=["telephony"])

def get_livekit_config():
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    url = os.getenv("LIVEKIT_URL")
    if not all([api_key, api_secret, url]):
        raise HTTPException(status_code=500, detail="LiveKit credentials or URL not configured in backend .env")
    return api_key, api_secret, url

def get_token():
    api_key, api_secret, _ = get_livekit_config()
    return (
        AccessToken(api_key, api_secret)
        .with_grants(VideoGrants(room_admin=True))
        .with_sip_grants(SIPGrants(admin=True))
        .to_jwt()
    )

def get_rest_url():
    _, _, url = get_livekit_config()
    return url.replace("wss://", "https://").replace("ws://", "http://")

class AssignRequest(BaseModel):
    phone_number: str
    agent_id: int

@router.get("/numbers")
async def list_numbers():
    token = get_token()
    rest_url = get_rest_url()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{rest_url}/twirp/livekit.PhoneNumberService/ListPhoneNumbers",
            json={},
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        )
        if not resp.is_success:
            print(f"Error fetching numbers: {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch numbers from LiveKit")
        return resp.json()

@router.post("/numbers/assign")
async def assign_number(payload: AssignRequest):
    token = get_token()
    rest_url = get_rest_url()
    
    # We use a naming convention that the voice_agent worker understands: parrotpod-agent-{id}-
    room_name = f"parrotpod-agent-{payload.agent_id}-"
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # 1. First, we MUST find the internal LiveKit ID (PN_...) for this E.164 number
        number_resp = await client.post(f"{rest_url}/twirp/livekit.PhoneNumberService/ListPhoneNumbers", json={}, headers=headers)
        if not number_resp.is_success:
            raise HTTPException(status_code=number_resp.status_code, detail="Failed to fetch number details from LiveKit")
        
        number_info = next((n for n in number_resp.json().get("items", []) if n.get("e164_format") == payload.phone_number), None)
        if not number_info:
            raise HTTPException(status_code=404, detail=f"Phone number {payload.phone_number} not found in your account")
        
        number_id = number_info["id"] # The PN_... internal ID
        
        # 2. Get or Create a SIP Dispatch Rule specifically for this Number ID (Trunk)
        rule_id = None
        list_rules_resp = await client.post(f"{rest_url}/twirp/livekit.SIP/ListSIPDispatchRule", json={}, headers=headers)
        if list_rules_resp.is_success:
            existing_rules = list_rules_resp.json().get("items", [])
            for r in existing_rules:
                # Search for a rule that is already tied to this specific number's ID (trunk)
                if number_id in r.get("trunk_ids", []):
                    rule_id = r.get("sip_dispatch_rule_id")
                    print(f"Found existing rule for number id {number_id}: {rule_id}")
                    break
        
        if rule_id:
            # Update existing rule to point to the current agent's room prefix (Individual routing)
            # Individual routing is better for AI agents as it gives each caller their own room.
            update_payload = {
                "sip_dispatch_rule_id": rule_id,
                "update": {
                    "rule": {
                        "dispatch_rule_individual": {
                            "room_prefix": room_name
                        }
                    }
                }
            }
            await client.post(f"{rest_url}/twirp/livekit.SIP/UpdateSIPDispatchRule", json=update_payload, headers=headers)
        else:
            # Create a NEW rule specific to THIS number ID (Trunk) with Individual routing
            dispatch_payload = {
                "name": f"ParrotPod Number {payload.phone_number} Dispatch",
                "trunk_ids": [number_id], 
                "rule": {
                    "dispatch_rule_individual": {
                        "room_prefix": room_name
                    }
                }
            }
            rule_resp = await client.post(f"{rest_url}/twirp/livekit.SIP/CreateSIPDispatchRule", json=dispatch_payload, headers=headers)
            if not rule_resp.is_success:
                print(f"Error creating dispatch rule: {rule_resp.text}")
                raise HTTPException(status_code=rule_resp.status_code, detail=f"Failed to create SIP dispatch rule: {rule_resp.text}")
            rule_data = rule_resp.json()
            rule_id = rule_data.get("sip_dispatch_rule_id") or rule_data.get("id")
        
        if not rule_id:
             raise HTTPException(status_code=500, detail="LiveKit failed to provide or update a SIP dispatch rule ID")

        # 4. Persistence: Update the database
        db = await get_db()
        try:
            # Check if this number is already assigned to ANOTHER agent
            cursor = await db.execute("SELECT id, name FROM agents WHERE phone_number = ? AND id != ?", (payload.phone_number, payload.agent_id))
            previous_agent = await cursor.fetchone()
            
            # Clear this number from ALL other agents (ensure 1:1)
            await db.execute("UPDATE agents SET phone_number = '', sip_dispatch_rule_id = '' WHERE phone_number = ?", (payload.phone_number,))
            
            # Update the target agent
            await db.execute(
                "UPDATE agents SET phone_number = ?, sip_dispatch_rule_id = ? WHERE id = ?",
                (payload.phone_number, rule_id, payload.agent_id)
            )
            await db.commit()
            
            prev_info = None
            if previous_agent:
                prev_info = {"id": previous_agent["id"], "name": previous_agent["name"]}
                
            return {
                "status": "success", 
                "rule_id": rule_id, 
                "room_name": room_name, 
                "number_id": number_id,
                "previous_agent": prev_info
            }
        finally:
            await close_db(db)

@router.post("/numbers/unassign")
async def unassign_number(payload: AssignRequest):
    """
    Clears the phone number assignment from an agent.
    Note: We don't necessarily delete the SIP rule in LiveKit to avoid complexity,
    we just break the link in our database and LiveKit Number record.
    """
    token = get_token()
    rest_url = get_rest_url()
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # 1. Clear in LiveKit
        update_payload = {
            "phone_number": payload.phone_number,
            "sip_dispatch_rule_id": "" # Clear rule
        }
        await client.post(f"{rest_url}/twirp/livekit.PhoneNumberService/UpdatePhoneNumber", json=update_payload, headers=headers)
        
        # 2. Clear in Database
        db = await get_db()
        try:
            await db.execute(
                "UPDATE agents SET phone_number = '', sip_dispatch_rule_id = '' WHERE id = ?",
                (payload.agent_id,)
            )
            await db.commit()
            return {"status": "success"}
        finally:
            await close_db(db)
