import React, { useState, useEffect } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

import toast from 'react-hot-toast';

const DOMAIN_RE = /^[a-zA-Z0-9-]+$/;

const QuickBoost = () => {
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState('5000');
  const [loading, setLoading] = useState(false);
  
  const { domains } = useBoardStore();

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
      const pendingStr = localStorage.getItem('pending_quickboost_data');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          setDomain(pending.domain);
          setPrice(pending.price);
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
  else if (domainOk && !priceOk) warning = 'Narx 1000 so\'mga karrali bo\'lishi shart';

  // Calculate estimated rank
  let rankHint = '';
  if (valid) {
    const paidDomains = domains.filter(d => d.type === 'umumiy' && d.isPaid).sort((a, b) => (b.price || 0) - (a.price || 0));
    let estimatedRank = 1;
    for (let i = 0; i < paidDomains.length; i++) {
      if (priceNum > (paidDomains[i].price || 0)) {
        break;
      }
      estimatedRank++;
    }
    rankHint = `Siz "Umumiy" taxtada taxminan ${estimatedRank}-o'rinni egallaysiz.`;
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
      const res = await fetch('http://localhost:8000/api/domains/', {
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
      const payRes = await fetch('http://localhost:8000/api/payments/init', {
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

  return (
    <section id="quickboost" style={{ paddingBlock: '0 8px' }}>
      <div className="wrap">
        <div className="board reveal in" style={{ padding: '20px 22px' }}>
          <span className="live-preview-label" style={{ marginBottom: '14px' }}>Domeningizni yuqoriga olib chiqing</span>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1.4, minWidth: '180px', margin: 0 }}>
              <label htmlFor="boostDom">Domeningiz</label>
              <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-2)' }}>
                <input id="boostDom" type="text" placeholder="masalan: mohirdev" 
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 12px', fontSize: '14px', color: 'var(--ink)', outline: 'none', minWidth: 0 }}
                  value={domain} onChange={handleDomainChange}
                />
                <span style={{ padding: '10px 12px', color: 'var(--muted)', fontWeight: 700, fontFamily: "'IBM Plex Mono'", borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>.uz</span>
              </div>
            </div>
            <div className="field" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
              <label htmlFor="boostPrice">Narx (so'm)</label>
              <input id="boostPrice" type="number" min="1000" step="1000" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div style={{ flex: 1.6, minWidth: '200px', paddingBottom: '10px' }}>
              <span id="boostRankText" style={{ fontSize: '13px', color: 'var(--ink-soft)', fontWeight: 600 }}>{rankHint}</span>
            </div>
            <button className="btn btn-primary" id="boostBuyBtn" disabled={!valid || loading} onClick={handleBuy}>
              {loading ? 'Kutib turing...' : 'Xarid qilish'}
            </button>
          </div>
          <div className={`warn-box ${warning ? 'show' : ''}`} id="boostWarn">⚠ <span id="boostWarnText">{warning}</span></div>
        </div>
      </div>
    </section>
  );
};

export default QuickBoost;
