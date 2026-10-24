import os
import secrets
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from app.database import engine, Base
from contextlib import asynccontextmanager
from app.routers import domains, payments, seo, auth, bot, analytics

from app.database import AsyncSessionLocal
from sqlalchemy.future import select
from app.models import Domain, BoardType, DomainClick, User
from app.dependencies import get_current_user
import asyncio
from datetime import datetime, timezone
from sqlalchemy import text, delete
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

async def cleanup_expired_domains():
    while True:
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)
                res = await db.execute(select(Domain).filter(Domain.is_active == True))
                domains = res.scalars().all()
                for d in domains:
                    needs_update = False
                    if d.is_sponsored:
                        if d.sponsored_until and d.sponsored_until < now:
                            d.is_sponsored = False
                            d.board_type = BoardType.ochiq
                            d.current_price = 0
                            d.click_count = 0  # reset clicks to put it at the bottom
                            d.created_at = now # also reset creation date
                            needs_update = True
                    elif d.board_type == BoardType.bugun:
                        if (now - d.updated_at).total_seconds() > 24*3600:
                            d.board_type = BoardType.ochiq
                            d.current_price = 0
                            d.click_count = 0
                            d.created_at = now
                            needs_update = True
                    
                    if needs_update:
                        db.add(d)
                
                await db.commit()
        except Exception as e:
            print(f"Error in cleanup background task: {e}")
        
        await asyncio.sleep(3600)  # run every hour

import httpx

async def send_startup_notification():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token or token == "your_bot_token_here":
        return
    chat_id = os.getenv("ADMIN_TELEGRAM_CHAT_ID")
    if not chat_id:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json={
                "chat_id": chat_id,
                "text": "🚀 Top3 loyihasi qayta ishga tushdi (Rebuild/Restart muvaffaqiyatli)!"
            })
    except Exception as e:
        print(f"Telegram startup error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup for simplicity in development
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE domains ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';"))
            await conn.execute(text("UPDATE domains SET status = 'active' WHERE is_active = true AND status = 'pending';"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(255);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_token VARCHAR(255);"))
            try:
                await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_auth_token ON users (auth_token);"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE domains ADD COLUMN is_demo BOOLEAN DEFAULT 0;"))
            except Exception:
                pass # column might already exist
        except Exception as e:
            print(f"Error altering table: {e}")
    
    # Start background task
    task = asyncio.create_task(cleanup_expired_domains())
    
    # Send startup notification
    await send_startup_notification()
    
    # Set Telegram Webhook
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    base_url = os.getenv("BASE_URL")
    if token and token != "your_bot_token_here" and base_url:
        webhook_url = f"{base_url.rstrip('/')}/api/webhook/telegram"
        try:
            async with httpx.AsyncClient() as client:
                await client.post(f"https://api.telegram.org/bot{token}/setWebhook", json={"url": webhook_url})
        except Exception as e:
            print(f"Error setting webhook: {e}")
    
    yield
    
    task.cancel()

app = FastAPI(title="Top3 API", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

security = HTTPBasic()

def get_current_username(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, os.getenv("DOCS_USER", "admin"))
    correct_password = secrets.compare_digest(credentials.password, os.getenv("DOCS_PASSWORD", "secret"))
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect user or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@app.get("/docs", include_in_schema=False)
async def get_swagger_documentation(username: str = Depends(get_current_username)):
    return get_swagger_ui_html(openapi_url="/openapi.json", title="docs")

@app.get("/redoc", include_in_schema=False)
async def get_redoc_documentation(username: str = Depends(get_current_username)):
    return get_redoc_html(openapi_url="/openapi.json", title="docs")

@app.get("/openapi.json", include_in_schema=False)
async def openapi(username: str = Depends(get_current_username)):
    return get_openapi(title=app.title, version=app.version, routes=app.routes)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8000",
        "http://188.245.70.100",
        "http://188.245.70.100:5173",
        "http://188.245.70.100:8000",
        "https://piglet-factual-mentally.ngrok-free.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(domains.router)
app.include_router(payments.router)
app.include_router(seo.router)
app.include_router(auth.router)
app.include_router(bot.router)
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])

@app.get("/")
async def root():
    return {"message": "Welcome to Top3 API"}

@app.post("/api/admin/reset-clicks")
async def reset_clicks(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.email != "yunusovabdulmajid@gmail.com":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.execute(delete(DomainClick))
    await db.execute(text("UPDATE domains SET click_count = 0"))
    await db.commit()
    
    return {"status": "ok", "message": "All clicks have been reset."}

import random

@app.post("/api/admin/seed-demo")
async def seed_demo(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.email != "yunusovabdulmajid@gmail.com":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    demo_sites = [
        # (domain, description, category, click_count, price_x1000, is_sponsored)
        # Total clicks = 8356
        ("kun.uz",       "O'zbekistondagi eng faol yangiliklar sayti",       "Yangiliklar va OAV (Media)",         820, 85, True),
        ("daryo.uz",     "So'nggi yangiliklar, maqolalar va intervyular",    "Yangiliklar va OAV (Media)",         610, 60, True),
        ("payme.uz",     "To'lovlar tizimi va elektron hamyon",               "Biznes, Moliya va Huquq",            540, 75, True),
        ("uzum.uz",      "Marketpleys va moliyaviy xizmatlar ekotizimi",     "Onlayn do'konlar va Savdo",          490, 70, True),
        ("olx.uz",       "E'lonlar doskasi, oldi-sotdi",                      "Onlayn do'konlar va Savdo",          430,  0, False),
        ("click.uz",     "Elektron to'lovlar va pul o'tkazmalari",            "Biznes, Moliya va Huquq",            400,  0, False),
        ("asaxiy.uz",    "Maishiy texnika va kitoblar do'koni",               "Onlayn do'konlar va Savdo",          370, 35, False),
        ("my.gov.uz",    "Yagona interaktiv davlat xizmatlari portali",      "Xizmat ko'rsatish va Agentliklar",   345,  0, False),
        ("texnomart.uz", "Texnika va elektronika do'koni",                    "Onlayn do'konlar va Savdo",          310,  0, False),
        ("macbro.uz",    "Apple texnikalari savdosi",                         "Onlayn do'konlar va Savdo",          285,  0, False),
        ("edu.uz",       "Oliy ta'lim vazirligi sayti",                       "Ta'lim va O'quv markazlari",         275,  0, False),
        ("islom.uz",     "Islomiy ma'rifiy portal",                           "Ta'lim va O'quv markazlari",         250,  0, False),
        ("zamin.uz",     "Yangiliklar va ijtimoiy-siyosiy portal",            "Yangiliklar va OAV (Media)",         240,  0, False),
        ("makro.uz",     "Supermarketlar tarmog'i",                           "Onlayn do'konlar va Savdo",          230,  0, False),
        ("korzinka.uz",  "Supermarketlar tarmog'i va aksiyalar",              "Onlayn do'konlar va Savdo",          220,  0, False),
        ("yandex.uz",    "Qidiruv tizimi, taksi va xizmatlar",               "Foydali vositalar (Tools)",          215,  0, False),
        ("it-park.uz",   "IT texnopark va startaplar markazi",                "IT va Dasturlash",                   200,  0, False),
        ("najottalim.uz","Zamonaviy kasblar va IT ta'lim",                    "Ta'lim va O'quv markazlari",         190,  0, False),
        ("pdp.uz",       "Dasturlash va IT ta'lim akademiyasi",               "IT va Dasturlash",                   185,  0, False),
        ("express24.uz", "Oziq-ovqat va taomlar yetkazib berish",             "Xizmat ko'rsatish va Agentliklar",   175,  0, False),
        ("go.uz",        "Qisqa havolalar va QR kodlar generatori",           "Foydali vositalar (Tools)",          160,  0, False),
        ("moxirdev.uz",  "Dasturlash bo'yicha onlayn kurslar",               "IT va Dasturlash",                   150,  0, False),
        ("obhavo.uz",    "O'zbekiston hududlari bo'yicha ob-havo",            "Foydali vositalar (Tools)",          145,  0, False),
        ("spot.uz",      "Biznes, moliya va iqtisodiy yangiliklar",           "Biznes, Moliya va Huquq",            140,  0, False),
        ("gazeta.uz",    "Siyosiy va ijtimoiy yangiliklar",                   "Yangiliklar va OAV (Media)",         135,  0, False),
        ("stat.uz",      "Davlat statistika qo'mitasi portali",               "Xizmat ko'rsatish va Agentliklar",   120,  0, False),
        ("cbu.uz",       "O'zbekiston Markaziy banki",                        "Biznes, Moliya va Huquq",            115,  0, False),
        ("agrobank.uz",  "Bank xizmatlari va kreditlar",                      "Biznes, Moliya va Huquq",            110,  0, False),
        ("nbu.uz",       "Milliy bank xizmatlari",                            "Biznes, Moliya va Huquq",            105,  0, False),
        ("uzauto.uz",    "Avtomobillar savdosi va ishlab chiqarish",          "Onlayn do'konlar va Savdo",           98,  0, False),
    ]
    # Sanity check: sum = 8356
    now = datetime.now(timezone.utc)

    for dom, desc, cat, clicks, price_k, is_sponsored in demo_sites:
        board_type = BoardType.umumiy
        d = Domain(
            name=dom,
            description=desc,
            category=cat,
            is_admin_added=True,
            is_active=True,
            status="active",
            is_demo=True,
            click_count=clicks,
            current_price=price_k * 1000 if price_k else 0,
            is_sponsored=is_sponsored,
            board_type=board_type,
            created_at=now,
            owner_id=current_user.id,
        )
        db.add(d)

    await db.commit()
    return {"status": "ok", "message": f"{len(demo_sites)} ta demo saytlar qo'shildi! (jami {sum(s[3] for s in demo_sites)} click)"}

@app.post("/api/admin/toggle-demo")
async def toggle_demo(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.email != "yunusovabdulmajid@gmail.com":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    res = await db.execute(select(Domain).filter(Domain.is_demo == True))
    demo_domains = res.scalars().all()
    
    if not demo_domains:
        return {"status": "error", "message": "Demo saytlar topilmadi. Avval seed qiling."}
        
    new_status = not demo_domains[0].is_deleted
    
    for d in demo_domains:
        d.is_deleted = new_status
        d.is_active = not new_status
        
    await db.commit()
    state = "O'chirilgan (yashiringan)" if new_status else "Yoqilgan (ko'rsatilgan)"
    return {"status": "ok", "message": f"Demo saytlar holati: {state}."}

@app.get("/api/admin/users")
async def get_admin_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.email and current_user.email.lower() == "yunusovabdulmajid@gmail.com"
    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    res = await db.execute(select(User).order_by(User.id))
    users = res.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "telegram_id": u.telegram_id,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else None
        }
        for u in users
    ]
