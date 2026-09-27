from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, distinct
from datetime import datetime, timezone
from pydantic import BaseModel

from app.database import get_db
from app.models import SiteVisit, DomainClick, Domain

router = APIRouter()

# Pre-calculated realistic demo totals (so we don't need to sum click_counts each time)
# These are stored here and used when demo mode is active
DEMO_TOTAL_CLICKS = 8356   # sum of all demo domain click_counts
DEMO_TOTAL_VISITORS = 3241 # realistic visitor estimate (clicks * ~0.38)

class TrackRequest(BaseModel):
    visitor_id: str

async def _is_demo_active(db: AsyncSession) -> bool:
    """Returns True if demo mode is currently active (any demo domain is active+not deleted)."""
    res = await db.execute(
        select(func.count(Domain.id)).where(
            Domain.is_demo == True,
            Domain.is_active == True,
            Domain.is_deleted == False
        )
    )
    return (res.scalar_one_or_none() or 0) > 0

@router.post("/track")
async def track_visit(req: TrackRequest, db: AsyncSession = Depends(get_db)):
    visit = SiteVisit(visitor_id=req.visitor_id)
    db.add(visit)
    await db.commit()
    return {"status": "ok"}

@router.get("/daily")
async def get_daily_analytics(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    demo_active = await _is_demo_active(db)

    if demo_active:
        # Demo mode: return pre-calculated realistic demo stats
        # Add today's real visitors on top so the number feels "live"
        v_res = await db.execute(
            select(func.count(distinct(SiteVisit.visitor_id)))
            .where(SiteVisit.created_at >= start_of_day)
        )
        today_real = v_res.scalar_one_or_none() or 0
        return {
            "visitors": DEMO_TOTAL_VISITORS + today_real,
            "clicks": DEMO_TOTAL_CLICKS,
        }
    else:
        # Real mode: count only real (non-demo) data
        v_res = await db.execute(
            select(func.count(distinct(SiteVisit.visitor_id)))
            .where(SiteVisit.created_at >= start_of_day)
        )
        visitors = v_res.scalar_one_or_none() or 0

        subq = (
            select(DomainClick.device_id, DomainClick.domain_id)
            .join(Domain, DomainClick.domain_id == Domain.id)
            .where(
                DomainClick.created_at >= start_of_day,
                Domain.is_active == True,
                Domain.is_deleted == False,
                Domain.is_demo == False,
            )
            .distinct()
            .subquery()
        )
        clicks_res = await db.execute(select(func.count()).select_from(subq))
        real_clicks = clicks_res.scalar_one_or_none() or 0

        return {"visitors": visitors, "clicks": real_clicks}
