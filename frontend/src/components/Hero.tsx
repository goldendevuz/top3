import { useEffect, useState } from 'react';
import LiveAnalytics from './LiveAnalytics';

const Hero = () => {
  const [stats, setStats] = useState({
    active_domains: 0,
    total_clicks: 0,
    today_payments: 0
  });

  useEffect(() => {
    fetch('http://localhost:8000/api/domains/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(e => console.error(e));
  }, []);

  const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="flex flex-col items-center text-center">
          <LiveAnalytics />
          <span className="eyebrow"><span className="dot"></span> .uz saytlari uchun reyting</span>
          <h1>Pul to'lang — <em>tepaga</em> chiqing.<br/>O'zbekistonning har bir sayti bitta ro'yxatda.</h1>
          <p className="lead">Top3 — .uz domenlaridagi saytlar uchun ochiq reyting: doimiy "Umumiy" taxta, faqat bugungi kun uchun sotib olinadigan "Bugun" o'rinlar va har kim SEO ma'lumotlari bilan avtomatik qo'sha oladigan ochiq ro'yxat.</p>
          <div className="hero-cta">
            <a href="#add" className="btn btn-primary">Saytingizni qo'shish</a>
            <a href="#board" className="btn btn-ghost">Reytingni ko'rish</a>
          </div>
          <div className="stat-row">
            <div className="stat"><b className="counter">{fmt(stats.active_domains)}</b><span>Ro'yxatdagi saytlar</span></div>
            <div className="stat"><b className="counter">{fmt(stats.total_clicks)}</b><span>Jami o'tishlar</span></div>
            <div className="stat"><b className="counter">{fmt(stats.today_payments)}</b><span>Bugungi to'lovlar (so'm)</span></div>
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
