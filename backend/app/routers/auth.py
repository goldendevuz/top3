from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import httpx
import os
import urllib.parse
from sqlalchemy.future import select
from sqlalchemy import or_, update
from app.database import AsyncSessionLocal, get_db
from app.models import User, Domain, Transaction
from app.dependencies import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/auth", tags=["auth"])

class GoogleLoginRequest(BaseModel):
    access_token: str

class TelegramLoginRequest(BaseModel):
    id: int
    first_name: str
    username: str = None

@router.post("/telegram")
async def telegram_login(req: TelegramLoginRequest):
    google_id = f"telegram_{req.id}"
    email = f"{req.username or req.id}@telegram.me"
    name = req.first_name
    
    async with AsyncSessionLocal() as db:
        stmt = select(User).where(or_(User.telegram_id == str(req.id), User.google_id == google_id))
        result = await db.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            user = User(google_id=google_id, email=email, telegram_id=str(req.id))
            db.add(user)
            await db.commit()
            await db.refresh(user)
        elif not user.telegram_id:
            user.telegram_id = str(req.id)
            await db.commit()
            await db.refresh(user)
            
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "name": name,
                "picture": None
            },
            "token": f"tg_{req.id}"
        }

@router.post("/google")
async def google_login(req: GoogleLoginRequest):
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {req.access_token}"}
        )
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google token")
        
        user_info = res.json()
        
    google_id = user_info.get("sub")
    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")
    
    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Incomplete Google profile")

    async with AsyncSessionLocal() as db:
        # Check if user exists
        stmt = select(User).where(User.google_id == google_id)
        result = await db.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            user = User(google_id=google_id, email=email)
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
        return {
            "id": user.id,
            "email": user.email,
            "name": name,
            "picture": picture
        }

@router.post("/link-google")
async def link_google(
    req: GoogleLoginRequest, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {req.access_token}"}
        )
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google token")
        
        user_info = res.json()
        
    google_id = user_info.get("sub")
    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")
    
    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Incomplete Google profile")

    stmt = select(User).where(User.google_id == google_id)
    result = await db.execute(stmt)
    existing_google_user = result.scalars().first()
    
    if existing_google_user and existing_google_user.id != current_user.id:
        # Merge: Move data from current_user to existing_google_user
        await db.execute(update(Domain).where(Domain.owner_id == current_user.id).values(owner_id=existing_google_user.id))
        await db.execute(update(Transaction).where(Transaction.user_id == current_user.id).values(user_id=existing_google_user.id))
        
        existing_google_user.telegram_id = current_user.telegram_id
        
        # Delete old telegram-only user if needed, or just leave it. We delete it to avoid conflict.
        await db.delete(current_user)
        await db.commit()
        await db.refresh(existing_google_user)
        user_to_return = existing_google_user
    else:
        # No existing google user, update current
        current_user.google_id = google_id
        current_user.email = email
        db.add(current_user)
        await db.commit()
        await db.refresh(current_user)
        user_to_return = current_user
        
    return {
        "id": user_to_return.id,
        "email": user_to_return.email,
        "name": name,
        "picture": picture
    }

@router.get("/google-link-redirect")
async def google_link_redirect(token: str):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    base_url = os.getenv("BASE_URL").strip().rstrip("/")
    redirect_uri = f"{base_url}/api/auth/google-link-callback"
    state = token
    
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "email profile",
        "state": state,
        "prompt": "consent"
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=auth_url)

@router.get("/google-link-callback")
async def google_link_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    token = state
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    base_url = os.getenv("BASE_URL").strip().rstrip("/")
    redirect_uri = f"{base_url}/api/auth/google-link-callback"
    
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
        )
        if token_res.status_code != 200:
            return RedirectResponse(url="/profile?error=google_auth_failed")
            
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        
        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if user_res.status_code != 200:
            return RedirectResponse(url="/profile?error=google_user_failed")
            
        user_info = user_res.json()
        
    google_id = user_info.get("sub")
    email = user_info.get("email")
    
    if not google_id or not email:
        return RedirectResponse(url="/profile?error=incomplete_profile")
        
    if token.startswith("tg_"):
        tg_id = token.replace("tg_", "telegram_")
        stmt = select(User).where(User.google_id == tg_id)
        result = await db.execute(stmt)
        current_user = result.scalars().first()
    else:
        return RedirectResponse(url="/profile?error=unsupported_token")
        
    if not current_user:
        return RedirectResponse(url="/profile?error=user_not_found")
        
    stmt = select(User).where(User.google_id == google_id)
    result = await db.execute(stmt)
    existing_google_user = result.scalars().first()
    
    if existing_google_user and existing_google_user.id != current_user.id:
        await db.execute(update(Domain).where(Domain.owner_id == current_user.id).values(owner_id=existing_google_user.id))
        await db.execute(update(Transaction).where(Transaction.user_id == current_user.id).values(user_id=existing_google_user.id))
        existing_google_user.telegram_id = current_user.telegram_id
        await db.delete(current_user)
        await db.commit()
        final_user = existing_google_user
    else:
        current_user.google_id = google_id
        current_user.email = email
        await db.commit()
        final_user = current_user
        
    if token.startswith("tg_"):
        return RedirectResponse(url="https://t.me/TopDomenBot")
        
    html_content = f"""
    <html>
        <body>
            <script>
                const user = {{
                    id: {final_user.id},
                    email: "{final_user.email}",
                    name: "{user_info.get('name') or final_user.email}",
                    picture: "{user_info.get('picture') or ''}"
                }};
                localStorage.setItem('top3_user', JSON.stringify(user));
                window.location.href = "/profile";
            </script>
        </body>
    </html>
    """
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html_content)
