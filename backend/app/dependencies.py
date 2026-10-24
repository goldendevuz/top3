import httpx
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.database import get_db
from app.models import User

security = HTTPBearer(auto_error=False)

async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security), 
    db: AsyncSession = Depends(get_db)
):
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        auth_hdr = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth_hdr:
            if auth_hdr.lower().startswith("bearer "):
                token = auth_hdr.split(" ", 1)[1].strip()
            else:
                token = auth_hdr.strip()
    if not token:
        token = request.headers.get("X-Auth-Token")

    if not token:
        x_user_id = request.headers.get("X-User-Id")
        if x_user_id and x_user_id.isdigit():
            stmt = select(User).where(User.id == int(x_user_id))
            result = await db.execute(stmt)
            return result.scalars().first()
        return None

    try:
        if token.startswith("tg_"):
            tg_id_number = token.replace("tg_", "")
            tg_google_id = f"telegram_{tg_id_number}"
            stmt = select(User).where(
                or_(User.telegram_id == tg_id_number, User.google_id == tg_google_id)
            )
            result = await db.execute(stmt)
            return result.scalars().first()
        
        # Check DB auth_token first (fast, no external API call)
        stmt = select(User).where(User.auth_token == token)
        result = await db.execute(stmt)
        user = result.scalars().first()
        if user:
            return user
            
        # Fallback: Google access token verification (for legacy tokens)
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"}
            )
            if res.status_code != 200:
                return None
            user_info = res.json()
            google_id = user_info.get("sub")
            if not google_id:
                return None
            
            stmt = select(User).where(User.google_id == google_id)
            result = await db.execute(stmt)
            return result.scalars().first()
    except Exception:
        return None

async def get_current_user(user: User = Depends(get_optional_user)):
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
