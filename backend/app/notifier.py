import os
import httpx
from datetime import datetime, timezone, timedelta
from sqlalchemy.future import select
from sqlalchemy import func
from app.models import User, Domain, DomainClick
from app.database import AsyncSessionLocal

async def send_telegram(text: str):
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("ADMIN_TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, timeout=5.0)
    except Exception as e:
        print("Telegram send error:", e)

async def get_system_stats():
    async with AsyncSessionLocal() as db:
        users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
        total_domains = (await db.execute(select(func.count(Domain.id)).filter(Domain.is_deleted == False))).scalar() or 0
        real_domains = (await db.execute(select(func.count(Domain.id)).filter(Domain.is_deleted == False, Domain.is_demo == False))).scalar() or 0
        demo_domains = total_domains - real_domains
        sponsor_domains = (await db.execute(select(func.count(Domain.id)).filter(Domain.is_deleted == False, Domain.is_sponsored == True))).scalar() or 0
        paid_domains = (await db.execute(select(func.count(Domain.id)).filter(Domain.is_deleted == False, Domain.current_price > 0, Domain.is_sponsored == False))).scalar() or 0
        free_domains = (await db.execute(select(func.count(Domain.id)).filter(Domain.is_deleted == False, (Domain.current_price == 0) | (Domain.current_price == None), Domain.is_sponsored == False))).scalar() or 0
        total_clicks = (await db.execute(select(func.sum(Domain.click_count)).filter(Domain.is_deleted == False))).scalar() or 0
        top_price_res = await db.execute(select(func.max(Domain.current_price)).filter(Domain.is_deleted == False, Domain.is_sponsored == False))
        top_price = top_price_res.scalar() or 0

        return {
            "users_count": users_count,
            "total_domains": total_domains,
            "real_domains": real_domains,
            "demo_domains": demo_domains,
            "sponsor_domains": sponsor_domains,
            "paid_domains": paid_domains,
            "free_domains": free_domains,
            "total_clicks": total_clicks,
            "top_price": top_price
        }

async def notify_new_user_registration(email: str, ip_address: str = "Aniqlanmagan", user_agent: str = "—"):
    stats = await get_system_stats()
    
    # Tashkent timezone UTC+5
    tashkent_time = datetime.now(timezone(timedelta(hours=5))).strftime("%Y-%m-%d %H:%M:%S")
    
    # Device type
    ua_display = "📱 Mobile" if "Mobile" in (user_agent or "") else ("💻 Desktop" if any(k in (user_agent or "") for k in ["Windows", "Macintosh", "Linux"]) else "🌐 Noma'lum")

    text = f"""🔥 <b>YANGI RO'YXATDAN O'TISH</b> 🔥
━━━━━━━━━━━━━━━━━━━━━
👤 <b>Foydalanuvchi ma'lumotlari:</b>
   • <b>Email:</b> <code>{email}</code>
   • <b>IP:</b> <code>{ip_address}</code>
   • <b>Qurilma:</b> {ua_display}
   • <b>Vaqt:</b> {tashkent_time}

📊 <b>PLATFORMA STATISTIKASI:</b>
━━━━━━━━━━━━━━━━━━━━━
👥 <b>Jami akkauntlar (DB):</b> {stats['users_count']} ta
🌐 <b>Jami domenlar:</b> {stats['total_domains']} ta
   ├ 🟢 <b>Bepul tarif:</b> {stats['free_domains']} ta
   ├ 🔵 <b>Pullik (Top):</b> {stats['paid_domains']} ta
   └ ⭐ <b>Sponsor:</b> {stats['sponsor_domains']} ta

⚡ <b>Faollik va o'tishlar:</b>
   • <b>Jami unikal o'tishlar:</b> {stats['total_clicks']} ta
   • <b>Eng yuqori stavka:</b> {stats['top_price']:,} so'm
━━━━━━━━━━━━━━━━━━━━━
🚀 <i>Top3 Monitoring Bot</i>"""

    await send_telegram(text)

async def notify_overall_stats():
    stats = await get_system_stats()
    tashkent_time = datetime.now(timezone(timedelta(hours=5))).strftime("%Y-%m-%d %H:%M:%S")

    text = f"""📊 <b>TOP3.UZ | UMUMIY TIZIM STATISTIKASI</b> 📊
━━━━━━━━━━━━━━━━━━━━━
👥 <b>Jami foydalanuvchilar (DB):</b> {stats['users_count']} ta
🌐 <b>Jami domenlar:</b> {stats['total_domains']} ta
   ├ 🟢 <b>Bepul tarif:</b> {stats['free_domains']} ta
   ├ 🔵 <b>Pullik tarif:</b> {stats['paid_domains']} ta
   └ ⭐ <b>Sponsor:</b> {stats['sponsor_domains']} ta

⚡ <b>Faollik va o'tishlar:</b>
   • <b>Jami unikal o'tishlar:</b> {stats['total_clicks']} ta
   • <b>Eng yuqori narx:</b> {stats['top_price']:,} so'm
   • <b>Sana va vaqt:</b> {tashkent_time}
━━━━━━━━━━━━━━━━━━━━━
🚀 <i>Top3 Admin Dashboard</i>"""

    await send_telegram(text)
