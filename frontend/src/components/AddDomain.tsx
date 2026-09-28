import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';

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
  const [tier, setTier] = useState<'seo' | 'paid' | 'sponsor'>('seo');
  const [placement, setPlacement] = useState<'umumiy' | 'bugun'>('umumiy');
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState('1000');
  
  const [customSponsor, setCustomSponsor] = useState(false);
  const [customDesc, setCustomDesc] = useState('');
  const [customCat, setCustomCat] = useState('');

  const [cat, setCat] = useState('—');
  const [desc, setDesc] = useState('—');
  const [fetching, setFetching] = useState(false);
  const [domainOk, setDomainOk] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [redirectWarning, setRedirectWarning] = useState('');
  const [uzRedirectData, setUzRedirectData] = useState<{has: boolean, variant: string}>({has: false, variant: ''});
  const [competitors, setCompetitors] = useState<{board_type: string, price: number}[]>([]);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const categories = ["Ta'lim", "Onlayn-do'kon", "IT va Dasturlash", "Media", "Moliya", "Tibbiyot", "Xizmatlar", "Ko'ngilochar", "Sayohat", "Boshqa"];

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post('http://localhost:8000/api/auth/google', {
          access_token: tokenResponse.access_token
        });
        localStorage.setItem('top3_user', JSON.stringify(res.data));
        window.location.reload();
      } catch (err) {
        console.error('Google login error:', err);
      }
    }
  });

  useEffect(() => {
    const userStr = localStorage.getItem('top3_user');
    if (userStr) {
      const pendingStr = localStorage.getItem('pending_domain_data');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          setTier(pending.tier);
          setPlacement(pending.placement);
          setDomain(pending.domain);
          setPrice(pending.price);
          setCustomSponsor(pending.customSponsor);
          setCustomDesc(pending.customDesc);
          setCustomCat(pending.customCat);
          localStorage.removeItem('pending_domain_data');
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    fetch('http://localhost:8000/api/domains/')
      .then(res => res.json())
      .then(data => {
        setCompetitors(data.map((d: any) => ({ board_type: d.board_type, price: d.price })));
      })
      .catch(console.error);
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
      const isOk = tier === 'sponsor' ? LINK_RE.test(domain) : SUBDOMAIN_RE.test(domain);
      setDomainOk(isOk);
      
      if (isOk) {
        if (!(tier === 'sponsor' && customSponsor)) {
          try {
            const target = tier === 'sponsor' ? domain.replace(/^https?:\/\//i, "").split("/")[0] : domain + '.uz';
            const userStr = localStorage.getItem('top3_user');
            const headers: Record<string, string> = {};
            if (userStr) {
              const user = JSON.parse(userStr);
              headers['x-user-id'] = user.id.toString();
            }
            const res = await fetch(`http://localhost:8000/api/seo/fetch?domain=${target}`, { headers });
            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            setCat(data.category || 'Boshqa');
            setDesc(data.description || 'Ma\'lumot topilmadi');
            setUzRedirectData({
              has: data.has_uz_redirect || false,
              variant: data.uz_variant || ''
            });
            if (data.is_redirected && tier === 'seo') {
              setRedirectWarning("Bu domen boshqa manzilga yo'naltirilmoqda (Redirect). Redirect orqali sayt ma'lumotlarini olish faqat Pullik tarifda mavjud. Siz pullik bo'limga o'tkazildingiz.");
              setTier('paid');
            } else if (!data.is_redirected) {
              setRedirectWarning('');
            }
          } catch (err) {
            console.error(err);
            setApiError(true);
            setCat('—');
            setDesc('—');
          }
          const res = await fetch(`http://localhost:8000/api/seo/fetch?domain=${target}`, { headers });
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
            setRedirectWarning("Bu domen boshqa manzilga yo'naltirilmoqda. Biroq, Pullik tarifda bunga ruxsat beriladi.");
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
  }, [domain, tier, customSponsor]);

  const priceNum = parseInt(price, 10) || 0;
  const priceOk = priceNum >= 1000 && priceNum % 1000 === 0;

  const getPredictedRank = () => {
    if (tier === 'seo') return -1;
    const isPaid = tier === 'paid' || tier === 'sponsor';
    if (!isPaid) return -1;
    const currentBoardType = tier === 'sponsor' ? 'umumiy' : (placement === 'bugun' ? 'bugun' : 'umumiy');
    const relevant = competitors.filter(c => c.board_type === currentBoardType && c.price > 0);
    relevant.push({ board_type: 'temp', price: priceNum });
    relevant.sort((a, b) => b.price - a.price);
    return relevant.findIndex(c => c.board_type === 'temp') + 1;
  };

  const isDescMissing = tier !== 'sponsor' && !fetching && domainOk && desc === "Ma'lumot topilmadi";
  const valid = domainOk && !apiError && !isDescMissing && (tier === 'seo' || priceOk);
  
  const displayDesc = tier === 'sponsor' ? customDesc : desc;
  const displayCat = tier === 'sponsor' ? customCat : cat;

  let warning = '';
  if (redirectWarning) {
    warning = redirectWarning;
  } else if (domain && !fetching && !domainOk) {
    if (tier !== 'sponsor') {
      if (domain.includes('.')) {
        warning = ".uz avtomatik qo'shiladi, faqat sayt nomini kiriting (masalan: shats)";
      } else {
        warning = "Faqat lotin harflari va raqamlar qabul qilinadi.";
      }
    } else {
      warning = "Noto'g'ri havola formati.";
    }
  } else if ((tier === 'paid' || tier === 'sponsor') && domainOk && !priceOk) {
    warning = "Narx 1000 so'mga karrali bo'lishi shart.";
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
    // 1. QAT'IY VALIDATSIYA VA BLOKLASH
    const isValid = /^[a-zA-Z0-9-]+$/.test(domain); 
    
    if (!isValid) {
      toast.error("Iltimos, faqat bitta so'z kiriting (probel va nuqtasiz)!");
      setLoading(false);
      return; // DASTURNI SHU YERDA QAT'IY TO'XTATISH!
    }

    if (!valid) return;
    
    const userStr = localStorage.getItem('top3_user');
    if (!userStr) {
      localStorage.setItem('pending_domain_data', JSON.stringify({
        tier, placement, domain, price, customSponsor, customDesc, customCat
      }));
      login();
      return;
    }
    const user = JSON.parse(userStr);
    const isAdmin = user.email === 'yunusovabdulmajid@gmail.com';

    if (isAdmin && tier === 'paid') {
      const confirmMsg = "Siz ushbu domenni ODDIY PULLIK ro'yxatga qo'shyapsiz. Ehtimol uni Sponsor qilmoqchidirsiz? Davom etishni tasdiqlaysizmi?";
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setLoading(true);
    try {
      const isPaid = tier === 'paid' || tier === 'sponsor';
      const boardType = tier === 'seo' ? 'ochiq' : (placement === 'bugun' ? 'bugun' : 'umumiy');
      
      const res = await fetch('http://localhost:8000/api/domains/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString()
        },
        body: JSON.stringify({
          name: tier === 'sponsor' ? domain.replace(/^https?:\/\//i, "").split("/")[0] : domain + '.uz',
          board_type: boardType,
          price: isPaid ? priceNum : 0,
          description: displayDesc !== '—' ? displayDesc : undefined,
          category: displayCat !== '—' ? displayCat : undefined,
          user_id: user.id,
          is_sponsored: tier === 'sponsor'
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.detail) {
          throw new Error(errorData.detail);
        }
        throw new Error('Failed to create domain');
      }
      
      const domainRes = await res.json();

      if (isPaid) {
        const payRes = await fetch('http://localhost:8000/api/payments/init', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': user.id.toString()
          },
          body: JSON.stringify({
            domain_id: domainRes.id,
            amount: priceNum,
            user_id: user.id
          })
        }).then(r => r.json());

        if (payRes.pay_url) {
          window.location.href = payRes.pay_url;
          return;
        }
      }
      
      alert("Muvaffaqiyatli qo'shildi!");
      window.location.href = '#board';
      window.location.reload();
      
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
    const value = e.target.value;
    
    if (/\s/.test(value) || (!/^[a-zA-Z0-9-]*$/.test(value) && tier !== 'sponsor')) {
      toast.error("Faqat bitta so'z yozing! Probel taqiqlangan.");
      setDomain("");
      return;
    }
    
    setDomain(value.toLowerCase());
  };

  return (
    <section id="add">
      <div className="wrap">
        <div className="section-head reveal in">
          <div>
            <span className="kicker">Qo'shish</span>
            <h2>Saytingizni ro'yxatga qo'shing</h2>
            <p>Bu — maket, hech narsa saqlanmaydi. Pastdagi jonli oldindan ko'rish tanlagan bo'limingiz ichida qaysi o'rinni olishingizni ko'rsatadi.</p>
          </div>
        </div>
        <div className="add-panel reveal in bg-zinc-950 p-6 md:p-8 rounded-2xl border border-zinc-800 shadow-2xl max-w-2xl mx-auto text-zinc-100">
          <div>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Domen (faqat nomi)</label>
              <div className="flex items-stretch border-b border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 transition-colors rounded-t-md focus-within:border-white focus-within:bg-zinc-900">
                <input 
                  type="text" 
                  value={domain} 
                  onChange={handleDomainChange} 
                  placeholder="masalan: kitob"
                  className="flex-1 bg-transparent border-none px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-600"
                />
                <div className="px-4 bg-transparent text-zinc-500 font-mono font-medium flex items-center justify-center border-l border-zinc-800">
                  .uz
                </div>
              </div>
            </div>
            
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
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', marginTop: '14px' }}
            >
              {loading ? "Kuting..." : "Ro'yxatga qo'shish"}
            </button>
          </div>

          <div className="w-full max-w-2xl mt-8">
            <span className="live-preview-label block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Jonli oldindan ko'rish</span>
            <div id="previewRow" className="w-full">
              <PreviewRow tier={tier} placement={placement} domain={tier === 'sponsor' ? domain || "domen.uz" : (domain ? domain + '.uz' : "domen.uz")} desc={displayDesc} cat={cat} price={priceNum} valid={domainOk} />
            </div>
            <div className="preview-hint mt-2 text-xs text-zinc-500">
              "Ochiq" ro'yxat oxiriga tushasiz.
            </div>
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
