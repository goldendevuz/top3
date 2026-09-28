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
    categories = ["Ta'lim", "Onlayn-do'kon", "IT va Dasturlash", "Media", "Moliya", "Tibbiyot", "Xizmatlar", "Ko'ngilochar", "Sayohat", "Boshqa"]
    
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
    if re.search(r'\b(shop|bozor|do\'kon|savdo|buy|sotib)\b', text):
        return "Onlayn-do'kon"
    if re.search(r'\b(edu|maktab|ta\'lim|kurs|o\'qish|school)\b', text):
        return "Ta'lim"
    if re.search(r'\b(news|yangiliklar|xabarlar|media|blog)\b', text):
        return "Media"
    if re.search(r'\b(taksi|restoran|xizmat|service|xizmatlar)\b', text):
        return "Xizmatlar"
    if re.search(r'\b(game|o\'yin|sport)\b', text):
        return "Ko'ngilochar"
    return "Boshqa"
async def fetch_seo(domain: str, is_admin: bool = False):
    # Ensure URL starts with http:// or https://
    url = domain if domain.startswith("http") else f"https://{domain}"
    
    desc = "Ma'lumot topilmadi"
    is_redirected = False
    has_uz_redirect = False
    uz_variant = ""

    if is_admin and not domain.endswith(".uz"):
        host = domain.replace("https://", "").replace("http://", "").split("/")[0]
        base = host.rsplit(".", 1)[0]
        uz_variant = f"{base}.uz"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res_uz = await client.get(f"http://{uz_variant}", follow_redirects=True)
                final_url = str(res_uz.url)
                if host in final_url:
                    has_uz_redirect = True
        except Exception:
            pass

    success = False
    try:
<<<<<<< Updated upstream
        async with httpx.AsyncClient(timeout=3.0, headers=headers) as client:
            res = await client.get(url, follow_redirects=True)
            success = True
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
                async with httpx.AsyncClient(timeout=3.0, headers=headers) as client:
                    res = await client.get(url_http, follow_redirects=True)
                    success = True
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
            except Exception as e2:
                print(f"HTTP fallback error for {domain}: {e2}")
                
    if not success:
        from fastapi import HTTPException
=======
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(url, follow_redirects=True)
            res.raise_for_status()
            
            if len(res.history) > 0:
                is_redirected = True
                
            soup = BeautifulSoup(res.text, 'html.parser')
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc and meta_desc.get("content"):
                desc = meta_desc["content"].strip()
                if not desc:
                    desc = "Ma'lumot topilmadi"
            else:
                title = soup.find("title")
                if title and title.text:
                    desc = title.text.strip()
    except Exception:
>>>>>>> Stashed changes
        raise HTTPException(status_code=400, detail="Sayt mavjud emas yoki ishlamayapti")

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
    is_admin = False
    user_id = request.headers.get("x-user-id")
    if user_id:
        res = await db.execute(select(User).filter(User.id == int(user_id)))
        user = res.scalars().first()
        if user and user.email == "yunusovabdulmajid@gmail.com":
            is_admin = True
    return await fetch_seo(domain, is_admin)
