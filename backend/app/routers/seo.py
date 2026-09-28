from fastapi import APIRouter, Request, Depends, HTTPException
import httpx
from bs4 import BeautifulSoup
import re
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User
import google.generativeai as genai

router = APIRouter(prefix="/api/seo", tags=["seo"])

gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)

def determine_category(text: str) -> str:
    categories = [
        "Onlayn do'konlar va Savdo",
        "Ta'lim va O'quv markazlari",
        "Biznes, Moliya va Huquq",
        "IT va Dasturlash",
        "Yangiliklar va OAV (Media)",
        "Tibbiyot va Salomatlik",
        "Ko'chmas mulk va Qurilish",
        "Sayohat va Turizm",
        "Xizmat ko'rsatish va Agentliklar",
        "Marketing va Reklama",
        "Ish, Karyera va Vakansiyalar",
        "Ijtimoiy tarmoqlar va Bloging",
        "Dizayn va Kreativ",
        "O'yinlar va Ko'ngilochar",
        "Neyrotarmoqlar va AI",
        "Foydali vositalar (Tools)",
        "Boshqa"
    ]
    
    if gemini_api_key:
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"Senga saytning sarlavhasi va tavsifi beriladi. Sening vazifang ushbu saytni quyidagi qat'iy toifalardan biriga ajratish: {', '.join(categories)}. Javobingda faqatgina eng mos kelgan toifa nomini yoz, hech qanday qo'shimcha so'z yoki belgi ishlatma.\n\nSayt ma'lumoti: {text}"
            
            response = model.generate_content(prompt)
            cat = response.text.strip()
            
            # Simple fallback check
            for c in categories:
                if c.lower() == cat.lower():
                    return c
                    
            for c in categories:
                if c.lower() in cat.lower():
                    return c
        except Exception as e:
            print(f"Gemini API error: {e}")

    # Fallback
    text = text.lower()
    if re.search(r'\b(shop|bozor|do\'kon|savdo|buy|sotib|market|magazin|internet-magazin|sotish)\b', text):
        return "Onlayn do'konlar va Savdo"
    if re.search(r'\b(edu|maktab|ta\'lim|kurs|o\'qish|school)\b', text):
        return "Ta'lim va O'quv markazlari"
    if re.search(r'\b(biznes|moliya|huquq|bank|finance|law|to\'lov|tolov|pay|kredit|invest|sug\'urta)\b', text):
        return "Biznes, Moliya va Huquq"
    if re.search(r'\b(it|dasturlash|code|software|tech|developer|sun\'iy intellekt|ai|kompyuter|aloqa|telekom|sip|raqam|texnologiya|avtomatizatsiya|internet|provayder)\b', text):
        return "IT va Dasturlash"
    if re.search(r'\b(news|yangiliklar|xabarlar|media)\b', text):
        return "Yangiliklar va OAV (Media)"
    if re.search(r'\b(tibbiyot|salomatlik|shifo|med|doctor|health)\b', text):
        return "Tibbiyot va Salomatlik"
    if re.search(r'\b(uy|ko\'chmas|mulk|qurilish|build|real estate|house)\b', text):
        return "Ko'chmas mulk va Qurilish"
    if re.search(r'\b(taksi|restoran|xizmat|service|xizmatlar|agency)\b', text):
        return "Xizmat ko'rsatish va Agentliklar"
    if re.search(r'\b(sayohat|turizm|travel|tour)\b', text):
        return "Sayohat va Turizm"
    if re.search(r'\b(marketing|reklama|ad|pr)\b', text):
        return "Marketing va Reklama"
    if re.search(r'\b(ish|vakansiya|karyera|job|work)\b', text):
        return "Ish, Karyera va Vakansiyalar"
    if re.search(r'\b(ijtimoiy|blog|social)\b', text):
        return "Ijtimoiy tarmoqlar va Bloging"
    if re.search(r'\b(dizayn|kreativ|design|art)\b', text):
        return "Dizayn va Kreativ"
    if re.search(r'\b(game|o\'yin|sport|ko\'ngilochar|fun)\b', text):
        return "O'yinlar va Ko'ngilochar"
    if re.search(r'\b(ai|neyrotarmoq|bot|artificial intelligence)\b', text):
        return "Neyrotarmoqlar va AI"
    if re.search(r'\b(tool|vosita|utility)\b', text):
        return "Foydali vositalar (Tools)"
    return "Boshqa"
async def fetch_seo(domain: str, is_admin: bool = False):
    # Ensure URL starts with http:// or https://
    url = domain if domain.startswith("http") else f"https://{domain}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    desc = "Ma'lumot topilmadi"
    is_redirected = False
    has_uz_redirect = False
    uz_variant = ""

    if is_admin and not domain.endswith(".uz"):
        host = domain.replace("https://", "").replace("http://", "").split("/")[0]
        base = host.rsplit(".", 1)[0]
        uz_variant = f"{base}.uz"
        try:
            async with httpx.AsyncClient(timeout=4.0, headers=headers) as client:
                res_uz = await client.get(f"http://{uz_variant}", follow_redirects=True)
                final_url = str(res_uz.url)
                if host in final_url:
                    has_uz_redirect = True
        except Exception:
            pass

    try:
        async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
            res = await client.get(url, follow_redirects=True)
            if len(res.history) > 0:
                is_redirected = True
                
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                meta_desc = soup.find("meta", attrs={"name": "description"})
                if meta_desc and meta_desc.get("content"):
                    desc = meta_desc["content"].strip()
                    if not desc:
                        desc = "Ma'lumot topilmadi"
                else:
                    # Fallback to title
                    title = soup.find("title")
                    if title and title.text:
                        desc = title.text.strip()
    except Exception as e:
        print(f"Error fetching SEO for {domain}: {e}")
        # Try http if https fails
        if url.startswith("https://"):
            try:
                url_http = url.replace("https://", "http://")
                async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
                    res = await client.get(url_http, follow_redirects=True)
                    if len(res.history) > 0:
                        is_redirected = True
                    if res.status_code == 200:
                        soup = BeautifulSoup(res.text, 'html.parser')
                        meta_desc = soup.find("meta", attrs={"name": "description"})
                        if meta_desc and meta_desc.get("content"):
                            desc = meta_desc["content"].strip()
                        else:
                            title = soup.find("title")
                            if title and title.text:
                                desc = title.text.strip()
            except Exception:
                pass

    cat_text = domain + " " + desc
    cat = determine_category(cat_text)
    
    return {
        "domain": domain,
        "description": desc,
        "category": cat,
        "is_redirected": is_redirected,
        "has_uz_redirect": has_uz_redirect,
        "uz_variant": uz_variant
    }

@router.get("/fetch")
async def fetch_seo_api(domain: str, request: Request, db: AsyncSession = Depends(get_db)):
    domain_clean = domain.strip()
    if not domain_clean or " " in domain_clean or "." not in domain_clean:
        raise HTTPException(status_code=400, detail="Noto'g'ri havola")
        
    is_admin = False
    user_id = request.headers.get("x-user-id")
    if user_id:
        res = await db.execute(select(User).filter(User.id == int(user_id)))
        user = res.scalars().first()
        if user and user.email == "yunusovabdulmajid@gmail.com":
            is_admin = True
    return await fetch_seo(domain, is_admin)
