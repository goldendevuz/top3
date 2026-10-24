import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useBoardStore } from '../store/useBoardStore';
import { getDomainLogoUrl } from '../utils';

const backendUrl = import.meta.env.VITE_API_URL || '';

const LINK_RE = /^(https?:\/\/)?([a-z0-9-]+)(\.[a-z0-9-]+)+([/?#].*)?$/i;
const SUBDOMAIN_RE = /^[a-z0-9-.]+$/i;

const formatNum = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const cleanDomainName = (val: string) => {
  let cleaned = val.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.split(/[/?#]/)[0];
  cleaned = cleaned.split('.')[0];
  // Remove any character that is NOT a-z, 0-9, or hyphen
  cleaned = cleaned.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  return cleaned;
};

const hashCode = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const faviconStyle = (dom: string) => {
  const h = hashCode(dom);
  const h1 = h % 360, h2 = (h1 + 46) % 360;
  return { background: `linear-gradient(135deg, hsl(${h1} 70% 46%), hsl(${h2} 70% 36%))` };
};
const initials = (dom: string) => dom.slice(0, 2).toUpperCase();


export const AddDomain = () => {
  const navigate = useNavigate();
  const fetchDomains = useBoardStore(state => state.fetchDomains);
  const [domain, setDomain] = useState('');
  
  const [cat, setCat] = useState('—');
  const [desc, setDesc] = useState('—');
  const [fetching, setFetching] = useState(false);
  const [domainOk, setDomainOk] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isRedirected, setIsRedirected] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [uzRedirectData, setUzRedirectData] = useState<{has: boolean, variant: string}>({has: false, variant: ''});
  
  const [plan, setPlan] = useState<'bepul'|'umumiy'|'bugun'|'sponsor'>('bepul');
  const [paidPrice, setPaidPrice] = useState(1000);
  const holdTimer   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [customBanner, setCustomBanner] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerFileError, setBannerFileError] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customCta, setCustomCta] = useState('');

  const { domains } = useBoardStore();

  useEffect(() => {
    if (plan === 'umumiy' || plan === 'bugun') {
      const paid = domains.filter(d => d.type === plan && d.isPaid && !d.is_sponsored);
      const topPrice = paid.length > 0 ? Math.max(...paid.map(d => d.price || 0)) : 0;
      const targetPrice = topPrice > 0 ? topPrice + 1000 : 1000;
      setPaidPrice(targetPrice);
    }
  }, [plan, domains]);

  // Given a price, compute what rank it achieves on the given board
  const calcRank = (boardType: 'umumiy' | 'bugun', price: number): number => {
    const paid = domains
      .filter(d => d.type === boardType && d.isPaid && !d.is_sponsored)
      .map(d => d.price || 0)
      .sort((a, b) => b - a);
    let rank = 1;
    for (const p of paid) {
      if (price >= p) break;
      rank++;
    }
    return rank;
  };

  const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const STEP = 1000;


  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post(`${backendUrl}/api/auth/google`, {
          access_token: tokenResponse.access_token
        });
        const userData = res.data.user || res.data;
        const authToken = res.data.token || '';
        if (authToken) localStorage.setItem('token', authToken);
        localStorage.setItem('top3_user', JSON.stringify(userData));
        window.location.replace(window.location.pathname);
      } catch (err) {
        console.error('Google login error:', err);
      }
    }
  });

  useEffect(() => {
    const userStr = localStorage.getItem('top3_user');
    if (userStr) {
      const pendingStr = localStorage.getItem('pending_domain_data_free');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          setDomain(pending.domain);
          localStorage.removeItem('pending_domain_data_free');
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    setIsRedirected(false);
    setRedirectUrl('');
    setUzRedirectData({has: false, variant: ''});
  }, [domain]);

  useEffect(() => {
    if (!domain) {
      setDomainOk(false);
      setApiError(false);
      setSubmitError('');
      setCat('—');
      setDesc('—');
      return;
    }
    setSubmitError('');
    const check = setTimeout(async () => {
      setFetching(true);
      setApiError(false);
      const isFormatOk = SUBDOMAIN_RE.test(domain);
      setDomainOk(isFormatOk);
      
      if (isFormatOk) {
        try {
          const target = domain + '.uz';
          const userStr = localStorage.getItem('top3_user');
          const headers: Record<string, string> = {};
          if (userStr) {
            try {
              const u = JSON.parse(userStr);
              const uid = u?.id ?? u?.user?.id;
              if (uid) headers['x-user-id'] = String(uid);
            } catch (e) {}
          }
          const token = localStorage.getItem('token');
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(`${backendUrl}/api/seo/fetch?domain=${target}`, { headers });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || "Sayt mavjud emas yoki ishlamayapti");
          }
          const data = await res.json();
          setCat(data.category || 'Boshqa');
          setDesc((data.description === "Ma'lumot topilmadi" || !data.description) ? "Sayt tavsifi kiritilmagan" : data.description);
          setUzRedirectData({
            has: data.has_uz_redirect || false,
            variant: data.uz_variant || ''
          });
          if (data.is_redirected) {
            setIsRedirected(true);
            setRedirectUrl(data.redirect_url || '');
          } else {
            setIsRedirected(false);
            setRedirectUrl('');
          }
          setDomainOk(true);
        } catch (err: any) {
          console.error(err);
          setApiError(true);
          setSubmitError(err.message || "Sayt mavjud emas yoki ishlamayapti");
          setCat('—');
          setDesc('—');
        }
      } else {
        setCat('—');
        setDesc('—');
      }
      setFetching(false);
    }, 700);

    return () => clearTimeout(check);
  }, [domain]);

  useEffect(() => {
    if (domain.includes('.') && plan !== 'sponsor') {
      setPlan('sponsor');
      setSubmitError("Subdomen kiritilgani uchun Sponsor tarifiga o'tkazildi.");
    }
  }, [domain, plan]);

  const isFormatValid = !domain || SUBDOMAIN_RE.test(domain);
  const isDescMissing = !fetching && isFormatValid && desc === "Ma'lumot topilmadi";
  const redirectBlocksFree = isRedirected && plan === 'bepul';
  const valid = isFormatValid && !apiError && !isDescMissing && !redirectBlocksFree;
  
  let warning = '';
  if (redirectBlocksFree) {
    warning = "Bu domen boshqa manzilga yo'naltirilmoqda. Bepul ro'yxatga faqat to'g'ridan-to'g'ri ochiladigan saytlarni qo'shish mumkin.";
  } else if (domain && !fetching && !isFormatValid) {
    warning = "Faqat lotin harflari va raqamlar qabul qilinadi.";
  }

  // Errors are now displayed inline, no toast popups
  useEffect(() => {
    if (apiError || submitError) {
      const timer = setTimeout(() => {
        setApiError(false);
        setSubmitError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [apiError, submitError]);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;

    let cleanDom = domain.trim().toLowerCase();

    // In sponsor tab, if domain is empty but customUrl is provided, extract hostname
    if (plan === 'sponsor' && !cleanDom && customUrl.trim()) {
      try {
        const u = new URL(customUrl.startsWith('http') ? customUrl : `https://${customUrl}`);
        cleanDom = u.hostname.replace(/^www\./i, '').replace(/\.uz$/i, '');
      } catch {
        cleanDom = customUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\.uz$/i, '').split('/')[0];
      }
    }

    if (!cleanDom) {
      toast.error("Iltimos, domen nomini kiriting!", { id: 'missing-domain' });
      return;
    }

    const isValid = /^[a-zA-Z0-9-.]+$/.test(cleanDom); 
    if (!isValid) {
      toast.error("Iltimos, to'g'ri domen nomini kiriting (faqat lotin harflari va raqamlar)!", { id: 'invalid-domain' });
      return; 
    }

    if (redirectBlocksFree) {
      toast.error("Bu domen boshqa manzilga yo'naltirilmoqda. Iltimos, pullik yoki Sponsor tarifini tanlang!", { id: 'redirect-free' });
      return;
    }

    const userStr = localStorage.getItem('top3_user');
    let user: any = null;
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        user = parsed?.user || parsed;
      } catch (e) {}
    }

    if (!user || (!user.id && !user.email)) {
      toast("Sayt qo'shish uchun avval Google orqali kiring", { icon: '🔐', id: 'auth-login' });
      localStorage.setItem('pending_domain_data_free', JSON.stringify({ domain: cleanDom }));
      login();
      return;
    }

    const userId = user?.id ?? user?.user?.id;
    const token = localStorage.getItem('token') || user?.token;

    setLoading(true);
    try {
      let finalPrice = 0;
      let finalBoardType = 'ochiq';
      let finalIsSponsored = false;
      if (plan === 'umumiy') {
        finalPrice = paidPrice;
        finalBoardType = 'umumiy';
      } else if (plan === 'bugun') {
        finalPrice = paidPrice;
        finalBoardType = 'bugun';
      } else if (plan === 'sponsor') {
        finalPrice = 5000;
        finalBoardType = 'umumiy';
        finalIsSponsored = true;
      }

      let finalBanner = customBanner || undefined;
      if (bannerFile) {
        try {
          finalBanner = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(bannerFile);
          });
        } catch (e) {
          console.error("Banner conversion error", e);
        }
      }

      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (userId) reqHeaders['X-User-Id'] = String(userId);
      if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/domains/`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          name: cleanDom.endsWith('.uz') ? cleanDom : cleanDom + '.uz',
          board_type: finalBoardType,
          price: finalPrice,
          description: desc !== '—' ? desc : undefined,
          category: cat !== '—' ? cat : undefined,
          user_id: userId || undefined,
          is_sponsored: finalIsSponsored,
          ...(plan === 'sponsor' ? {
            custom_banner: finalBanner,
            custom_url: customUrl || (`https://${cleanDom}.uz`),
            custom_cta: customCta || undefined
          } : {})
        })
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('top3_user');
          localStorage.removeItem('token');
          throw new Error("Sessiya muddati tugagan. Sahifani yangilab, qayta kiring.");
        }
        const errorData = await res.json().catch(() => ({}));
        if (errorData.detail) {
          throw new Error(errorData.detail);
        }
        throw new Error('Domen qo\'shishda xatolik yuz berdi');
      }
      
      const data = await res.json();
      const targetDomain = data.name || (cleanDom.endsWith('.uz') ? cleanDom : cleanDom + '.uz');
      
      if (finalPrice > 0) {
        const payHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (userId) payHeaders['X-User-Id'] = String(userId);
        if (token) payHeaders['Authorization'] = `Bearer ${token}`;

        const payRes = await fetch(`${backendUrl}/api/payments/init`, {
          method: 'POST',
          headers: payHeaders,
          body: JSON.stringify({
            domain_id: data.id,
            amount: finalPrice,
            user_id: userId
          })
        });
        const payData = await payRes.json().catch(() => ({}));
        if (!payRes.ok) throw new Error(payData.detail || payData.message || "To'lovni shakllantirishda xatolik");
        if (!payData.pay_url) throw new Error("inPAY payment URL was not returned");
        window.location.href = payData.pay_url;
      } else {
        toast.success("Domen muvaffaqiyatli qo'shildi!");
        try {
          await fetchDomains();
        } catch (e) {
          console.error("Failed to refetch domains:", e);
        }
        setTimeout(() => {
          window.location.href = `/site/${targetDomain}`;
        }, 400);
      }
      
    } catch(err: any) {
      console.error(err);
      toast.error(err.message || "Xatolik yuz berdi. Domen band bo'lishi mumkin.", { id: 'submit-err' });
      setSubmitError(err.message || "Xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip all whitespace silently (mobile keyboard auto-adds spaces)
    let sanitized = e.target.value.replace(/\s+/g, '').toLowerCase();
    
    // Auto-parse full URLs
    if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
      try {
        const url = new URL(sanitized);
        sanitized = url.hostname;
      } catch (err) {
        sanitized = sanitized.replace(/^https?:\/\//, '');
      }
    }
    
    // Strip www. prefix
    if (sanitized.startsWith('www.')) {
      sanitized = sanitized.slice(4);
    }
    
    // Strip trailing slash
    sanitized = sanitized.replace(/\/+$/, '');
    
    // Strip .uz suffix since the UI already appends it
    if (sanitized.endsWith('.uz')) {
      sanitized = sanitized.slice(0, -3);
    }

    // Only block truly invalid characters (not spaces — already stripped)
    if (sanitized && !/^[a-zA-Z0-9-.]*$/.test(sanitized)) {
      toast.error("Faqat lotin harflari va raqamlar qabul qilinadi.", { id: 'domain-invalid', duration: 2000 });
      return;
    }
    setDomain(sanitized);
  };

  const handlePlanChange = (newPlan: 'bepul'|'umumiy'|'bugun'|'sponsor') => {
    if (newPlan !== 'sponsor' && domain.includes('.')) {
      const ok = window.confirm("Boshqa tariflarda subdomen kiritish taqiqlanadi. Davom etish uchun kiritilgan domen o'chiriladi. Rozimisiz?");
      if (ok) {
        setDomain('');
        setPlan(newPlan);
      }
    } else {
      setPlan(newPlan);
    }
  };

  return (
    <section id="add">
      <div className="wrap">
        <div className="section-head reveal in">
          <div>
            <span className="kicker">Domen qo'shish</span>
            <h2>O'z saytingizni qo'shing</h2>
            <p>Istalgan tarifni tanlab, saytingizni Top3 ro'yxatiga qo'shishingiz mumkin.</p>
          </div>
        </div>
        <div className="relative reveal in bg-zinc-950/60 backdrop-blur-2xl p-6 md:p-10 rounded-[2.5rem] border border-zinc-800/60 shadow-[0_0_80px_rgba(0,0,0,0.4)] max-w-xl mx-auto text-zinc-100 flex flex-col overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-orange-500/5 pointer-events-none"></div>
          
          <div className="relative grid grid-cols-4 gap-1 sm:gap-1.5 bg-zinc-900/90 p-1.5 rounded-2xl mb-8 border border-zinc-800/80 shadow-inner w-full">
            <button 
              type="button"
              onClick={() => handlePlanChange('bepul')}
              className={`w-full py-2.5 px-1 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 text-center flex items-center justify-center ${
                plan === 'bepul' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              Bepul
            </button>
            <button 
              type="button"
              onClick={() => handlePlanChange('umumiy')}
              className={`w-full py-2.5 px-1 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 text-center flex items-center justify-center ${
                plan === 'umumiy' 
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              Umumiy
            </button>
            <button 
              type="button"
              onClick={() => handlePlanChange('bugun')}
              className={`w-full py-2.5 px-1 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 text-center flex items-center justify-center ${
                plan === 'bugun' 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              Bugun
            </button>
            <button 
              type="button"
              onClick={() => handlePlanChange('sponsor')}
              className={`w-full py-2.5 px-1 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 text-center flex items-center justify-center ${
                plan === 'sponsor' 
                  ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              Sponsor
            </button>
          </div>

          <div className="relative w-full">
            <div className="mb-6">
              <label className="block text-xs font-bold text-zinc-500 tracking-widest uppercase mb-3 pl-1">Domen (faqat nomi)</label>
              <div className="flex items-stretch border border-zinc-800 bg-zinc-900/50 transition-all rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 focus-within:bg-zinc-900/80 overflow-hidden shadow-inner">
                <input 
                  type="text" 
                  value={domain} 
                  onChange={handleDomainChange} 
                  placeholder="masalan: kitob"
                  className="flex-1 bg-transparent border-none px-5 py-4 text-lg font-medium text-zinc-100 outline-none placeholder:text-zinc-600"
                />
                <div className="px-5 bg-zinc-800/50 text-zinc-400 font-mono font-bold flex items-center justify-center border-l border-zinc-800/50 backdrop-blur-sm">
                  .uz
                </div>
              </div>
            </div>

            {domain && (
              <div className="mb-6 animate-fade-in">
                <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 pl-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  <span>Sayt kartochkasi ko'rinishi</span>
                </div>
                <PreviewRow domain={domain.endsWith('.uz') ? domain : domain + '.uz'} desc={desc} cat={cat} valid={valid} />
              </div>
            )}
            
            {/* Price stepper → rank calculator for paid plans */}
            {(plan === 'umumiy' || plan === 'bugun') && (() => {
              const rank = calcRank(plan as 'umumiy'|'bugun', paidPrice);
              const paid = domains.filter(d => d.type === plan && d.isPaid && !d.is_sponsored);
              const topPrice = paid.length > 0 ? Math.max(...paid.map(d => d.price || 0)) : 0;
              
              // We want progress to feel full at topPrice + 1000
              const progressTarget = Math.max(1000, topPrice + 1000);
              const pct = Math.min(100, Math.max(2, (paidPrice / progressTarget) * 100));

              const startHold = (action: () => void) => {
                action();
                holdTimer.current = setTimeout(() => {
                  holdInterval.current = setInterval(action, 50);  // ~3x faster
                }, 500);
              };
              const stopHold = () => {
                if (holdTimer.current)    { clearTimeout(holdTimer.current);    holdTimer.current    = null; }
                if (holdInterval.current) { clearInterval(holdInterval.current); holdInterval.current = null; }
              };

              return (
                <div className="mb-8 bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50 shadow-inner">
                  {/* Price display + stepper */}
                  <label className="block text-xs font-bold text-zinc-500 tracking-widest uppercase mb-4 text-center">To'lov miqdori (UZS)</label>
                  <div className="flex items-center justify-center gap-6 mb-6">
                    <button
                      type="button"
                      disabled={paidPrice <= 1000}
                      onPointerDown={() => startHold(() => setPaidPrice(p => Math.max(1000, p - STEP)))}
                      onPointerUp={stopHold}
                      onPointerLeave={stopHold}
                      className="w-14 h-14 flex items-center justify-center rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-2xl text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-zinc-700/50"
                      style={{ userSelect: 'none', touchAction: 'none' }}
                    >
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"><path d="M5 12h14"></path></svg>
                    </button>
                    <div className="flex flex-col items-center justify-center w-40">
                      <span className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-md">{fmt(paidPrice)}</span>
                    </div>
                    <button
                      type="button"
                      onPointerDown={() => startHold(() => setPaidPrice(p => p + STEP))}
                      onPointerUp={stopHold}
                      onPointerLeave={stopHold}
                      className="w-14 h-14 flex items-center justify-center rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-2xl text-zinc-300 transition-colors border border-zinc-700/50"
                      style={{ userSelect: 'none', touchAction: 'none' }}
                    >
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"><path d="M12 5v14M5 12h14"></path></svg>
                    </button>
                  </div>

                  {/* Rank result */}
                  <div className="flex flex-col items-center justify-center mb-5">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={`text-4xl font-black italic tracking-tighter drop-shadow-md ${
                      rank === 1 ? 'text-yellow-400' : rank <= 3 ? 'text-orange-400' : 'text-indigo-400'
                    }`}>#{rank}</span>
                      <span className="text-zinc-400 font-medium text-sm">— o'rin ushbu summa bilan</span>
                    </div>
                    {rank === 1 && <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mt-2 border border-emerald-500/20 uppercase tracking-widest">🏆 Eng yuqori o'rin!</span>}
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-2.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800/50 shadow-inner mb-4">
                    <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${100 - pct + 2}%`, background: rank === 1 ? 'linear-gradient(90deg, #ca8a04, #facc15)' : rank <= 3 ? 'linear-gradient(90deg, #c2410c, #fb923c)' : 'linear-gradient(90deg, #4338ca, #818cf8)' }} />
                  </div>

                  <p className="text-xs text-center text-zinc-500 font-medium">
                    {paid.length === 0
                      ? 'Hali raqiblar yo\'q — 1 000 so\'mga 1-o\'ringa chiqing!'
                      : `Hozirda ${paid.length} ta pullik sayt bor. Eng yuqori: ${fmt(Math.max(...paid.map(d=>d.price||0)))} so'm.`
                    }
                  </p>
                </div>
              );
            })()}

            {plan === 'sponsor' && (
              <div className="mb-6 space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Shaxsiy Banner URL (ixtiyoriy)</label>
                  <input 
                    type="text" 
                    value={customBanner}
                    onChange={(e) => { setCustomBanner(e.target.value); setBannerFile(null); setBannerFileError(''); }}
                    placeholder="https://example.com/banner.jpg"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Yoki Rasm Yuklash (ixtiyoriy)
                    <span className="ml-2 text-zinc-600 normal-case font-normal">JPG, PNG, GIF, WebP — max 2MB</span>
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer"
                    onChange={(e) => {
                      setBannerFileError('');
                      const file = e.target.files?.[0];
                      if (!file) { setBannerFile(null); return; }
                      const ALLOWED = ['image/jpeg','image/png','image/gif','image/webp'];
                      if (!ALLOWED.includes(file.type)) {
                        setBannerFileError('Faqat JPG, PNG, GIF yoki WebP rasm fayllari ruxsat etiladi.');
                        e.target.value = '';
                        setBannerFile(null);
                        return;
                      }
                      if (file.size > 2 * 1024 * 1024) {
                        setBannerFileError("Fayl hajmi 2MB dan oshmasin.");
                        e.target.value = '';
                        setBannerFile(null);
                        return;
                      }
                      setBannerFile(file);
                      setCustomBanner('');
                    }}
                  />
                  {bannerFileError && <p className="text-red-400 text-xs mt-1">{bannerFileError}</p>}
                  {bannerFile && <p className="text-emerald-400 text-xs mt-1">✓ {bannerFile.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Tugma matni (ixtiyoriy)</label>
                  <input 
                    type="text" 
                    value={customCta}
                    onChange={(e) => setCustomCta(e.target.value)}
                    placeholder="Batafsil"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Yo'naltirish URL (ixtiyoriy)</label>
                  <input 
                    type="text" 
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="Qaysi havolaga o'tsin?"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
                  />
                </div>
              </div>
            )}

            {Boolean(warning) && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-6 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-sm font-medium leading-relaxed">{warning}</span>
                </div>
                {redirectUrl && redirectBlocksFree && (
                  <div className="ml-2 px-3 py-2 bg-red-950/40 border border-red-900/50 rounded-xl text-red-300 font-mono text-xs break-all shadow-inner">
                    <span className="opacity-50 mr-2">{"->"}</span>
                    {redirectUrl}
                  </div>
                )}
              </div>
            )}

            {Boolean(apiError || submitError) && !warning && (
              <div className="text-red-400 text-sm font-medium mb-5 px-2">
                {submitError || "Sayt topilmadi yoki ishlamayapti. Iltimos, domenni to'g'ri kiriting."}
              </div>
            )}

            {uzRedirectData.has && (
              <div className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 text-orange-400 p-5 rounded-2xl flex flex-col gap-4 mb-6 text-sm">
                <div>💡 Ushbu saytning mahalliy .uz versiyasi ({uzRedirectData.variant}) mavjud. Loyiha sifati uchun .uz domenini qo'shganingiz ma'qul!</div>
                <button 
                  onClick={() => {
                    const base = uzRedirectData.variant.replace('.uz', '');
                    setDomain(base);
                  }}
                  className="bg-orange-500 text-black px-5 py-2.5 rounded-xl font-bold hover:bg-orange-400 transition-colors self-start shadow-lg shadow-orange-500/20"
                >
                  Buni .uz ga o'zgartirish
                </button>
              </div>
            )}

            <button 
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className={`w-full flex items-center justify-center py-4 px-6 rounded-2xl font-bold text-base sm:text-lg transition-all shadow-xl cursor-pointer ${
                plan === 'sponsor' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-amber-500/25 active:scale-[0.98]' 
                  : plan === 'bugun'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 active:scale-[0.98]'
                  : plan === 'bepul'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25 active:scale-[0.98]'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 active:scale-[0.98]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  <span>Kuting...</span>
                </div>
              ) : (
                plan === 'bepul' ? "Bepul qo'shish" :
                plan === 'umumiy' ? `Xarid qilish (${fmt(paidPrice)} so'm)` :
                plan === 'bugun'  ? `Xarid qilish (${fmt(paidPrice)} so'm)` :
                "Sponsor bo'lish (5 000 so'm / 7 kun)"
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const PreviewRow = ({ domain, desc, cat, valid }: any) => {
  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => setImgError(false), [domain]);

  const rawDom = domain.startsWith('http') ? domain : `https://${domain}`;
  const params = 'utm_source=top3.uz&utm_medium=directory&utm_campaign=top3_referral';
  const utmUrl = rawDom.includes('?') ? `${rawDom}&${params}` : `${rawDom}?${params}`;

  return (
    <div className="flex flex-row items-center justify-between w-full p-4 bg-zinc-900 rounded-lg border border-zinc-800 gap-4">
      
      {/* CHAP QISM */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="font-bold text-zinc-500 w-6 text-center text-xs uppercase tracking-wider shrink-0">new</div>
        
        {!imgError ? (
          <img 
            src={getDomainLogoUrl(domain, 128)} 
            onError={() => setImgError(true)}
            className="w-8 h-8 rounded-md bg-zinc-800 p-1 object-contain shrink-0"
            alt="favicon"
          />
        ) : (
          <span className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center text-xs font-bold text-white" style={faviconStyle(domain)}>{initials(domain)}</span>
        )}
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-zinc-100 font-semibold truncate">{domain}</span>
            <span className="text-zinc-500 text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded shrink-0">{cat !== '—' ? cat : "Boshqa"}</span>
          </div>
          <div className="text-sm text-zinc-400 truncate mt-0.5">{desc !== '—' ? desc : "Ma'lumotlar kutilmoqda..."}</div>
        </div>
      </div>
      
      {/* O'NG QISM */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:block text-right text-sm">
          <b className="text-zinc-200">hozir</b> <span className="text-zinc-500 text-xs">qo'shiladi</span>
        </div>
        <a 
          href={utmUrl}
          onClick={(e) => e.preventDefault()}
          className="bg-white text-black rounded-full px-5 py-2 text-sm font-medium shrink-0 cursor-not-allowed opacity-80 select-none inline-flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          O'tish &rarr;
        </a>
      </div>
      
    </div>
  );
};
