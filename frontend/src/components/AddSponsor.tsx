import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';
import { categories } from './Categories';
import { useAuthStore } from '../store/useAuthStore';

const backendUrl = import.meta.env.VITE_API_URL || '';


const cleanDomainName = (val: string) => {
  let cleaned = val.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.replace(/\s+/g, '');
  return cleaned;
};

const LINK_RE = /^(https?:\/\/)?([a-z0-9-]+)(\.[a-z0-9-]+)+([/?#].*)?$/i;

export const AddSponsor = () => {
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState('5');
  const [minSponsorPrice, setMinSponsorPrice] = useState(5);
  
  const [cat, setCat] = useState('');
  const [desc, setDesc] = useState('');
  const [domainOk, setDomainOk] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post(`${backendUrl}/api/auth/google`, {
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
      const pendingStr = localStorage.getItem('pending_sponsor_data');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          setDomain(pending.domain);
          setPrice(pending.price);
          setDesc(pending.desc);
          setCat(pending.cat);
          localStorage.removeItem('pending_sponsor_data');
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    fetch(`${backendUrl}/api/domains/`)
      .then(res => res.json())
      .then(data => {
        const umumiyDomains = data.filter((d: any) => d.board_type === 'umumiy');
        const top1 = umumiyDomains.length > 0 ? Math.max(...umumiyDomains.map((d: any) => d.current_price || 0)) : 0;
        const top1InThousands = Math.floor(top1 / 1000);
        const minP = Math.max(5, top1InThousands + 1);
        setMinSponsorPrice(minP);
        if (parseInt(price, 10) < minP) {
          setPrice(minP.toString());
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!domain) {
      setDomainOk(false);
      setSubmitError('');
      return;
    }
    const check = setTimeout(() => {
      setDomainOk(LINK_RE.test(domain));
    }, 500);
    return () => clearTimeout(check);
  }, [domain]);

  const priceNum = parseInt(price, 10) || 0;
  const priceOk = priceNum >= minSponsorPrice;
  const valid = domainOk && priceOk && desc.trim().length > 0 && cat !== '';
  
  let warning = submitError;
  if (!warning && domain && !domainOk) {
    warning = "Iltimos, to'g'ri havola kiriting (masalan, t.me/kanal_nomi).";
  }

  const handleSubmit = async () => {
    if (!valid) return;
    
    const userStr = localStorage.getItem('top3_user');
    if (!userStr) {
      localStorage.setItem('pending_sponsor_data', JSON.stringify({
        domain, price, desc, cat
      }));
      login();
      return;
    }
    const user = JSON.parse(userStr);
    await executeSubmit(user);
  };

  const executeSubmit = async (user: any) => {
    setLoading(true);
    setSubmitError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/api/domains/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString(),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: domain.match(/^https?:\/\//i) ? domain : `https://${domain}`,
          board_type: 'umumiy',
          price: priceNum * 1000,
          description: desc,
          category: cat,
          user_id: user.id,
          is_sponsored: true
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
        throw new Error('Failed to create sponsor domain');
      }
      
      const domainRes = await res.json();

      const payRes = await fetch(`${backendUrl}/api/payments/init`, {
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
      
      toast.success("Sponsor muvaffaqiyatli qo'shildi!");
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch(err: any) {
      console.error(err);
      setSubmitError(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center py-10 w-full">
      <div className="w-full max-w-2xl bg-slate-800 rounded-2xl p-8 border border-amber-500/30 shadow-xl shadow-amber-900/20">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-6 text-center">Sponsor O'rni Xarid Qilish</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">
          Sponsorlar barcha bo'limlardan tepada, ajralib turadigan karuselda joylashadi. Sayt, telegram kanal yoki istalgan havolani qo'shishingiz mumkin.
        </p>

        <div className="flex flex-col gap-6">
          {/* DOMAIN INPUT */}
          <div>
            <label className="block text-amber-100/70 font-medium mb-2">To'liq havola</label>
            <div className="h-14 relative flex items-center bg-slate-900 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-500 border border-slate-700">
              <input 
                type="text" 
                value={domain} 
                onChange={e => setDomain(cleanDomainName(e.target.value))} 
                placeholder="masalan: t.me/kitob"
                className="w-full h-full bg-transparent outline-none px-4 text-white placeholder-slate-500 font-medium" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-amber-100/70 font-medium mb-2">SEO Tavsif</label>
              <input 
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Qisqacha tavsif (Max 55 belgi)"
                maxLength={55}
                className="w-full h-14 bg-slate-900 rounded-xl border border-slate-700 px-4 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-amber-100/70 font-medium mb-2">Kategoriya</label>
              <select 
                value={cat} 
                onChange={e => setCat(e.target.value)}
                className="w-full h-14 bg-slate-900 rounded-xl border border-slate-700 px-4 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Kategoriya tanlang...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-amber-100/70 font-medium mb-2">Narx</label>
            <div className="w-full h-14 relative flex flex-row items-center bg-slate-900 rounded-xl border border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-amber-500 transition-shadow text-white font-mono text-lg font-bold">
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

          <button 
            disabled={!valid || loading}
            onClick={handleSubmit}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-black text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-amber-500/20"
          >
            {loading ? "Kuting..." : "Xarid qilish"}
          </button>

          {warning && (
            <div className={`warn-box show !static !mt-0 w-full text-center rounded-xl`}>
              ⚠ {warning}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
