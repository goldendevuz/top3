import os
import asyncio
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Transaction, Domain, TransactionStatus, User
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/payments", tags=["payments"])

INPAY_MERCHANT_ID = os.getenv("INPAY_MERCHANT_ID")
INPAY_MERCHANT_TOKEN = os.getenv("INPAY_MERCHANT_TOKEN")
INPAY_CALLBACK_URL = os.getenv("INPAY_CALLBACK_URL")
INPAY_RETURN_URL = os.getenv("INPAY_RETURN_URL")

_cached_bearer = None
_cached_bearer_expires = None

async def get_inpay_bearer():
    global _cached_bearer, _cached_bearer_expires
    now = datetime.now()
    if _cached_bearer and _cached_bearer_expires and now < _cached_bearer_expires:
        return _cached_bearer

    url = f"https://inpay.uz/api/v1/authorization/?merchant_id={INPAY_MERCHANT_ID}&merchant_token={INPAY_MERCHANT_TOKEN}"
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
        if res.status_code == 200:
            data = res.json()
            if data.get("success") == True:
                _cached_bearer = data.get("bearer_token")
                _cached_bearer_expires = now + timedelta(hours=23)
                return _cached_bearer
    raise HTTPException(status_code=500, detail="Could not authorize with InPay")

class InitPaymentRequest(BaseModel):
    domain_id: int
    user_id: Optional[int] = None  # Authenticated identity is authoritative.


def payment_description(domain: Domain) -> str:
    """Human-readable service name shown on the inPAY checkout page."""
    if domain.is_sponsored:
        return f"Top3.uz platformasida {domain.name} domenini 7 kun Sponsor o'rniga joylashtirish xizmati"
    board_type = getattr(domain.board_type, "value", domain.board_type)
    if board_type == "bugun":
        return f"Top3.uz platformasida {domain.name} domenini Kunlik reytingga joylashtirish xizmati"
    return f"Top3.uz platformasida {domain.name} domenini Umumiy reytingga joylashtirish xizmati"

@router.post("/init")
async def init_payment(req: InitPaymentRequest, request: Request, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(Domain).filter(Domain.id == req.domain_id))
    domain = res.scalars().first()
    if not domain or domain.is_deleted:
        raise HTTPException(status_code=404, detail="Domain not found")

    if domain.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to pay for this domain")
    if domain.is_active:
        raise HTTPException(status_code=409, detail="Domain is already active")

    payment_amount = domain.current_price
    if payment_amount < 1000:
        raise HTTPException(status_code=400, detail="Payment amount must be at least 1,000 UZS")

    bearer = await get_inpay_bearer()
    
    payload = {
        "merchant_id": INPAY_MERCHANT_ID,
        "token": INPAY_MERCHANT_TOKEN,
        "amount": payment_amount,
        "callback_url": INPAY_CALLBACK_URL,
        "return_url": INPAY_RETURN_URL,
        "description": payment_description(domain),
    }
    
    headers = {"Authorization": f"Bearer {bearer}", "Content-Type": "application/json"}
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post("https://inpay.uz/api/v1/create/", json=payload, headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="InPay create order failed")
        data = res.json()
        if data.get("success") != True:
            raise HTTPException(status_code=400, detail="InPay returned error: " + data.get("message", ""))
            
        order_id = data.get("order_id")
        pay_url = data.get("pay_url")
        
        tx = Transaction(
            user_id=current_user.id,
            domain_id=domain.id,
            amount=payment_amount,
            status=TransactionStatus.pending,
            inpay_order_id=order_id
        )
        db.add(tx)
        
        # Pullik domenni tasdiqlanmagan holda yashirish:
        domain.is_active = False 
        domain.status = "pending_payment"
        
        await db.commit()
        await db.refresh(tx)
        
        return {"order_id": order_id, "pay_url": pay_url}

class WebhookRequest(BaseModel):
    order_id: str
    status: str
    # and other fields sent by webhook

async def verify_payment_status(order_id: str):
    try:
        bearer = await get_inpay_bearer()
        headers = {"Authorization": f"Bearer {bearer}"}
        url = f"https://inpay.uz/api/v1/transactions/?order_id={order_id}&merchant_id={INPAY_MERCHANT_ID}"
        
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers)
            if res.status_code == 200:
                data = res.json()
                verified_status = str(data.get("status", "")).lower()
                verified_amount = data.get("amount")
                if data.get("success") == True and verified_status == "success":
                    # Update DB
                    from app.database import AsyncSessionLocal
                    from app.routers.domains import send_telegram_message
                    async with AsyncSessionLocal() as db:
                        res = await db.execute(select(Transaction).filter(Transaction.inpay_order_id == order_id))
                        tx = res.scalars().first()
                        if tx and tx.status != TransactionStatus.paid and str(verified_amount) == str(tx.amount):
                            tx.status = TransactionStatus.paid
                            # Need to load domain since it's lazy
                            res_dom = await db.execute(select(Domain).filter(Domain.id == tx.domain_id))
                            domain = res_dom.scalars().first()
                            if domain:
                                domain.is_active = True
                                domain.current_price = tx.amount
                                if domain.is_sponsored:
                                    domain.sponsored_until = datetime.utcnow() + timedelta(days=7)
                                
                                msg = f"💰 Yangi to'lov: {domain.name} uchun {tx.amount} so'm to'landi."
                                asyncio.create_task(send_telegram_message(msg))
                                
                            await db.commit()
    except Exception as e:
        print(f"Error verifying payment: {e}")

@router.post("/webhook")
async def payment_webhook(payload: dict, background_tasks: BackgroundTasks):
    order_id = payload.get("order_id")
    if order_id:
        background_tasks.add_task(verify_payment_status, order_id)
    return {"status": "ok"}

@router.get("/status/{domain_id}")
async def payment_status(domain_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(Transaction).filter(Transaction.domain_id == domain_id, Transaction.user_id == current_user.id).order_by(Transaction.created_at.desc()))
    tx = res.scalars().first()
    if not tx:
        raise HTTPException(status_code=404, detail="Payment not found")
    if tx.status == TransactionStatus.pending and tx.inpay_order_id:
        await verify_payment_status(tx.inpay_order_id)
        await db.refresh(tx)
    domain = await db.get(Domain, domain_id)
    return {"status": tx.status.value, "is_active": bool(domain and domain.is_active), "order_id": tx.inpay_order_id}

@router.get("/return")
async def payment_return():
    return RedirectResponse(url="https://top3.uz/")
