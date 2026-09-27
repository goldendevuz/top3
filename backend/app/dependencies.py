import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.database import get_db
from app.models import User

security = HTTPBearer(auto_error=False)

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    if not credentials:
        return None
    token = credentials.credentials
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
