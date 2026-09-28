import { useEffect, useState } from 'react';
import LiveAnalytics from './LiveAnalytics';
import { useBoardStore } from '../store/useBoardStore';

const cleanUrlDisplay = (url: string) => {
  if (!url) return "";
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./i, '');
  } catch (e) {
    return url;
  }
};

const Hero = () => {
  const [stats, setStats] = useState({
    active_domains: 0,
    total_clicks: 0,
    today_payments: 0
  });

  const { domains } = useBoardStore();
  
  const organicPaid = domains
    .filter((d: any) => d.type === 'umumiy' && d.isPaid && !d.is_sponsored)
    .sort((a: any, b: any) => (b.price || 0) - (a.price || 0));
  const organicFree = domains
    .filter((d: any) => (!d.isPaid && !d.is_sponsored) && (d.type === 'umumiy' || d.type === 'ochiq'))
    .sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0) || a.addedAt - b.addedAt);
  
  const top3 = [...organicPaid, ...organicFree].slice(0, 3);

  useEffect(() => {
    fetch('/api/domains/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(e => console.error(e));
  }, []);

  const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="flex flex-col items-start text-left">

          <h1 style={{ marginTop: '32px', textAlign: 'left', lineHeight: '1.15' }}>
            Pul to'lang — <em>tepaga</em> chiqing.<br/>O'zbekistonning har bir sayti bitta ro'yxatda.
          </h1>
          <p className="lead" style={{ textAlign: 'left', maxWidth: '580px', marginTop: '20px', color: 'var(--muted)', fontSize: '1.1rem', lineHeight: '1.6' }}>
            Top3 — .uz domenlaridagi saytlar uchun ochiq reyting: doimiy "Umumiy" taxta, faqat bugungi kun uchun sotib olinadigan "Bugun" o'rinlar va har kim SEO ma'lumotlari bilan avtomatik qo'sha oladigan ochiq ro'yxat.
          </p>
          <div className="hero-cta w-full justify-start mt-8">
            <a href="#add" className="btn btn-primary" style={{ padding: '16px 28px', fontSize: '15px' }}>Saytingizni qo'shish</a>
            <a href="#board" className="btn btn-ghost" style={{ padding: '16px 28px', fontSize: '15px' }}>Reytingni ko'rish</a>
          </div>
          <div className="stat-row w-full justify-start mt-10" style={{ gap: '40px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="stat" style={{ alignItems: 'flex-start' }}><b className="counter text-white">{fmt(stats.active_domains)}</b><span style={{ color: 'var(--muted)' }}>Ro'yxatdagi saytlar</span></div>
            <div className="stat" style={{ alignItems: 'flex-start' }}><b className="counter text-white">{fmt(stats.total_clicks)}</b><span style={{ color: 'var(--muted)' }}>Jami o'tishlar</span></div>
            <div className="stat" style={{ alignItems: 'flex-start' }}><b className="counter text-white">{fmt(stats.today_payments)}</b><span style={{ color: 'var(--muted)' }}>Bugungi to'lovlar (so'm)</span></div>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-top flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex flex-col">
              <span className="tt flex items-center gap-2">Umumiy taxta — jonli <span className="live-pill" style={{ position: 'static', transform: 'none', marginLeft: '4px' }}><span className="dot"></span>LIVE</span></span>
              <div className="mt-1">
                <LiveAnalytics />
              </div>
            </div>
          </div>
          <div id="heroMini">
            {top3.length > 0 ? top3.map((d, i) => {
              const rClass = i === 0 ? 'r1' : i === 1 ? 'r2' : 'r3';
              const w = i === 0 ? '100%' : i === 1 ? '70%' : '50%';
              return (
                <div className="mini-row" key={d.id || i}>
                  <div className={`mini-rank ${rClass}`}>{i + 1}</div>
                  <div className="mini-dom">{cleanUrlDisplay(d.dom)}</div>
                  <div className="mini-bar-wrap"><div className="mini-bar" style={{ width: w }}></div></div>
                </div>
              );
            }) : (
              [1, 2, 3].map((i) => (
                <div className="mini-row opacity-50 animate-pulse" key={i}>
                  <div className={`mini-rank r${i}`}>{i}</div>
                  <div className="mini-dom bg-slate-700/50 rounded text-transparent h-4 w-24">yuklanmoqda...</div>
                  <div className="mini-bar-wrap"><div className="mini-bar" style={{ width: i === 1 ? '100%' : i === 2 ? '70%' : '50%' }}></div></div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
