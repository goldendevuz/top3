import httpx
import os
import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, timezone
from app.database import get_db
from app.models import Domain, BoardType, User, Transaction, TransactionStatus, DomainClick
from app.dependencies import get_current_user, get_optional_user
from collections import defaultdict
from app.routers.seo import fetch_seo

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ADMIN_CHAT_ID = os.environ.get("ADMIN_TELEGRAM_CHAT_ID")

async def send_telegram_message(text: str):
    if not TELEGRAM_BOT_TOKEN or not ADMIN_CHAT_ID: return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": ADMIN_CHAT_ID, "text": text, "parse_mode": "HTML"}
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, timeout=5.0)
    except Exception as e:
        print("Telegram xato:", e)

router = APIRouter(prefix="/api/domains", tags=["domains"])

class DomainResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    board_type: str
    current_price: Optional[int] = None
    click_count: Optional[int] = None
    is_active: bool
    status: str = "pending"
    is_sponsored: Optional[bool] = False
    created_at: datetime
    owner_id: Optional[int] = None
    owner_email: Optional[str] = None
    custom_url: Optional[str] = None
    custom_cta: Optional[str] = None
    custom_description: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[DomainResponse])
async def get_domains(db: AsyncSession = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    res = await db.execute(select(Domain).filter(Domain.is_active == True, Domain.is_deleted == False))
    domains = res.scalars().all()
    
    now = datetime.utcnow()
    valid_domains = domains
    
    response_list = []
    is_admin = current_user and current_user.email == 'yunusovabdulmajid@gmail.com'
    
    for d in valid_domains:
        d_resp = DomainResponse.model_validate(d)
        is_owner = current_user and current_user.id == d.owner_id
        
        if d.is_sponsored and not is_owner and not is_admin:
            d_resp.current_price = None
            d_resp.click_count = None
            
        response_list.append(d_resp)
        
    return response_list

@router.get("/sponsor-min-price")
async def get_sponsor_min_price(db: AsyncSession = Depends(get_db)):
    """Returns the minimum price a sponsor must pay (max of 5000 and current #1 price)"""
    res = await db.execute(
        select(Domain.current_price)
        .filter(Domain.is_active == True, Domain.is_deleted == False, Domain.is_sponsored == False, Domain.current_price > 0)
        .order_by(Domain.current_price.desc())
        .limit(1)
    )
    top_price = res.scalar_one_or_none() or 0
    min_sponsor = max(5000, top_price)
    return {"min_price": min_sponsor, "top1_price": top_price}

@router.get("/my", response_model=List[DomainResponse])
async def get_my_domains(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy.orm import selectinload
    is_admin = current_user.email and current_user.email.lower() == 'yunusovabdulmajid@gmail.com'
    if is_admin:
        res = await db.execute(select(Domain).options(selectinload(Domain.owner)).filter(Domain.is_deleted == False).order_by(Domain.created_at.desc()))
    else:
        res = await db.execute(select(Domain).options(selectinload(Domain.owner)).filter(Domain.owner_id == current_user.id, Domain.is_deleted == False).order_by(Domain.created_at.desc()))
    domains = res.scalars().all()
    
    response_list = []
    for d in domains:
        d_resp = DomainResponse.model_validate(d)
        if d.owner:
            d_resp.owner_email = d.owner.email
        response_list.append(d_resp)
        
    return response_list

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Only count real (non-demo) domains
    active_count_res = await db.execute(
        select(func.count(Domain.id)).filter(
            Domain.is_active == True, Domain.is_deleted == False, Domain.is_demo == False
        )
    )
    active_count = active_count_res.scalar_one_or_none() or 0

    total_clicks_res = await db.execute(
        select(func.sum(Domain.click_count)).filter(
            Domain.is_active == True, Domain.is_deleted == False, Domain.is_demo == False
        )
    )
    total_clicks = total_clicks_res.scalar_one_or_none() or 0

    today = date.today()
    today_pay_res = await db.execute(
        select(func.sum(Transaction.amount)).filter(
            Transaction.status == TransactionStatus.paid,
            func.date(Transaction.created_at) == today
        )
    )
    today_payments = today_pay_res.scalar_one_or_none() or 0

    return {
        "active_domains": active_count,
        "total_clicks": total_clicks,
        "today_payments": today_payments
    }

@router.get("/daily")
async def get_daily_rankings(db: AsyncSession = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    res = await db.execute(select(Domain).filter(Domain.is_active == True, Domain.board_type != BoardType.ochiq, Domain.is_deleted == False))
    domains = res.scalars().all()
    
    grouped = defaultdict(list)
    is_admin = current_user and current_user.email == 'yunusovabdulmajid@gmail.com'
    
    for d in domains:
        is_owner = current_user and current_user.id == d.owner_id
        c_price = d.current_price
        c_clicks = d.click_count
        
        if d.is_sponsored and not is_owner and not is_admin:
            c_price = None
            c_clicks = None
            
        day_str = d.created_at.strftime('%Y-%m-%d')
        grouped[day_str].append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "category": d.category,
            "board_type": d.board_type.value,
            "current_price": c_price,
            "click_count": c_clicks,
            "is_active": d.is_active,
            "created_at": d.created_at.isoformat(),
            "is_sponsored": d.is_sponsored,
            "owner_id": d.owner_id
        })
        
    return grouped

class AddDomainRequest(BaseModel):
    name: str
    board_type: str
    price: int = 0
    description: Optional[str] = None
    category: Optional[str] = None
    user_id: int
    is_sponsored: bool = False
    custom_url: Optional[str] = None
    custom_cta: Optional[str] = None
    custom_description: Optional[str] = None

@router.post("/")
async def add_domain(req: AddDomainRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_res = await db.execute(select(User).filter(User.id == req.user_id))
    user = user_res.scalars().first()
    is_admin = user and user.email == "yunusovabdulmajid@gmail.com"

    if not req.description or req.description == "Ma'lumot topilmadi" or req.description.strip() == "":
        raise HTTPException(
            status_code=400, 
            detail="Saytga ulanib bo'lmadi yoki SEO tavsifi topilmadi. Boshqa domen kiriting yoki saytni sozlang."
        )

    if req.board_type == "ochiq" or req.price == 0:
        seo_data = await fetch_seo(req.name)
        if seo_data.get("is_redirected"):
            raise HTTPException(status_code=400, detail="REDIRECT_NOT_ALLOWED_FOR_FREE")

    res = await db.execute(select(Domain).filter(Domain.name == req.name, Domain.board_type == req.board_type))
    existing = res.scalars().first()
    if existing:
        if existing.is_active and not existing.is_deleted:
            raise HTTPException(status_code=400, detail="Bu domen allaqachon ro'yxatda faol")
        else:
            was_deleted = existing.is_deleted
            existing.is_deleted = False
            existing.current_price = req.price
            if req.description:
                existing.description = req.description
            if req.category:
                existing.category = req.category
            existing.owner_id = req.user_id
            existing.is_sponsored = req.is_sponsored
            
            if was_deleted:
                existing.is_active = (req.board_type == "ochiq") or (req.price == 0) or is_admin
            
            if is_admin:
                existing.is_active = True
                if req.is_sponsored:
                    existing.sponsored_until = datetime.utcnow() + timedelta(days=7)
            
            await db.commit()
            await db.refresh(existing)
            
            if existing.is_active:
                plan = "Sponsor" if req.is_sponsored else ("Ochiq" if req.board_type == "ochiq" else "Pullik")
                price_fmt = f"{existing.current_price:,}".replace(",", " ") + " so'm" if existing.current_price else "Bepul"
                cat_text = existing.category or "Boshqa"
                msg = (
                    "🚀 <b>Yangi sayt yangilandi/qo'shildi!</b>\n"
                    f"🌐 Domen: {existing.name}\n"
                    f"🏷 Turi: {plan}\n"
                    f"💰 To'lov: {price_fmt}\n"
                    f"📂 Kategoriya: {cat_text}"
                )
                background_tasks.add_task(send_telegram_message, msg)
                
            return existing
        
        
    is_active = (req.board_type == "ochiq") or (req.price == 0) or is_admin
    
    d = Domain(
        name=req.name,
        board_type=req.board_type,
        current_price=req.price,
        description=req.description,
        category=req.category,
        owner_id=req.user_id,
        is_active=is_active,
        is_sponsored=req.is_sponsored,
        custom_url=req.custom_url,
        custom_cta=req.custom_cta,
        custom_description=req.custom_description
    )
    if is_admin and req.is_sponsored:
        d.sponsored_until = datetime.utcnow() + timedelta(days=7)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    
    plan = "Sponsor" if req.is_sponsored else ("Ochiq" if req.board_type == "ochiq" else "Pullik")
    price_fmt = f"{d.current_price:,}".replace(",", " ") + " so'm" if d.current_price else "Bepul"
    cat_text = d.category or "Boshqa"
    msg = (
        "🚀 <b>Yangi sayt qo'shildi!</b>\n"
        f"🌐 Domen: {d.name}\n"
        f"🏷 Turi: {plan}\n"
        f"💰 To'lov: {price_fmt}\n"
        f"📂 Kategoriya: {cat_text}"
    )
    background_tasks.add_task(send_telegram_message, msg)
    
    return d

class ClickRequest(BaseModel):
    device_id: str

@router.post("/{domain_id}/click")
async def register_click(domain_id: int, req: ClickRequest, request: Request, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Domain).filter(Domain.id == domain_id, Domain.is_deleted == False))
    domain = res.scalars().first()
    if not domain:
        raise HTTPException(status_code=404, detail="Not found")
        
    forwarded_for = request.headers.get("x-forwarded-for")
    real_ip = request.headers.get("x-real-ip")
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()
    elif real_ip:
        client_ip = real_ip
    else:
        client_ip = request.client.host if request.client else None

    user_agent = request.headers.get("user-agent")

    now = datetime.now(timezone.utc)
    start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    stmt = select(DomainClick).filter(
        DomainClick.domain_id == domain_id,
        DomainClick.created_at >= start_of_day,
        or_(
            DomainClick.device_id == req.device_id,
            and_(
                DomainClick.ip_address != None,
                DomainClick.ip_address == client_ip,
                DomainClick.user_agent == user_agent
            )
        )
    )
    click_res = await db.execute(stmt)
    existing_click = click_res.scalars().first()
    
    if not existing_click:
        new_click = DomainClick(domain_id=domain_id, device_id=req.device_id, ip_address=client_ip, user_agent=user_agent)
        db.add(new_click)
        domain.click_count += 1
        await db.commit()
    return {"status": "ok", "clicks": domain.click_count}

@router.post("/{domain_id}/visit")
async def register_visit(domain_id: int, db: AsyncSession = Depends(get_db)):
    # Deprecated: Kept for backwards compatibility if needed
    res = await db.execute(select(Domain).filter(Domain.id == domain_id, Domain.is_deleted == False))
    domain = res.scalars().first()
    if not domain:
        raise HTTPException(status_code=404, detail="Not found")
    domain.click_count += 1
    await db.commit()
    return {"status": "ok"}

@router.delete("/{domain_id}")
async def delete_domain(domain_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy import delete
    from app.models import Transaction
    is_admin = current_user.email == "yunusovabdulmajid@gmail.com"
    
    res = await db.execute(select(Domain).filter(Domain.id == domain_id))
    domain = res.scalars().first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
        
    if not is_admin and domain.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner or admin can delete domains")
        
    domain.is_deleted = True
    await db.commit()
    return {"message": "Domain soft deleted successfully"}

class StatusUpdateRequest(BaseModel):
    status: str

@router.put("/{domain_id}/status")
async def update_domain_status(domain_id: int, req: StatusUpdateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.email == "yunusovabdulmajid@gmail.com"
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admin can update domain status")
        
    if req.status not in ["active", "pending", "banned"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    res = await db.execute(select(Domain).filter(Domain.id == domain_id))
    domain = res.scalars().first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
        
    domain.status = req.status
    if req.status == "active":
        domain.is_active = True
    else:
        domain.is_active = False
        
    await db.commit()
    return {"message": "Status updated successfully"}

@router.post("/{domain_id}/refresh")
async def refresh_domain_seo(domain_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.email == "yunusovabdulmajid@gmail.com"
    res = await db.execute(select(Domain).filter(Domain.id == domain_id))
    domain = res.scalars().first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
        
    if not is_admin and domain.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner or admin can refresh SEO")
        
    seo_data = await fetch_seo(domain.name)
    if not domain.is_sponsored and (domain.current_price is None or domain.current_price == 0):
        if seo_data.get("is_redirected"):
            raise HTTPException(status_code=400, detail="REDIRECT_NOT_ALLOWED_FOR_FREE")
            
    if seo_data.get("description") and seo_data["description"] != "Ma'lumot topilmadi":
        domain.description = seo_data["description"]
    if seo_data.get("category") and seo_data["category"] != "Boshqa":
        domain.category = seo_data["category"]
        
    await db.commit()
    await db.refresh(domain)
    return {"message": "SEO refreshed successfully", "domain": domain.name}
