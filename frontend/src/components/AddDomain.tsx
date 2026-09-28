import React, { useState, useEffect, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useBoardStore } from '../store/useBoardStore';

const backendUrl = import.meta.env.VITE_API_URL || '';

const LINK_RE = /^(https?:\/\/)?([a-z0-9-]+)(\.[a-z0-9-]+)+([/?#].*)?$/i;
const SUBDOMAIN_RE = /^[a-z0-9-]+$/i;

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
  const [domain, setDomain] = useState('');
  
  const [cat, setCat] = useState('—');
  const [desc, setDesc] = useState('—');
  const [fetching, setFetching] = useState(false);
  const [domainOk, setDomainOk] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [redirectWarning, setRedirectWarning] = useState('');
  const [uzRedirectData, setUzRedirectData] = useState<{has: boolean, variant: string}>({has: false, variant: ''});
  
  const [plan, setPlan] = useState<'bepul'|'umumiy'|'bugun'|'sponsor'>('umumiy');
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
        localStorage.setItem('top3_user', JSON.stringify(res.data));
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
    setRedirectWarning('');
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
      const isOk = SUBDOMAIN_RE.test(domain);
      setDomainOk(isOk);
      
      if (isOk) {
        try {
          const target = domain + '.uz';
          const userStr = localStorage.getItem('top3_user');
          const headers: Record<string, string> = {};
          if (userStr) {
            const user = JSON.parse(userStr);
            headers['x-user-id'] = user.id.toString();
          }
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
            setRedirectWarning("Bu domen boshqa manzilga yo'naltirilmoqda (Redirect). Bepul ro'yxatda bunday domenlarni qo'shish taqiqlangan.");
            setDomainOk(false);
          } else {
            setRedirectWarning('');
          }
        } catch (err: any) {
          console.error(err);
          setApiError(true);
          setSubmitError(err.message || "Sayt mavjud emas yoki ishlamayapti");
          setDomainOk(false);
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

  const isDescMissing = !fetching && domainOk && desc === "Ma'lumot topilmadi";
  const valid = domainOk && !apiError && !isDescMissing;
  
  let warning = '';
  if (redirectWarning) {
    warning = redirectWarning;
  } else if (domain && !fetching && !domainOk) {
    if (domain.includes('.')) {
      warning = ".uz avtomatik qo'shiladi, faqat sayt nomini kiriting (masalan: shats)";
    } else {
      warning = "Faqat lotin harflari va raqamlar qabul qilinadi.";
    }
  }

  useEffect(() => {
    if (apiError || submitError) {
      if (apiError) toast.error("Sayt topilmadi. Iltimos, domenni to'g'ri kiriting.", { id: 'apiError' });
      if (submitError) toast.error(submitError, { id: 'submitError' });
      
      const timer = setTimeout(() => {
        setApiError(false);
        setSubmitError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [apiError, submitError]);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const isValid = /^[a-zA-Z0-9-]+$/.test(domain); 
    
    if (!isValid) {
      toast.error("Iltimos, faqat bitta so'z kiriting (probel va nuqtasiz)!");
      setLoading(false);
      return; 
    }

    if (!valid) return;
    
    const userStr = localStorage.getItem('top3_user');
    if (!userStr) {
      localStorage.setItem('pending_domain_data_free', JSON.stringify({ domain }));
      login();
      return;
    }
    const user = JSON.parse(userStr);

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


      const res = await fetch(`${backendUrl}/api/domains/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString()
        },
        body: JSON.stringify({
          name: domain + '.uz',
          board_type: finalBoardType,
          price: finalPrice,
          description: desc !== '—' ? desc : undefined,
          category: cat !== '—' ? cat : undefined,
          user_id: user.id,
          is_sponsored: finalIsSponsored,
          ...(plan === 'sponsor' ? {
            custom_banner: customBanner || undefined,
            custom_url: customUrl || undefined,
            custom_cta: customCta || undefined
          } : {})
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.detail) {
          throw new Error(errorData.detail);
        }
        throw new Error('Failed to create domain');
      }
      
      const data = await res.json();
      
      if (finalPrice > 0) {
        const payRes = await fetch(`${backendUrl}/api/payments/init`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': user.id.toString()
          },
          body: JSON.stringify({
            domain_id: data.id,
            amount: finalPrice,
            user_id: user.id
          })
        });
        if (!payRes.ok) throw new Error("To'lovni shakllantirishda xatolik");
        const payData = await payRes.json();
        window.location.href = `https://my.click.uz/services/pay?service_id=${payData.service_id}&merchant_id=${payData.merchant_id}&amount=${payData.amount}&transaction_param=${payData.transaction_id}`;
      } else {
        toast.success("Domen muvaffaqiyatli qo'shildi!");
        setTimeout(() => window.location.reload(), 1500);
      }
      
    } catch(err: any) {
      console.error(err);
      if (err.message === 'REDIRECT_NOT_ALLOWED_FOR_FREE') {
        setSubmitError("Bu pullik funksiya. Redirect qilinadigan domenlarni faqat pullik tarifda qo'shish mumkin");
      } else if (err.message && err.message !== 'Failed to create domain' && err.message !== 'API error') {
        setSubmitError(err.message);
      } else {
        setSubmitError("Xatolik yuz berdi. Domen band bo'lishi mumkin.");
      }
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip all whitespace silently (mobile keyboard auto-adds spaces)
    const sanitized = e.target.value.replace(/\s+/g, '').toLowerCase();
    // Only block truly invalid characters (not spaces — already stripped)
    if (sanitized && !/^[a-zA-Z0-9-]*$/.test(sanitized)) {
      toast.error("Faqat lotin harflari va raqamlar qabul qilinadi.", { id: 'domain-invalid', duration: 2000 });
      return;
    }
    setDomain(sanitized);
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
        <div className="add-panel reveal in bg-zinc-950 p-6 md:p-8 rounded-2xl border border-zinc-800 shadow-2xl max-w-lg mx-auto text-zinc-100 flex flex-col" style={{ display: 'flex' }}>
          
          <div className="flex bg-zinc-900/50 p-1 rounded-xl mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button 
              onClick={() => setPlan('bepul')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${plan === 'bepul' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Bepul
            </button>
            <button 
              onClick={() => setPlan('umumiy')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${plan === 'umumiy' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Umumiy
            </button>
            <button 
              onClick={() => setPlan('bugun')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${plan === 'bugun' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Bugun
            </button>
            <button 
              onClick={() => setPlan('sponsor')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${plan === 'sponsor' ? 'bg-yellow-500/20 text-yellow-500 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Sponsor
            </button>
          </div>


          <div className="w-full">
            <div className="mb-6">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Domen (faqat nomi)</label>
              <div className="flex items-stretch border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors rounded-xl focus-within:border-zinc-600 focus-within:bg-zinc-900 overflow-hidden">
                <input 
                  type="text" 
                  value={domain} 
                  onChange={handleDomainChange} 
                  placeholder="masalan: kitob"
                  className="flex-1 bg-transparent border-none px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-600"
                />
                <div className="px-4 bg-zinc-900/80 text-zinc-500 font-mono font-medium flex items-center justify-center border-l border-zinc-800">
                  .uz
                </div>
              </div>
            </div>
            
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
                <div className="mb-6">
                  {/* Price display + stepper */}
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">To'lov miqdori</label>
                  <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #27272a', borderRadius: '12px', overflow: 'hidden', background: '#18181b', marginBottom: '16px' }}>
                    <button
                      type="button"
                      disabled={paidPrice <= 1000}
                      onPointerDown={() => startHold(() => setPaidPrice(p => Math.max(1000, p - STEP)))}
                      onPointerUp={stopHold}
                      onPointerLeave={stopHold}
                      style={{ padding: '12px 18px', fontSize: '22px', color: paidPrice <= 1000 ? '#3f3f46' : '#71717a', background: 'transparent', border: 'none', cursor: paidPrice <= 1000 ? 'not-allowed' : 'pointer', lineHeight: 1, userSelect: 'none', touchAction: 'none' }}
                    >−</button>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, color: 'white', fontVariantNumeric: 'tabular-nums' }}>{fmt(paidPrice)}</span>
                      <span style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>so'm</span>
                    </div>
                    <button
                      type="button"
                      onPointerDown={() => startHold(() => setPaidPrice(p => p + STEP))}
                      onPointerUp={stopHold}
                      onPointerLeave={stopHold}
                      style={{ padding: '12px 18px', fontSize: '22px', color: '#71717a', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1, userSelect: 'none', touchAction: 'none' }}
                    >+</button>
                  </div>

                  {/* Rank result */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span className={`text-3xl font-black ${
                      rank === 1 ? 'text-yellow-400' : rank <= 3 ? 'text-orange-400' : 'text-indigo-400'
                    }`}>{rank}-o'rin</span>
                    <span style={{ color: '#52525b', fontSize: '13px' }}>— shu miqdor bilan</span>
                    {rank === 1 && <span style={{ fontSize: '13px', color: '#22c55e' }}>🏆 eng yuqori!</span>}
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '6px', borderRadius: '4px', background: '#27272a', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${100 - pct + 2}%`, borderRadius: '4px', background: rank === 1 ? '#eab308' : rank <= 3 ? '#f97316' : '#6366f1', transition: 'width 0.3s, background 0.3s' }} />
                  </div>

                  <p style={{ fontSize: '11px', color: '#52525b', marginTop: '8px' }}>
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

            {warning && (
              <div className="text-red-400 text-sm mb-4">
                {warning}
              </div>
            )}

            {uzRedirectData.has && (
              <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-xl flex flex-col gap-3 mb-6 text-sm">
                <div>💡 Ushbu saytning mahalliy .uz versiyasi ({uzRedirectData.variant}) mavjud. Loyiha sifati uchun .uz domenini qo'shganingiz ma'qul!</div>
                <button 
                  onClick={() => {
                    const base = uzRedirectData.variant.replace('.uz', '');
                    setDomain(base);
                  }}
                  className="bg-orange-500 text-black px-4 py-1.5 rounded-full font-medium hover:bg-orange-400 transition-colors self-start"
                >
                  Buni .uz ga o'zgartirish
                </button>
              </div>
            )}

            <button 
              disabled={!valid || loading}
              onClick={handleSubmit}
              className={`btn ${plan === 'sponsor' ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'btn-primary'}`}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', marginTop: '14px', opacity: (!valid || loading) ? 0.5 : 1 }}
            >
              {loading ? "Kuting..." : (
                plan === 'bepul' ? "Bepul qo'shish" :
                plan === 'umumiy' ? `Xarid qilish (${fmt(paidPrice)} so'm)` :
                plan === 'bugun'  ? `Xarid qilish (${fmt(paidPrice)} so'm)` :
                "Sponsor (5 000 so'm / 7 kun)"
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

  return (
    <div className="flex flex-row items-center justify-between w-full p-4 bg-zinc-900 rounded-lg border border-zinc-800 gap-4">
      
      {/* CHAP QISM */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="font-bold text-zinc-500 w-6 text-center text-xs uppercase tracking-wider shrink-0">new</div>
        
        {!imgError ? (
          <img 
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
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
        <span className="bg-white text-black rounded-full px-5 py-2 text-sm font-medium shrink-0 cursor-not-allowed opacity-80">
          O'tish &rarr;
        </span>
      </div>
      
    </div>
  );
};
