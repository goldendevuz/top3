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
  
  const top3Data = [...organicPaid, ...organicFree].slice(0, 3);
  const top3 = top3Data;
  
  const dailyPaid = domains
    .filter((d: any) => d.type === 'bugun' && d.isPaid && !d.is_sponsored)
    .sort((a: any, b: any) => (b.price || 0) - (a.price || 0));
  const dailyFree = domains
    .filter((d: any) => (!d.isPaid && !d.is_sponsored) && (d.type === 'bugun'))
    .sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0) || a.addedAt - b.addedAt);
  
  const top3DailyData = [...dailyPaid, ...dailyFree].slice(0, 3);
  const top3Daily = top3DailyData;


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

          <h1 className="text-4xl sm:text-5xl lg:text-5xl font-black text-white" style={{ marginTop: '0', textAlign: 'left', lineHeight: '1.15' }}>
            Pul to'lang — <em className="text-indigo-400 not-italic">tepaga</em> chiqing.<br/><span className="text-3xl sm:text-4xl text-slate-300">O'zbekistonning har bir sayti bitta ro'yxatda.</span>
          </h1>
          <p className="lead text-base sm:text-lg text-slate-400" style={{ textAlign: 'left', maxWidth: '580px', marginTop: '16px', lineHeight: '1.5' }}>
            Top3 — .uz domenlaridagi saytlar uchun ochiq reyting: doimiy "Umumiy" taxta, faqat bugungi kun uchun sotib olinadigan "Bugun" o'rinlar va har kim avtomatik qo'sha oladigan ro'yxat.
          </p>
          <div className="hero-cta w-full justify-start mt-6 flex flex-wrap gap-4">
            <a href="#add" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-colors" style={{ padding: '12px 24px', fontSize: '15px' }}>Saytingizni qo'shish</a>
            <a href="#board" className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-full transition-colors" style={{ padding: '12px 24px', fontSize: '15px' }}>Reytingni ko'rish</a>
          </div>
          <div className="w-full flex flex-wrap justify-start gap-6 sm:gap-10 mt-8 pt-6 border-t border-white/10">
            <div className="flex flex-col items-start">
              <b className="text-2xl sm:text-3xl font-black text-white">{fmt(stats.active_domains)}</b>
              <span className="text-xs uppercase tracking-widest text-indigo-300/80 mt-1">Ro'yxatdagi saytlar</span>
            </div>
            <div className="flex flex-col items-start">
              <b className="text-2xl sm:text-3xl font-black text-white">{fmt(stats.total_clicks)}</b>
              <span className="text-xs uppercase tracking-widest text-indigo-300/80 mt-1">Jami o'tishlar</span>
            </div>
            <div className="flex flex-col items-start">
              <b className="text-2xl sm:text-3xl font-black text-emerald-400">{fmt(stats.today_payments)}</b>
              <span className="text-xs uppercase tracking-widest text-emerald-400/80 mt-1">Bugungi to'lovlar (so'm)</span>
            </div>
          </div>
        </div>

        <div className="hero-card grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-4 p-4 sm:p-5">
          <div>
            <div className="hero-card-top flex flex-col justify-between items-start gap-2 mb-3 h-[24px]">
              <span className="tt flex items-center gap-2">Umumiy top 3</span>
            </div>
            <div id="heroMini">
              {top3.map((d, i) => {
                const rClass = i === 0 ? 'r1' : i === 1 ? 'r2' : 'r3';
                const w = i === 0 ? '100%' : i === 1 ? '70%' : '50%';
                const val = fmt(d.clicks || 0);
                return (
                  <div className="flex items-center gap-3 w-full mb-3" key={d.id || i}>
                    <div className={`w-4 shrink-0 font-bold text-center ${rClass === 'r1' ? 'text-amber-500' : rClass === 'r2' ? 'text-slate-300' : 'text-amber-700'}`}>{i + 1}</div>
                    <div className="w-24 truncate font-medium text-white">{cleanUrlDisplay(d.dom)}</div>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800/50 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: w }}></div></div>
                    <div className="text-right whitespace-nowrap shrink-0 text-[13px] font-mono opacity-80">{val}</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="border-t sm:border-t-0 sm:border-l border-white/5 pt-5 sm:pt-0 sm:pl-4">
            <div className="hero-card-top flex flex-col justify-between items-start gap-2 mb-3 h-[24px]">
              <span className="tt flex items-center gap-2 text-indigo-300">Bugungi top 3</span>
            </div>
            <div id="heroMiniDaily">
              {top3Daily.map((d, i) => {
                const rClass = i === 0 ? 'r1' : i === 1 ? 'r2' : 'r3';
                const w = i === 0 ? '100%' : i === 1 ? '70%' : '50%';
                const val = fmt(d.clicks || 0);
                return (
                  <div className="flex items-center gap-3 w-full mb-3" key={d.id || i}>
                    <div className={`w-4 shrink-0 font-bold text-center ${rClass === 'r1' ? 'text-indigo-400' : rClass === 'r2' ? 'text-slate-300' : 'text-indigo-800'}`}>{i + 1}</div>
                    <div className="w-24 truncate font-medium text-white">{cleanUrlDisplay(d.dom)}</div>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800/50 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: w }}></div></div>
                    <div className="text-right whitespace-nowrap shrink-0 text-[13px] font-mono text-indigo-200/80">{val}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
