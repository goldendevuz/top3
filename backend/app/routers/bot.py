import os
import httpx
from fastapi import APIRouter, Request, BackgroundTasks

router = APIRouter(prefix="/api/webhook/telegram", tags=["telegram_bot"])

async def handle_update(update: dict):
    message = update.get("message")
    if not message:
        return
    text = message.get("text", "")
    chat_id = message.get("chat", {}).get("id")
    if not chat_id:
        return
    
    if text.startswith("/start"):
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not token:
            return
        
        base_url = os.getenv("BASE_URL", "https://piglet-factual-mentally.ngrok-free.app")
        
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": "Assalomu alaykum! Top3.uz admin xabarnomalari botiga xush kelibsiz. Bu yerda sayt qo'shilganda bildirishnomalar keladi."
        }
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload)

@router.post("")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        update = await request.json()
        background_tasks.add_task(handle_update, update)
    except Exception:
        pass
    return {"ok": True}
