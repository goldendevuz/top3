import React, { useState, useEffect } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';

const backendUrl = import.meta.env.VITE_API_URL || '';
const DOMAIN_RE = /^[a-zA-Z0-9-]+$/;

const QuickBoost = () => {
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState('5000');
  const [loading, setLoading] = useState(false);
  
  const { domains } = useBoardStore();

  const [userTouchedPrice, setUserTouchedPrice] = useState(false);

  const [initialPriceSet, setInitialPriceSet] = useState(false);

  useEffect(() => {
    if (domains.length > 0 && !initialPriceSet) {
      const highest = domains
        .filter(d => d.type === 'umumiy' && d.isPaid)
        .reduce((max, d) => Math.max(max, d.price || 0), 0);
      setPrice((highest >= 1000 ? highest + 1000 : 1000).toString());
      setInitialPriceSet(true);
    }
  }, [domains, initialPriceSet]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post(`${backendUrl}/api/auth/google`, {
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
      const pendingStr = localStorage.getItem('pending_quickboost_data');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          if (pending.domain) setDomain(pending.domain);
          // Do not restore price, let the highest price logic take over
          localStorage.removeItem('pending_quickboost_data');
        } catch (e) {}
      }
    }
  }, []);

  const domainOk = DOMAIN_RE.test(domain);
  const priceNum = parseInt(price, 10) || 0;
  const priceOk = priceNum >= 1000 && priceNum % 1000 === 0;

  const valid = domainOk && priceOk;

  let warning = '';
  if (domain && !domainOk) warning = 'Faqat .uz domensiz qismini kiriting (masalan: kun)';
  else if (price && !priceOk) warning = 'Narx 1000 so\'mga karrali bo\'lishi shart';

  // Calculate estimated rank
  const paidDomains = domains.filter(d => d.type === 'umumiy' && d.isPaid).sort((a, b) => (b.price || 0) - (a.price || 0));
  let estimatedRank = 1;
  for (let i = 0; i < paidDomains.length; i++) {
    if (priceNum >= (paidDomains[i].price || 0)) {
      break;
    }
    estimatedRank++;
  }

  const handleBuy = async () => {
    const isValid = /^[a-zA-Z0-9-]+$/.test(domain);
    if (!isValid) {
      toast.error("Iltimos, faqat bitta so'z kiriting (probel va nuqtasiz)!");
      setLoading(false);
      return;
    }
    
    if (!valid) return;
    
    const userStr = localStorage.getItem('top3_user');
    if (!userStr) {
      localStorage.setItem('pending_quickboost_data', JSON.stringify({
        domain, price
      }));
      login();
      return;
    }
    const user = JSON.parse(userStr);

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/domains/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString()
        },
        body: JSON.stringify({
          name: `${domain}.uz`,
          board_type: "umumiy",
          price: priceNum,
          description: "Top3 QuickBoost orqali qo'shilgan domen",
          category: "Boshqa",
          user_id: user.id
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (res.status === 400 && errorData && errorData.detail) {
          throw new Error(errorData.detail);
        }
        throw new Error('Domen yaratishda xatolik');
      }
      const data = await res.json();
      
      // Pay
      const payRes = await fetch(`${backendUrl}/api/payments/init`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString()
        },
        body: JSON.stringify({
          domain_id: data.id,
          amount: priceNum,
          user_id: user.id
        })
      });
      if (!payRes.ok) throw new Error("To'lovni shakllantirishda xatolik");
      const payData = await payRes.json();
      
      if (payData.pay_url) {
        window.location.href = payData.pay_url;
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Sayt mavjud emas yoki ishlamayapti";
      toast.error(errMsg, {
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #f87171'
        }
      });
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (/\s/.test(value) || !/^[a-zA-Z0-9-]*$/.test(value)) {
      toast.error("Faqat bitta so'z yozing! Probel taqiqlangan.");
      setDomain("");
      return;
    }
    
    setDomain(value.toLowerCase());
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value);
    setUserTouchedPrice(true);
  };

  const formatNum = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const STEP = 1000;
  const minPrice = 1000;
  const maxAbove = paidDomains.length > 0 ? (paidDomains[0].price || 0) + STEP * 5 : STEP * 10;

  return (
    <section id="quickboost" style={{ paddingBlock: '0 8px' }}>
      <div className="wrap">
        <div className="board reveal in" style={{ padding: '24px 28px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>

          {/* Dynamic headline - rank changes as price changes */}
          <h2 className="text-2xl sm:text-3xl mb-6 text-white" style={{ fontWeight: '800' }}>
            {estimatedRank === 1 ? (
              <><span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent font-extrabold tracking-tight">{estimatedRank}-o'rinni</span>{' '}<span className="text-emerald-400">{formatNum(priceNum)} so'm</span>ga band qiling!</>
            ) : (
              <><span className="text-indigo-400 font-extrabold tracking-tight">{estimatedRank}-o'rinni</span>{' '}<span className="text-white">{formatNum(priceNum)} so'm</span>ga band qiling!</>
            )}
          </h2>

          {/* Rank calculator hint */}
          <p className="text-xs text-zinc-500 mb-4">
            Narxni oshiring — o'rningiz ko'tariladi. {paidDomains.length > 0 ? `Hozirda ${paidDomains.length} ta pullik sayt bor.` : 'Hali pullik saytlar yo\'q — 1-o\'rinni oling!'}
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Domain input */}
            <div className="field" style={{ flex: 1.4, minWidth: '180px', margin: 0 }}>
              <label htmlFor="boostDom" className="text-sm text-zinc-400 mb-2 block">Domeningiz</label>
              <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-2)' }}>
                <input id="boostDom" type="text" placeholder="masalan: mohirdev"
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 12px', fontSize: '15px', color: 'white', outline: 'none', minWidth: 0 }}
                  value={domain} onChange={handleDomainChange}
                />
                <span style={{ padding: '10px 12px', color: 'var(--muted)', fontWeight: 700, fontFamily: "'IBM Plex Mono'", borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>.uz</span>
              </div>
            </div>

            {/* Price stepper calculator */}
            <div className="field" style={{ minWidth: '180px', margin: 0 }}>
              <label className="text-sm text-zinc-400 mb-2 block">Narx (so'm) — o'rni: <span className={`font-bold ${estimatedRank === 1 ? 'text-yellow-400' : 'text-indigo-400'}`}>{estimatedRank}-o'rin</span></label>
              <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-2)' }}>
                <button
                  type="button"
                  onClick={() => setPrice(p => Math.max(minPrice, (parseInt(p)||0) - STEP).toString())}
                  style={{ padding: '10px 14px', fontSize: '20px', color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                >−</button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: 'white', fontVariantNumeric: 'tabular-nums' }}>
                  {formatNum(priceNum)}
                </div>
                <button
                  type="button"
                  onClick={() => setPrice(p => ((parseInt(p)||0) + STEP).toString())}
                  style={{ padding: '10px 14px', fontSize: '20px', color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                >+</button>
              </div>
            </div>

            <button className="btn btn-primary" id="boostBuyBtn" disabled={!valid || loading} onClick={handleBuy} style={{ height: '44px', padding: '0 24px', fontSize: '15px', fontWeight: 'bold' }}>
              {loading ? 'Kutib turing...' : 'Xarid qilish'}
            </button>
          </div>

          <div className={`warn-box ${warning ? 'show' : ''}`} id="boostWarn" style={{ marginTop: '12px' }}>⚠ <span id="boostWarnText">{warning}</span></div>
        </div>
      </div>
    </section>
  );
};

export default QuickBoost;
