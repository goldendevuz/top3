import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import { categories } from './Categories';

const LINK_RE = /^(https?:\/\/)?([a-z0-9-]+)(\.[a-z0-9-]+)+([/?#].*)?$/i;
const SUBDOMAIN_RE = /^[a-z0-9-]+$/i;

const cleanDomainName = (val: string, isSponsor: boolean) => {
  let cleaned = val.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  if (!isSponsor) {
    cleaned = cleaned.split(/[/?#]/)[0];
    cleaned = cleaned.split('.')[0];
    cleaned = cleaned.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  }
  return cleaned;
};

export const AddFreeDomain = () => {
  const [tier, setTier] = useState<'seo' | 'paid' | 'sponsor'>('seo');
  const [placement, setPlacement] = useState<'umumiy' | 'bugun'>('umumiy');
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState('5');
  const [minSponsorPrice, setMinSponsorPrice] = useState(5);
  
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



  const [confirmState, setConfirmState] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post('http://localhost:8000/api/auth/google', {
          access_token: tokenResponse.access_token
        });
        useAuthStore.getState().login(res.data, tokenResponse.access_token);
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
        const umumiyDomains = data.filter((d: any) => d.board_type === 'umumiy');
        const top1 = umumiyDomains.length > 0 ? Math.max(...umumiyDomains.map((d: any) => d.current_price || 0)) : 0;
        const top1InThousands = Math.floor(top1 / 1000);
        const minP = Math.max(5, top1InThousands);
        setMinSponsorPrice(minP);
        if (parseInt(price, 10) < minP) {
          setPrice(minP.toString());
        }
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
            setDesc((data.description === "Ma'lumot topilmadi" || !data.description) ? "Sayt tavsifi kiritilmagan" : data.description);
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
            setApiError(false);
            setCat('Boshqa');
            setDesc('Sayt tavsifi kiritilmagan');
          }
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
  const minPrice = tier === 'sponsor' ? minSponsorPrice : 1;
  const priceOk = priceNum >= minPrice;

  const valid = domainOk && !fetching && (tier === 'seo' || priceOk);
  
  const displayDesc = desc;
  const displayCat = cat;

  let warning = submitError;
  if (redirectWarning) {
    warning = redirectWarning;
  } else if (!warning) {
    if ((tier === 'paid' || tier === 'sponsor') && domainOk && !priceOk) {
      warning = `Narx kamida ${minPrice} 000 so'm bo'lishi shart.`;
    }
  }

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
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

    if (isAdmin && tier === 'paid' && !confirmState) {
      setConfirmState(true);
      return;
    }

    await executeSubmit(user);
  };

  const executeSubmit = async (user: any) => {
    setConfirmState(false);
    setLoading(true);
    try {
      const isPaid = tier === 'paid' || tier === 'sponsor';
      const boardType = tier === 'seo' ? 'ochiq' : (placement === 'bugun' ? 'bugun' : 'umumiy');
      
      const token = localStorage.getItem('token');

      const res = await fetch('http://localhost:8000/api/domains/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString(),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: tier === 'sponsor' ? `https://${domain}` : domain + '.uz',
          board_type: boardType,
          price: isPaid ? priceNum * 1000 : 0,
          description: displayDesc !== '—' ? displayDesc : undefined,
          category: displayCat !== '—' ? displayCat : undefined,
          user_id: user.id,
          is_sponsored: tier === 'sponsor'
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
        throw new Error('Failed to create domain');
      }
      
      const domainRes = await res.json();

      if (isPaid) {
        const payRes = await fetch('http://localhost:8000/api/payments/init', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': user.id.toString(),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
      
      toast.success("Muvaffaqiyatli qo'shildi!");
      setTimeout(() => {
        window.location.href = '#board';
        window.location.reload();
      }, 1500);
      
    } catch(err: any) {
      console.error(err);
      if (err.message === 'REDIRECT_NOT_ALLOWED_FOR_FREE') {
        setSubmitError("Bu pullik funksiya. Redirect qilinadigan domenlarni faqat pullik tarifda qo'shish mumkin");
      } else if (err.message && err.message !== 'Failed to create domain' && err.message !== 'API error') {
        setSubmitError(err.message);
      } else {
        setSubmitError("Xatolik yuz berdi. Domen band bo'lishi mumkin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center py-10 w-full">
      <div className="w-full max-w-2xl bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Bepul yoki Sponsor domen qo'shish</h2>
        
        {/* TABLAR */}
        <div className="flex gap-4 mb-8 bg-slate-900 p-2 rounded-xl">
          <button 
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${tier === 'seo' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setTier('seo')}
          >
            Ochiq (Bepul)
          </button>
          <button 
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${tier === 'sponsor' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setTier('sponsor')}
          >
            Sponsor
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* DOMAIN INPUT */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">Sayt URL</label>
            <div className="h-14 relative flex items-center bg-slate-900 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 border border-slate-700">
              <input 
                type="text" 
                value={domain} 
                onChange={e => setDomain(cleanDomainName(e.target.value, tier === 'sponsor'))} 
                placeholder={tier === 'sponsor' ? "To'liq havola (masalan: t.me/kitob)" : "Sayt nomi (masalan: kitob)"}
                className="w-full h-full bg-transparent outline-none px-4 text-white placeholder-slate-500 font-medium" 
              />
              {tier !== 'sponsor' && (
                <div className="px-4 text-slate-400 font-bold bg-slate-900 h-full flex items-center border-l border-slate-700">.uz</div>
              )}
            </div>
          </div>

          {/* SEO OVERRIDE */}
          {domainOk && !fetching && desc !== '—' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-2">
                  SEO Tavsif {tier === 'sponsor' ? "(O'zgartirish ruxsat etiladi)" : "(Faqat o'qish uchun)"}
                </label>
                {tier === 'sponsor' ? (
                  <input 
                    type="text"
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    className="w-full h-14 bg-slate-900 rounded-xl border border-slate-700 px-4 text-white focus:outline-none focus:border-indigo-500"
                    title={desc}
                  />
                ) : (
                  <input 
                    type="text"
                    value={desc}
                    readOnly={true}
                    className="w-full h-14 bg-slate-900/50 rounded-xl border border-slate-700/50 px-4 text-slate-400 focus:outline-none cursor-not-allowed"
                    title={desc}
                  />
                )}
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-2">SEO Kategoriya</label>
                <select 
                  value={cat} 
                  onChange={e => setCat(e.target.value)}
                  className="w-full h-14 bg-slate-900 rounded-xl border border-slate-700 px-4 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Kategoriya tanlang...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* SPONSOR FIELDS */}
          {tier === 'sponsor' && (
            <>
              <div>
                <label className="block text-slate-300 font-medium mb-2">Narx (Sponsor uchun to'lov)</label>
                <div className="w-full h-14 relative flex flex-row items-center bg-slate-900 rounded-xl border border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow text-white font-mono text-lg font-bold">
                  <input 
                    type="number" 
                    min={minSponsorPrice}
                    step="1"
                    value={price} 
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      setPrice(val);
                    }}
                    onBlur={() => {
                      let p = parseInt(price, 10);
                      if (isNaN(p) || p < minSponsorPrice) setPrice(minSponsorPrice.toString());
                      else setPrice(p.toString());
                    }}
                    className="w-full h-full bg-transparent outline-none pl-4 pr-0.5 text-right placeholder-slate-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" 
                  />
                  <span className="pr-4 text-slate-400 whitespace-nowrap bg-transparent flex items-center select-none pointer-events-none"> 000</span>
                </div>
              </div>

            </>
          )}

          {/* SUBMIT BUTTON */}
          <button 
            disabled={!valid || loading}
            onClick={handleSubmit}
            className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-indigo-600/20"
          >
            {loading ? "Kuting..." : "Qo'shish"}
          </button>

          {/* WARNINGS */}
          <div className="flex flex-col items-center gap-3">
            <div className={`warn-box ${warning ? 'show' : ''} !static !mt-0 w-full text-center rounded-xl`}>
              ⚠ {warning}
            </div>

            {uzRedirectData.has && (
              <div className="warn-box show !static !mt-0 w-full text-center rounded-xl" style={{ background: 'rgba(255, 165, 0, 0.1)', color: 'orange', borderColor: 'orange', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>💡 Ogohlantirish: Ushbu saytning mahalliy .uz versiyasi ({uzRedirectData.variant}) mavjud. Uni kiritganingiz ma'qul!</div>
                <button 
                  onClick={() => {
                    const base = uzRedirectData.variant.replace('.uz', '');
                    setDomain(base);
                  }}
                  className="bg-orange-500 hover:bg-orange-400 text-slate-900 font-bold px-6 py-2 rounded-full mx-auto transition-colors"
                >
                  Buni .uz ga o'zgartirish
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
      <ConfirmModal 
        isOpen={confirmState}
        title="Domenni tasdiqlash"
        message="Siz ushbu domenni ODDIY PULLIK ro'yxatga qo'shyapsiz. Ehtimol uni Sponsor qilmoqchidirsiz? Davom etishni tasdiqlaysizmi?"
        onConfirm={() => executeSubmit(JSON.parse(localStorage.getItem('top3_user')!))}
        onCancel={() => setConfirmState(false)}
        confirmText="Davom etish"
      />
    </section>
  );
};

