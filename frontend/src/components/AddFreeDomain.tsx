import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';
import { categories } from './Categories';
import { useAuthStore } from '../store/useAuthStore';

const SUBDOMAIN_RE = /^[a-z0-9-]+$/i;

const cleanDomainName = (val: string) => {
  let cleaned = val.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.split(/[/?#]/)[0];
  cleaned = cleaned.split('.')[0];
  cleaned = cleaned.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  return cleaned;
};

export const AddFreeDomain = () => {
  const [domain, setDomain] = useState('');
  
  const [cat, setCat] = useState('—');
  const [desc, setDesc] = useState('—');
  const [fetching, setFetching] = useState(false);
  const [domainOk, setDomainOk] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [redirectWarning, setRedirectWarning] = useState('');
  const [uzRedirectData, setUzRedirectData] = useState<{has: boolean, variant: string}>({has: false, variant: ''});
  const [loading, setLoading] = useState(false);

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
      const pendingStr = localStorage.getItem('pending_free_domain_data');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          setDomain(pending.domain);
          localStorage.removeItem('pending_free_domain_data');
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
      setSubmitError('');
      setCat('—');
      setDesc('—');
      return;
    }
    setSubmitError('');
    const check = setTimeout(async () => {
      setFetching(true);
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
          const res = await fetch(`http://localhost:8000/api/seo/fetch?domain=${target}`, { headers });
          if (!res.ok) throw new Error('API error');
          const data = await res.json();
          setCat(data.category || 'Boshqa');
          setDesc((data.description === "Ma'lumot topilmadi" || !data.description) ? "Sayt tavsifi kiritilmagan" : data.description);
          setUzRedirectData({
            has: data.has_uz_redirect || false,
            variant: data.uz_variant || ''
          });
          
          if (data.is_redirected) {
            setRedirectWarning("Bu domen boshqa manzilga yo'naltirilmoqda (Redirect). Redirect qilinadigan domenlarni bepul qo'shish mumkin emas. Iltimos pullik tarifdan foydalaning.");
          } else {
            setRedirectWarning('');
          }
        } catch (err) {
          console.error(err);
          setCat('Boshqa');
          setDesc('Sayt tavsifi kiritilmagan');
        }
      } else {
        setCat('—');
        setDesc('—');
      }
      setFetching(false);
    }, 700);

    return () => clearTimeout(check);
  }, [domain]);

  const valid = domainOk && !fetching && !redirectWarning;
  
  let warning = submitError || redirectWarning;

  const handleSubmit = async () => {
    if (!valid) return;
    
    const userStr = localStorage.getItem('top3_user');
    if (!userStr) {
      localStorage.setItem('pending_free_domain_data', JSON.stringify({ domain }));
      login();
      return;
    }
    const user = JSON.parse(userStr);
    await executeSubmit(user);
  };

  const executeSubmit = async (user: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/domains/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString(),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: domain + '.uz',
          board_type: 'ochiq',
          price: 0,
          description: desc !== '—' ? desc : undefined,
          category: cat !== '—' ? cat : undefined,
          user_id: user.id,
          is_sponsored: false
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
      
      toast.success("Muvaffaqiyatli qo'shildi!");
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch(err: any) {
      console.error(err);
      if (err.message === 'REDIRECT_NOT_ALLOWED_FOR_FREE') {
        setSubmitError("Bu domen boshqa manzilga yo'naltirilmoqda. Iltimos Asosiy sahifadan pullik tarif orqali qo'shing.");
      } else if (err.message && err.message !== 'Failed to create domain') {
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
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Bepul domen qo'shish</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">
          Faqat .uz domenlarni bepul (Ochiq) bo'limga qo'shishingiz mumkin. Kategoriya va tavsif avtomatik olinadi.
        </p>

        <div className="flex flex-col gap-6">
          {/* DOMAIN INPUT */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">Sayt URL</label>
            <div className="h-14 relative flex items-center bg-slate-900 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 border border-slate-700">
              <input 
                type="text" 
                value={domain} 
                onChange={e => setDomain(cleanDomainName(e.target.value))} 
                placeholder="Sayt nomi (masalan: kitob)"
                className="w-full h-full bg-transparent outline-none px-4 text-white placeholder-slate-500 font-medium" 
              />
              <div className="px-4 text-slate-400 font-bold bg-slate-900 h-full flex items-center border-l border-slate-700">.uz</div>
            </div>
          </div>

          {/* SEO OVERRIDE */}
          {domainOk && !fetching && desc !== '—' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-2">SEO Tavsif (Faqat o'qish uchun)</label>
                <input 
                  type="text"
                  value={desc}
                  readOnly={true}
                  className="w-full h-14 bg-slate-900/50 rounded-xl border border-slate-700/50 px-4 text-slate-400 focus:outline-none cursor-not-allowed"
                  title={desc}
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-2">SEO Kategoriya</label>
                <select 
                  value={cat} 
                  disabled={true}
                  onChange={e => setCat(e.target.value)}
                  className="w-full h-14 bg-slate-900/50 rounded-xl border border-slate-700/50 px-4 text-slate-400 focus:outline-none cursor-not-allowed appearance-none"
                >
                  <option value={cat}>{cat}</option>
                </select>
              </div>
            </div>
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
    </section>
  );
};
