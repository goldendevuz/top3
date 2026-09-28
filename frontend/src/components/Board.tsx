import { useState, useEffect, useCallback } from 'react';
import { useBoardStore, DomainItem } from '../store/useBoardStore';

const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const cleanUrlDisplay = (url: string) => {
  if (!url) return "";
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./i, '');
  } catch (e) {
    return url;
  }
};

const backendUrl = "";

/* ─── Domain Row (organic ranking card) ─── */
const DomainRow = ({ item, rank }: { item: DomainItem, rank: number }) => {
  const [pulseActive, setPulseActive] = useState(true);
  const [localClicks, setLocalClicks] = useState(item.clicks || 0);

  useEffect(() => {
    setLocalClicks(prev => Math.max(item.clicks || 0, prev));
  }, [item.clicks]);

  useEffect(() => {
    const t = setTimeout(() => setPulseActive(false), 4000);
    return () => clearTimeout(t);
  }, []);

  let rankColor = "text-slate-500/50";
  if (rank === 1) rankColor = "text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]";
  else if (rank === 2) rankColor = "text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.5)]";
  else if (rank === 3) rankColor = "text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]";

  const buildUtmUrl = (domain: string) => {
    const base = domain.startsWith('http') ? domain : `https://${domain}`;
    const params = `utm_source=top3.uz&utm_medium=directory&utm_campaign=top3_referral`;
    return base.includes('?') ? `${base}&${params}` : `${base}?${params}`;
  };

  const handleLinkClick = (id: number) => {
    const clickedKey = `clicked_${id}`;
    if (sessionStorage.getItem(clickedKey)) return;
    sessionStorage.setItem(clickedKey, 'true');

    setLocalClicks(prev => prev + 1);
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    fetch(`${backendUrl}/api/domains/${id}/click`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId })
    }).catch(() => {});
  };

  return (
    <a 
      href={buildUtmUrl(item.dom)} 
      target="_blank" 
      rel="noopener noreferrer dofollow"
      onClick={() => handleLinkClick(item.id!)}
      className="group relative flex items-center justify-between p-4 sm:p-5 mb-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/80 hover:border-indigo-500/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <div className="flex items-center gap-4 sm:gap-5 relative z-10 min-w-0">
        <div className={`text-3xl sm:text-4xl font-black italic min-w-[2.5rem] sm:min-w-[3.5rem] text-center ${rankColor}`}>
          #{rank}
        </div>
        
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/5 border border-white/10 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-300">
            <img 
              src={`https://www.google.com/s2/favicons?domain=${cleanUrlDisplay(item.dom)}&sz=64`} 
              alt="favicon" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">{cleanUrlDisplay(item.dom)}</h3>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700/50 truncate max-w-[130px]">{item.cat || "Boshqa"}</span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[150px] sm:max-w-md">{item.desc}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 pl-2 sm:pl-4 relative z-10">
        {/* Stats: price + clicks */}
        <div className="flex flex-col items-end">
          {item.price ? (
            <>
              <span className="text-base sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-500">
                {fmt(item.price)}
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-widest">so'm</span>
            </>
          ) : null}
          <span className="text-xs text-slate-400 mt-0.5">
            {fmt(localClicks)} <span className="text-slate-500">o'tish</span>
          </span>
        </div>
        
        {/* Visit button */}
        <div className={`hidden sm:flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          pulseActive 
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' 
            : 'bg-slate-700/50 text-slate-300 border border-slate-600/50 group-hover:bg-amber-500/20 group-hover:text-amber-300 group-hover:border-amber-500/40'
        }`}>
          O'tish →
        </div>
      </div>
    </a>
  );
};

/* ─── Sponsor Carousel (VIP Native Ad between organic ranks) ─── */
const SponsorCarousel = ({ sponsors }: { sponsors: DomainItem[] }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const [clicksMap, setClicksMap] = useState<Record<number, number>>({});

  useEffect(() => {
    setClicksMap(prev => {
      const newMap = { ...prev };
      sponsors.forEach(s => {
        newMap[s.id!] = Math.max(s.clicks || 0, newMap[s.id!] || 0);
      });
      return newMap;
    });
  }, [sponsors]);

  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % sponsors.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [sponsors.length]);

  if (sponsors.length === 0) return null;
  const s = sponsors[currentIdx];

  const handleSponsorClick = () => {
    const clickedKey = `clicked_${s.id}`;
    if (sessionStorage.getItem(clickedKey)) return;
    sessionStorage.setItem(clickedKey, 'true');

    setClicksMap(prev => ({ ...prev, [s.id!]: (prev[s.id!] || 0) + 1 }));
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    fetch(`${backendUrl}/api/domains/${s.id}/click`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId })
    }).catch(() => {});
  };

  const base = s.dom.startsWith('http') ? s.dom : `https://${s.dom}`;
  const params = `utm_source=top3.uz&utm_medium=sponsor&utm_campaign=vip`;
  const sponsorUrl = s.custom_url || (base.includes('?') ? `${base}&${params}` : `${base}?${params}`);

  return (
    <div className="my-4 relative">
      {/* Label */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70">Homiy</span>
        <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent"></div>
        {sponsors.length > 1 && (
          <div className="flex gap-1">
            {sponsors.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentIdx ? 'bg-amber-400 w-4' : 'bg-slate-600'}`} />
            ))}
          </div>
        )}
      </div>

      <a 
        href={sponsorUrl}
        target="_blank"
        rel="noopener noreferrer dofollow"
        onClick={handleSponsorClick}
        className={`group relative flex items-center justify-between p-5 sm:p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-900/20 via-amber-800/10 to-purple-900/20 hover:border-amber-400/60 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)] hover:-translate-y-1 transition-all duration-500 backdrop-blur-sm overflow-hidden ${fade ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
        style={{ transition: 'opacity 0.3s, transform 0.3s' }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        <div className="flex items-center gap-4 sm:gap-5 relative z-10 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-amber-500/10 group-hover:scale-110 transition-transform duration-300">
            <img 
              src={`https://www.google.com/s2/favicons?domain=${cleanUrlDisplay(s.dom)}&sz=64`} 
              alt="sponsor" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg sm:text-xl font-bold text-amber-100 truncate">{cleanUrlDisplay(s.dom)}</h3>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-500/40">VIP</span>
            </div>
            <p className="text-sm text-amber-200/60 truncate max-w-[200px] sm:max-w-lg">{s.custom_description || s.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pl-4 relative z-10">
          <div className="flex flex-col items-end mr-2">
            <span className="text-xs text-amber-300/60">{fmt(clicksMap[s.id!] ?? (s.clicks || 0))} o'tish</span>
          </div>
          <div className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 text-sm font-black shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 group-hover:scale-105 transition-all duration-300 whitespace-nowrap">
            {s.custom_cta || "Tashrif buyurish"} →
          </div>
        </div>
      </a>
    </div>
  );
};

/* ─── CTA Native Ad Block ─── */
const SponsorCTA = () => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const addSection = document.getElementById('add');
    if (addSection) {
      addSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a 
      href="#add"
      onClick={handleClick}
      className="group relative flex items-center p-4 sm:p-5 mb-3 rounded-2xl bg-gradient-to-r from-indigo-900/20 via-violet-900/15 to-purple-900/20 border border-dashed border-indigo-500/30 hover:bg-indigo-900/30 hover:border-indigo-400/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className="flex items-center gap-4 relative z-10 w-full">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
          <span className="text-2xl">✨</span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-indigo-200 group-hover:text-indigo-100 truncate">Homiylik orqali shaxsiy havola va tugmaga ega bo'ling</h3>
          <p className="text-xs text-indigo-300/50 truncate max-w-[250px] sm:max-w-lg mt-0.5">VIP sponsor sifatida reytingda ajralib turing va maxsus CTA tugmangizni ko'rsating.</p>
        </div>
        <div className="hidden sm:flex shrink-0">
          <span className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all">Sponsor bo'lish</span>
        </div>
      </div>
    </a>
  );
};

/* ─── Newsletter Signup ─── */
const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const user = (() => {
    try {
      const s = localStorage.getItem('top3_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })();

  const handleSubscribe = () => {
    if (user || email.includes('@')) {
      setSubscribed(true);
    }
  };

  if (subscribed) {
    return (
      <div className="my-4 p-5 rounded-2xl bg-emerald-900/20 border border-emerald-500/30 text-center">
        <span className="text-emerald-300 font-semibold text-sm">✅ Obuna muvaffaqiyatli! Yangiliklar pochta orqali yuboriladi.</span>
      </div>
    );
  }

  return (
    <div className="my-4 p-5 rounded-2xl bg-slate-800/30 border border-slate-700/40 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-200 mb-1">📬 Top3 yangiliklari</h4>
          <p className="text-xs text-slate-400">Yangi saytlar va qiziqarli statistika — haftada bir marta.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!user && (
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@mail.com" 
              className="flex-1 sm:w-48 h-10 px-4 rounded-xl bg-slate-900/80 border border-slate-600/50 text-white text-sm outline-none focus:border-indigo-500/50 transition-colors"
            />
          )}
          <button 
            onClick={handleSubscribe}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all whitespace-nowrap"
          >
            Obuna bo'lish
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── CTA Card (bottom) ─── */
const CTACard = () => {
  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    const addSection = document.getElementById('add');
    if (addSection) {
      addSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <a 
      href="#add"
      onClick={scrollToTop}
      className="group relative flex items-center p-4 sm:p-5 mb-3 rounded-2xl bg-indigo-900/10 border-2 border-dashed border-indigo-500/30 hover:bg-indigo-900/30 hover:border-indigo-500/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden mt-4"
    >
      <div className="flex items-center gap-4 sm:gap-6 relative z-10 w-full">
        <div className="text-3xl sm:text-4xl font-black italic min-w-[2.5rem] sm:min-w-[3.5rem] text-center text-indigo-500/30 group-hover:text-indigo-400/50 transition-colors">
          #?
        </div>
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 text-indigo-400/70">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm sm:text-lg font-bold text-indigo-300 truncate group-hover:text-indigo-200">Sizning saytingiz shu yerda bo'lishi mumkin!</h3>
            <p className="text-xs text-indigo-200/60 truncate max-w-[200px] sm:max-w-md mt-0.5">Hoziroq joyingizni band qiling.</p>
          </div>
        </div>
        <div className="hidden sm:flex shrink-0 pl-4">
          <span className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/30 transition-all">Sayt qo'shish</span>
        </div>
      </div>
    </a>
  );
};

/* ─── Skeleton ─── */
const SkeletonRow = () => (
  <div className="flex items-center justify-between p-4 sm:p-5 mb-3 rounded-2xl bg-slate-800/20 border border-slate-700/30 animate-pulse">
    <div className="flex items-center gap-4 sm:gap-5">
      <div className="w-10 h-10 sm:w-14 sm:h-14 bg-slate-700/30 rounded-lg"></div>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-700/30"></div>
        <div className="flex flex-col gap-2">
          <div className="w-24 sm:w-32 h-4 bg-slate-700/30 rounded"></div>
          <div className="w-32 sm:w-48 h-3 bg-slate-700/30 rounded"></div>
        </div>
      </div>
    </div>
    <div className="flex flex-col items-end gap-2">
      <div className="w-16 sm:w-20 h-5 bg-slate-700/30 rounded"></div>
      <div className="w-8 sm:w-10 h-3 bg-slate-700/30 rounded"></div>
    </div>
  </div>
);

/* ─── BOARD (Main) ─── */
const Board = () => {
  const { domains } = useBoardStore();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    if(domains.length > 0) setLoading(false);
    return () => clearTimeout(t);
  }, [domains]);

  // Separate sponsors from organic
  const sponsors = domains
    .filter((d: DomainItem) => d.type === 'umumiy' && d.is_sponsored)
    .sort((a, b) => (b.price || 0) - (a.price || 0));

  // Organic = paid (non-sponsor) + free
  const organicPaid = domains
    .filter((d: DomainItem) => d.type === 'umumiy' && d.isPaid && !d.is_sponsored)
    .sort((a, b) => (b.price || 0) - (a.price || 0));
  const organicFree = domains
    .filter((d: DomainItem) => (!d.isPaid && !d.is_sponsored) && (d.type === 'umumiy' || d.type === 'ochiq'))
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || a.addedAt - b.addedAt);
  
  const organic = [...organicPaid, ...organicFree];

  // Build interleaved list
  const buildLeaderboard = useCallback(() => {
    const elements: JSX.Element[] = [];
    let rank = 0;

    organic.forEach((item, idx) => {
      rank++;

      // After rank 3, insert Sponsor Carousel
      if (rank === 4 && sponsors.length > 0) {
        elements.push(
          <div key="sponsor-carousel" className="animate-fadeInUp" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
            <SponsorCarousel sponsors={sponsors} />
          </div>
        );
      }

      // After rank 6, insert Sponsor CTA
      if (rank === 7) {
        elements.push(
          <div key="sponsor-cta" className="animate-fadeInUp" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <SponsorCTA />
          </div>
        );
      }

      elements.push(
        <div 
          key={item.id} 
          className="animate-fadeInUp"
          style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'both' }}
        >
          <DomainRow item={item} rank={rank} />
        </div>
      );
    });

    // If less than 4 organic but sponsors exist, show carousel after all
    if (organic.length < 4 && sponsors.length > 0) {
      elements.push(
        <div key="sponsor-carousel" className="animate-fadeInUp" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
          <SponsorCarousel sponsors={sponsors} />
        </div>
      );
    }

    // Newsletter after organic items
    if (organic.length > 0) {
      elements.push(
        <div key="newsletter" className="animate-fadeInUp" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
          <Newsletter />
        </div>
      );
    }

    return elements;
  }, [organic, sponsors]);

  return (
    <section id="board" className="py-10 md:py-16 relative w-full overflow-hidden">
      {/* Modern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0B0F19] to-[#05080f] -z-10"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex flex-col relative">
          {loading && (
            <>
              <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
            </>
          )}
          
          {!loading && organic.length === 0 && sponsors.length === 0 && (
            <div className="text-center py-20 text-slate-500 font-medium">
              Hozircha saytlar yo'q
            </div>
          )}
          
          {!loading && buildLeaderboard()}
          
          {!loading && <CTACard />}
        </div>
        
        {!loading && (organic.length > 0 || sponsors.length > 0) && (
          <div className="mt-6 text-center opacity-70">
            <span className="text-[10px] sm:text-xs text-slate-400 bg-slate-800/40 px-4 py-2 rounded-full border border-slate-700/30 backdrop-blur-sm shadow-inner">
              * Har bir "O'tish" — foydalanuvchi havolani ustiga bosganda hisoblanadi.
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default Board;
