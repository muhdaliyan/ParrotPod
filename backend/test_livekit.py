import os
import httpx
import asyncio
from dotenv import load_dotenv
from livekit.api import AccessToken, VideoGrants, SIPGrants

load_dotenv()

def get_livekit_config():
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    url = os.getenv("LIVEKIT_URL")
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

async def test_list_numbers():
    token = get_token()
    rest_url = get_rest_url()
    print(f"Testing URL: {rest_url}")
    
    timeout = httpx.Timeout(20.0, read=30.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            print("--- Fetching Phone Numbers ---")
            resp = await client.post(
                f"{rest_url}/twirp/livekit.PhoneNumberService/ListPhoneNumbers",
                json={},
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            )
            print(f"Status: {resp.status_code}")
            if resp.is_success:
                print("Response JSON:")
                import json
                print(json.dumps(resp.json(), indent=2))
            else:
                print(f"Error: {resp.text}")
        except Exception as e:
            print(f"Exception in ListPhoneNumbers: {e}")

        try:
            print("\n--- Fetching SIP Dispatch Rules ---")
            resp_sip = await client.post(
                f"{rest_url}/twirp/livekit.SIP/ListSIPDispatchRule",
                json={},
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            )
            print(f"SIP Rules Status: {resp_sip.status_code}")
            if resp_sip.is_success:
                print("SIP Rules JSON:")
                import json
                print(json.dumps(resp_sip.json(), indent=2))
        except Exception as e:
            print(f"Exception in ListSIPDispatchRule: {e}")

        try:
            print("\n--- Fetching SIP Trunks ---")
            resp_trunk = await client.post(
                f"{rest_url}/twirp/livekit.SIP/ListSIPTrunk",
                json={},
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            )
            print(f"SIP Trunks Status: {resp_trunk.status_code}")
            if resp_trunk.is_success:
                print("SIP Trunks JSON:")
                import json
                print(json.dumps(resp_trunk.json(), indent=2))
        except Exception as e:
            print(f"Exception in ListSIPTrunk: {e}")

if __name__ == "__main__":
    asyncio.run(test_list_numbers())
