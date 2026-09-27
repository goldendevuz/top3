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
        {"dom": "kun.uz", "desc": "O'zbekistondagi eng faol yangiliklar sayti", "cat": "Yangiliklar va OAV (Media)"},
        {"dom": "daryo.uz", "desc": "So'nggi yangiliklar, maqolalar va intervyular", "cat": "Yangiliklar va OAV (Media)"},
        {"dom": "payme.uz", "desc": "To'lovlar tizimi va elektron hamyon", "cat": "Biznes, Moliya va Huquq"},
        {"dom": "uzum.uz", "desc": "Marketpleys va moliyaviy xizmatlar ekotizimi", "cat": "Onlayn do'konlar va Savdo"},
        {"dom": "olx.uz", "desc": "E'lonlar doskasi, oldi-sotdi", "cat": "Onlayn do'konlar va Savdo"},
        {"dom": "click.uz", "desc": "Elektron to'lovlar va pul o'tkazmalari", "cat": "Biznes, Moliya va Huquq"},
        {"dom": "asaxiy.uz", "desc": "Maishiy texnika va kitoblar do'koni", "cat": "Onlayn do'konlar va Savdo"},
        {"dom": "my.gov.uz", "desc": "Yagona interaktiv davlat xizmatlari portali", "cat": "Xizmat ko'rsatish va Agentliklar"},
        {"dom": "texnomart.uz", "desc": "Texnika va elektronika do'koni", "cat": "Onlayn do'konlar va Savdo"},
        {"dom": "macbro.uz", "desc": "Apple texnikalari savdosi", "cat": "Onlayn do'konlar va Savdo"},
        {"dom": "edu.uz", "desc": "Oliy ta'lim vazirligi sayti", "cat": "Ta'lim va O'quv markazlari"},
        {"dom": "islom.uz", "desc": "Islomiy ma'rifiy portal", "cat": "Ta'lim va O'quv markazlari"},
        {"dom": "zamin.uz", "desc": "Yangiliklar va ijtimoiy-siyosiy portal", "cat": "Yangiliklar va OAV (Media)"},
        {"dom": "makro.uz", "desc": "Supermarketlar tarmog'i", "cat": "Onlayn do'konlar va Savdo"},
        {"dom": "korzinka.uz", "desc": "Supermarketlar tarmog'i va aksiyalar", "cat": "Onlayn do'konlar va Savdo"},
        {"dom": "yandex.uz", "desc": "Qidiruv tizimi, taksi va xizmatlar", "cat": "Foydali vositalar (Tools)"},
        {"dom": "it-park.uz", "desc": "IT texnopark va startaplar markazi", "cat": "IT va Dasturlash"},
        {"dom": "najottalim.uz", "desc": "Zamonaviy kasblar va IT ta'lim", "cat": "Ta'lim va O'quv markazlari"},
        {"dom": "pdp.uz", "desc": "Dasturlash va IT ta'lim akademiyasi", "cat": "Ta'lim va O'quv markazlari"},
        {"dom": "express24.uz", "desc": "Oziq-ovqat va taomlar yetkazib berish", "cat": "Xizmat ko'rsatish va Agentliklar"},
        {"dom": "go.uz", "desc": "Qisqa havolalar va QR kodlar generatori", "cat": "Foydali vositalar (Tools)"},
        {"dom": "moxirdev.uz", "desc": "Dasturlash bo'yicha onlayn kurslar", "cat": "IT va Dasturlash"},
        {"dom": "obhavo.uz", "desc": "O'zbekiston hududlari bo'yicha ob-havo", "cat": "Foydali vositalar (Tools)"},
        {"dom": "spot.uz", "desc": "Biznes, moliya va iqtisodiy yangiliklar", "cat": "Biznes, Moliya va Huquq"},
        {"dom": "gazeta.uz", "desc": "Siyosiy va ijtimoiy yangiliklar", "cat": "Yangiliklar va OAV (Media)"},
        {"dom": "stat.uz", "desc": "Davlat statistika qo'mitasi portali", "cat": "Xizmat ko'rsatish va Agentliklar"},
        {"dom": "cbu.uz", "desc": "O'zbekiston Markaziy banki", "cat": "Biznes, Moliya va Huquq"},
        {"dom": "agrobank.uz", "desc": "Bank xizmatlari va kreditlar", "cat": "Biznes, Moliya va Huquq"},
        {"dom": "nbu.uz", "desc": "Milliy bank xizmatlari", "cat": "Biznes, Moliya va Huquq"},
        {"dom": "uzauto.uz", "desc": "Avtomobillar savdosi va ishlab chiqarish", "cat": "Onlayn do'konlar va Savdo"}
    ]
    
    now = datetime.now(timezone.utc)
    
    for idx, site in enumerate(demo_sites):
        rand = random.random()
        is_sponsored = False
        board_type = BoardType.umumiy
        price = 0
        clicks = random.randint(10, 500)
        
        if rand < 0.2:
            is_sponsored = True
            price = random.randint(20, 100) * 1000
        elif rand < 0.5:
            price = random.randint(5, 50) * 1000
        elif rand < 0.7:
            board_type = BoardType.ochiq
        
        d = Domain(
            name=site["dom"],
            description=site["desc"],
            category=site["cat"],
            is_admin_added=True,
            is_active=True,
            status="active",
            is_demo=True,
            click_count=clicks,
            current_price=price,
            is_sponsored=is_sponsored,
            board_type=board_type,
            created_at=now,
            owner_id=current_user.id
        )
        db.add(d)
        
    await db.commit()
    return {"status": "ok", "message": f"{len(demo_sites)} ta demo saytlar qo'shildi!"}

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
