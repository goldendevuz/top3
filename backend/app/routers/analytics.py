from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, distinct
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import SiteVisit, DomainClick, Domain

router = APIRouter()

class TrackRequest(BaseModel):
    visitor_id: str

@router.post("/track")
async def track_visit(req: TrackRequest, db: AsyncSession = Depends(get_db)):
    visit = SiteVisit(visitor_id=req.visitor_id)
    db.add(visit)
    await db.commit()
    return {"status": "ok"}

@router.get("/daily")
async def get_daily_analytics(db: AsyncSession = Depends(get_db)):
    # Start of today (UTC)
    now = datetime.now(timezone.utc)
    start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    
    # Visitors: count distinct visitor_id today
    v_res = await db.execute(select(func.count(distinct(SiteVisit.visitor_id))).where(SiteVisit.created_at >= start_of_day))
    visitors = v_res.scalar_one_or_none() or 0
    
    # Clicks: unique (device_id, domain_id) today for active non-deleted domains
    subq = select(DomainClick.device_id, DomainClick.domain_id)\
        .join(Domain, DomainClick.domain_id == Domain.id)\
        .where(DomainClick.created_at >= start_of_day, Domain.is_active == True, Domain.is_deleted == False)\
        .distinct().subquery()
    clicks_res = await db.execute(select(func.count()).select_from(subq))
    real_clicks = clicks_res.scalar_one_or_none() or 0
    
    # Add demo clicks (mocking unique clicks for demo domains for today)
    demo_res = await db.execute(select(func.sum(Domain.click_count))\
        .where(Domain.is_demo == True, Domain.is_active == True, Domain.is_deleted == False))
    demo_clicks = demo_res.scalar_one_or_none() or 0
    
    total_clicks = real_clicks + int(demo_clicks)
    visitors += int(demo_clicks) # Add to visitors too, so it makes sense that they were visited
    
    return {
        "visitors": visitors,
        "clicks": total_clicks
    }
