import { useEffect, useState } from 'react';
import LiveAnalytics from './LiveAnalytics';

const Hero = () => {
  const [stats, setStats] = useState({
    active_domains: 0,
    total_clicks: 0,
    today_payments: 0
  });

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
          <LiveAnalytics />
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
          <div className="hero-card-top">
            <span className="tt">Umumiy taxta — jonli</span>
            <span className="live-pill"><span className="dot"></span>LIVE</span>
          </div>
          <div id="heroMini">
            {/* Example mini rows from html */}
            <div className="mini-row">
              <div className="mini-rank r1">1</div>
              <div className="mini-dom">bozor.uz</div>
              <div className="mini-bar-wrap"><div className="mini-bar" style={{ width: '100%' }}></div></div>
            </div>
            <div className="mini-row">
              <div className="mini-rank r2">2</div>
              <div className="mini-dom">repetitor.uz</div>
              <div className="mini-bar-wrap"><div className="mini-bar" style={{ width: '70%' }}></div></div>
            </div>
            <div className="mini-row">
              <div className="mini-rank r3">3</div>
              <div className="mini-dom">dorixona.uz</div>
              <div className="mini-bar-wrap"><div className="mini-bar" style={{ width: '50%' }}></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
