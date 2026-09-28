import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import { categories, categoryConfig } from './Categories';
import { useBoardStore } from '../store/useBoardStore';
import { useAuthStore } from '../store/useAuthStore';

const LINK_RE = /^(https?:\/\/)?([a-z0-9-]+)(\.[a-z0-9-]+)+([/?#].*)?$/i;
const SUBDOMAIN_RE = /^[a-z0-9-]+$/i;

const formatNum = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

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

const categoryIcons: Record<string, string> = {
  "Onlayn do'konlar va Savdo": "🛒",
  "Ta'lim va O'quv markazlari": "📚",
  "Biznes, Moliya va Huquq": "💼",
  "IT va Dasturlash": "💻",
  "Yangiliklar va OAV (Media)": "📰",
  "Tibbiyot va Salomatlik": "🏥",
  "Ko'chmas mulk va Qurilish": "🏠",
  "Sayohat va Turizm": "✈️",
  "Xizmat ko'rsatish va Agentliklar": "🛠",
  "Marketing va Reklama": "🎯",
  "Ish, Karyera va Vakansiyalar": "🤝",
  "Ijtimoiy tarmoqlar va Bloging": "📱",
  "Dizayn va Kreativ": "🎨",
  "O'yinlar va Ko'ngilochar": "🎮",
  "Neyrotarmoqlar va AI": "🤖",
  "Foydali vositalar (Tools)": "⚙️",
  "Boshqa": "📌"
};

export const AddDomain = () => {
  const [tier, setTier] = useState<'seo' | 'paid' | 'sponsor'>('paid');
  const [placement, setPlacement] = useState<'umumiy' | 'bugun'>('umumiy');
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState('1');
  
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
  const [competitors, setCompetitors] = useState<{board_type: string, price: number, is_sponsored?: boolean}[]>([]);


  const [confirmState, setConfirmState] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post('/api/auth/google', {
          access_token: tokenResponse.access_token
        });
        useAuthStore.getState().login(res.data.user || res.data, res.data.token || tokenResponse.access_token);
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
          setPrice((pending.price / 1000).toString());
          setCustomSponsor(pending.customSponsor);
          setCustomDesc(pending.customDesc);
          setCustomCat(pending.customCat);
          localStorage.removeItem('pending_domain_data');
        } catch (e) {}
      }
    }
  }, []);

  const { domains } = useBoardStore();
  
  useEffect(() => {
    setCompetitors(domains.map((d: any) => ({ 
      board_type: d.type || 'umumiy', 
      price: d.price || 0,
      is_sponsored: !!d.is_sponsored
    })));
  }, [domains]);

  // Auto-calculate required price for 1st place
  useEffect(() => {
    if (tier === 'seo') return;
    const currentBoardType = tier === 'sponsor' ? 'umumiy' : (placement === 'bugun' ? 'bugun' : 'umumiy');
    const relevant = competitors.filter(c => c.board_type === currentBoardType && c.price > 0 && !c.is_sponsored);
    
    let maxPrice = 0;
    if (relevant.length > 0) {
      maxPrice = Math.max(...relevant.map(c => c.price));
    }
    
    const needed = (maxPrice / 1000) + 1; // +1000 sum to beat the top
    setPrice(needed.toString());
  }, [tier, placement, competitors.length]);

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

  const inputValue = parseInt(price, 10) || 1;
  const priceNum = inputValue * 1000;
  const priceOk = inputValue >= 1 && inputValue <= 100;

  const getPredictedRank = () => {
    if (tier === 'seo') return -1;
    const isPaid = tier === 'paid' || tier === 'sponsor';
    if (!isPaid) return -1;
    const currentBoardType = tier === 'sponsor' ? 'umumiy' : (placement === 'bugun' ? 'bugun' : 'umumiy');
    // For rank prediction, we only compare against other ORGANIC PAID domains (not sponsored)
    const relevant = competitors.filter(c => c.board_type === currentBoardType && c.price > 0 && !c.is_sponsored);
    relevant.push({ board_type: 'temp', price: priceNum });
    relevant.sort((a, b) => (b.price || 0) - (a.price || 0));
    return relevant.findIndex(c => c.board_type === 'temp') + 1;
  };

  const valid = domainOk && !fetching && (tier === 'seo' || priceOk);
  
  const displayDesc = tier === 'sponsor' ? customDesc : desc;
  const displayCat = tier === 'sponsor' ? customCat : cat;

  let warning = submitError;
  if (redirectWarning) {
    warning = redirectWarning;
  } else if (!warning) {
    if ((tier === 'paid' || tier === 'sponsor') && domainOk && !priceOk) {
      warning = "Narx 1 000 so'mdan 100 000 so'mgacha bo'lishi shart.";
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
    <section id="add" className="py-8 md:py-12 flex flex-col items-center justify-center w-full gap-6">
      
      {/* DYNAMIC HEADER (RANK CALCULATOR) */}
      <div className="w-full text-center px-4">
        <h1 className="text-center text-4xl md:text-5xl font-bold text-white transition-all tracking-tight">
          <span className="text-indigo-400">{getPredictedRank()}</span>-o'rinni <span>{formatNum(inputValue)} 000</span> so'mga band qiling!
        </h1>
      </div>

      {/* 3-QAVAT: INLINE FORM */}
      <div className="flex flex-row items-center justify-center gap-2 w-full max-w-3xl px-4">
        <div className="flex-1 h-14 relative flex items-center bg-slate-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
          <input 
            type="text" 
            value={domain} 
            onChange={e => setDomain(cleanDomainName(e.target.value, tier === 'sponsor'))} 
            placeholder={tier === 'sponsor' ? "To'liq havola (masalan: t.me/kitob)" : "Sayt URL (masalan: kitob)"}
            className="w-full h-full bg-transparent outline-none px-4 text-white placeholder-slate-500 font-medium" 
          />
          <div className="px-4 text-slate-400 font-bold bg-slate-800/80 h-full flex items-center">.uz</div>
        </div>
        
        <div className="w-32 md:w-36 h-14 relative flex flex-row items-center bg-slate-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow text-white font-mono text-lg font-bold">
          <input 
            type="number" 
            min="1"
            max="100"
            step="1" 
            value={price} 
            onChange={e => {
              let val = e.target.value.replace(/\D/g, '');
              if (val !== '' && parseInt(val, 10) > 100) val = '100';
              setPrice(val);
            }}
            onBlur={() => {
              let p = parseInt(price, 10);
              if (isNaN(p) || p < 1) setPrice("1");
              else if (p > 100) setPrice("100");
              else setPrice(p.toString());
            }}
            className="w-full h-full bg-transparent outline-none pl-4 pr-0.5 text-right placeholder-slate-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            placeholder="1"
          />
          <span className="pr-4 py-4 text-slate-400 whitespace-nowrap bg-transparent flex items-center select-none pointer-events-none"> 000</span>
        </div>

        <button 
          disabled={!valid || loading}
          onClick={handleSubmit}
          className="h-14 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {loading ? "Kuting..." : "Xarid qilish"}
        </button>
      </div>

      {/* SEO OVERRIDE */}
      {domainOk && !fetching && desc !== '—' && (
        <div className="w-full max-w-3xl px-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-slate-300 font-medium mb-1 ml-1 text-sm">SEO Kategoriya</label>
            <select 
              value={cat} 
              onChange={e => setCat(e.target.value)}
              className="w-full h-12 bg-slate-800 rounded-xl border border-slate-700 px-4 text-white focus:outline-none focus:border-indigo-500 text-sm"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-[2]">
            <label className="block text-slate-300 font-medium mb-1 ml-1 text-sm">SEO Tavsif (Faqat o'qish uchun)</label>
            <div className="w-full h-12 bg-slate-800/50 rounded-xl border border-slate-700/50 px-4 text-slate-400 flex items-center overflow-hidden whitespace-nowrap text-ellipsis text-sm" title={desc}>
              {desc}
            </div>
          </div>
        </div>
      )}

      {/* WARNINGS / ALERTS */}
      <div className="flex flex-col items-center gap-3 w-full max-w-3xl px-4">
        <div className={`warn-box ${warning ? 'show' : ''} !static !mt-0 w-full text-center rounded-xl`}>
          ⚠ {warning}
        </div>

        {uzRedirectData.has && (
          <div className="warn-box show !static !mt-0 w-full text-center rounded-xl" style={{ background: 'rgba(255, 165, 0, 0.1)', color: 'orange', borderColor: 'orange', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>💡 Ogohlantirish: Ushbu saytning mahalliy .uz versiyasi ({uzRedirectData.variant}) mavjud va u aynan shu saytga yo'naltirmoqda. Loyiha sifati uchun .uz domenini qo'shganingiz ma'qulroq!</div>
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

