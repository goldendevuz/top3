import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
      className="flex items-center justify-between p-4 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors rounded-xl mb-3"
    >
      {/* 1. CHAP QISM: Raqam, Logo va Matnlar */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className={`text-2xl sm:text-3xl font-black italic min-w-[2rem] sm:min-w-[2.5rem] text-center ${rankColor}`}>
          #{rank}
        </div>
        
        <img 
          src={`https://www.google.com/s2/favicons?domain=${cleanUrlDisplay(item.dom)}&sz=64`} 
          alt="favicon" 
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-800 border border-zinc-700 p-1.5 object-contain shrink-0"
        />
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base sm:text-lg font-bold text-white truncate">{cleanUrlDisplay(item.dom)}</h3>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 truncate">{item.cat || "Boshqa"}</span>
          </div>
          <p className="text-xs text-zinc-400 truncate max-w-[150px] sm:max-w-md">{item.desc}</p>
        </div>
      </div>

      {/* 2. O'NG QISM: Narx/Statistika va Tugma */}
      <div className="flex items-center gap-4 shrink-0 pl-2">
        <div className="flex flex-col items-end">
          {item.price ? (
            <>
              <span className="text-base sm:text-lg font-black text-white">
                {fmt(item.price)}
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">so'm</span>
            </>
          ) : null}
          <span className="text-xs text-zinc-400 mt-0.5">
            {fmt(localClicks)} <span className="text-zinc-500">o'tish</span>
          </span>
        </div>
        
        <div className={`hidden sm:flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
          pulseActive 
            ? 'bg-zinc-800 text-amber-300 border border-amber-500/30 animate-pulse' 
            : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
        }`}>
          O'tish →
        </div>
      </div>
    </a>
  );
};

/* ─── Sponsor Row (VIP Native Ad / Banner) ─── */
export const SponsorRow = ({ sponsors, startIndex = 0 }: { sponsors: DomainItem[], startIndex?: number }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex % Math.max(1, sponsors.length));

  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sponsors.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [sponsors.length]);

  const sponsor = sponsors[currentIndex];
  const [clicksMap, setClicksMap] = useState<Record<number, number>>({});

  useEffect(() => {
    if (sponsor) {
      setClicksMap(prev => ({ ...prev, [sponsor.id!]: Math.max(sponsor.clicks || 0, prev[sponsor.id!] || 0) }));
    }
  }, [sponsor]);

  if (!sponsor) return null;

  const handleSponsorClick = () => {
    const clickedKey = `clicked_${sponsor.id}`;
    if (sessionStorage.getItem(clickedKey)) return;
    sessionStorage.setItem(clickedKey, 'true');

    setClicksMap(prev => ({ ...prev, [sponsor.id!]: (prev[sponsor.id!] || 0) + 1 }));
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    fetch(`${backendUrl}/api/domains/${sponsor.id}/click`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId })
    }).catch(() => {});
  };

  const base = sponsor.dom.startsWith('http') ? sponsor.dom : `https://${sponsor.dom}`;
  const params = `utm_source=top3.uz&utm_medium=sponsor&utm_campaign=vip`;
  const sponsorUrl = sponsor.custom_url || (base.includes('?') ? `${base}&${params}` : `${base}?${params}`);

  return (
    <div className="my-4 relative group">
      {/* Label */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70">Homiy</span>
        <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent"></div>
      </div>

      <a 
        key={sponsor.id}
        href={sponsorUrl}
        target="_blank"
        rel="noopener noreferrer dofollow"
        onClick={handleSponsorClick}
        className={`block rounded-xl border border-amber-500/50 bg-amber-900/10 hover:bg-amber-900/20 transition-all overflow-hidden mb-3 shadow-lg hover:shadow-amber-900/20 sponsor-animate relative overflow-hidden group/vip`}
      >
        {/* Shiny sweep effect */}
        <div className="absolute inset-0 -translate-x-full group-hover/vip:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10 pointer-events-none"></div>

        {sponsor.custom_banner ? (
          // BIG BANNER AD (PRODUCTHUNT STYLE)
          <div className="relative w-full aspect-[21/9] sm:aspect-[4/1] bg-slate-900 group-hover:opacity-95 transition-opacity">
            <img 
              src={sponsor.custom_banner} 
              alt={cleanUrlDisplay(sponsor.dom)} 
              className="w-full h-full object-cover"
            />
            {sponsor.custom_cta && (
              <div className="absolute bottom-4 right-4 hidden sm:flex bg-amber-500 text-amber-950 rounded-lg px-6 py-2 text-sm font-bold shadow-lg shadow-black/50 hover:bg-amber-400 hover:scale-105 transition-all">
                {sponsor.custom_cta}
              </div>
            )}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded border border-white/10 flex items-center gap-2">
               <img src={`https://www.google.com/s2/favicons?domain=${cleanUrlDisplay(sponsor.dom)}&sz=32`} className="w-4 h-4" />
               <span className="text-white text-xs font-bold">{cleanUrlDisplay(sponsor.dom)}</span>
            </div>
          </div>
        ) : (
          // STANDARD AD
          <div className="flex items-center justify-between p-4">
            {/* 1. CHAP QISM: Logo va Matn */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <img 
                src={`https://www.google.com/s2/favicons?domain=${cleanUrlDisplay(sponsor.dom)}&sz=64`} 
                alt="sponsor" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 p-1.5 object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-base sm:text-lg font-bold text-amber-100 truncate">{cleanUrlDisplay(sponsor.dom)}</h3>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 truncate">VIP</span>
                </div>
                <p className="text-xs text-amber-200/70 truncate max-w-[150px] sm:max-w-md">{sponsor.custom_description || sponsor.desc}</p>
              </div>
            </div>

            {/* 2. O'NG QISM: Statistika va Tugma */}
            <div className="flex items-center gap-4 shrink-0 pl-2">
              <div className="flex flex-col items-end">
                <span className="text-xs text-amber-300/60 mt-0.5">
                  {fmt(clicksMap[sponsor.id!] ?? (sponsor.clicks || 0))} <span className="text-amber-500/50">o'tish</span>
                </span>
              </div>
              <div className="hidden sm:flex bg-amber-500 text-amber-950 rounded-lg px-4 py-2 text-xs font-bold group-hover:bg-amber-400 transition-colors">
                {sponsor.custom_cta || "O'tish →"}
              </div>
            </div>
          </div>
        )}
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
          <h3 className="text-sm sm:text-base font-bold text-indigo-200 group-hover:text-indigo-100 truncate">Homiylik orqali shaxsiy banner va tugmaga ega bo'ling</h3>
          <p className="text-xs text-indigo-300/50 truncate max-w-[250px] sm:max-w-lg mt-0.5">VIP sponsor sifatida reytingda ajralib turing va custom e'lon joylashtiring.</p>
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
  
  // Pagination limits
  const [umumiyLimit, setUmumiyLimit] = useState(20);
  const [bugunLimit, setBugunLimit] = useState(10);
  
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    if(domains.length > 0) setLoading(false);
    return () => clearTimeout(t);
  }, [domains]);

  // Separate sponsors from organic
  const sponsors = domains
    .filter((d: DomainItem) => d.type === 'umumiy' && d.is_sponsored)
    .sort((a, b) => (b.price || 0) - (a.price || 0) || (b.clicks || 0) - (a.clicks || 0));

  // Organic = paid (non-sponsor) + free
  const organicPaid = domains
    .filter((d: DomainItem) => (d.type === 'umumiy' || d.type === 'bugun') && d.isPaid && !d.is_sponsored)
    .sort((a, b) => (b.price || 0) - (a.price || 0) || (b.clicks || 0) - (a.clicks || 0));
  const organicFree = domains
    .filter((d: DomainItem) => (!d.isPaid && !d.is_sponsored) && (d.type === 'umumiy' || d.type === 'ochiq' || d.type === 'bugun'))
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || a.addedAt - b.addedAt);
  const organic = [...organicPaid, ...organicFree];

  // Bugun = paid for today + free added today
  const bugunPaid = domains
    .filter((d: DomainItem) => d.type === 'bugun' && d.isPaid && !d.is_sponsored)
    .sort((a, b) => (b.price || 0) - (a.price || 0) || (b.clicks || 0) - (a.clicks || 0));
  const bugunFree = domains
    .filter((d: DomainItem) => (!d.isPaid && !d.is_sponsored) && d.addedToday)
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || a.addedAt - b.addedAt);
  const bugun = [...bugunPaid, ...bugunFree];

  const displayedOrganic = organic.slice(0, umumiyLimit);
  const displayedBugun = bugun.slice(0, bugunLimit);

  // Build interleaved list
  const buildList = useCallback((listItems: DomainItem[], sponsorOffset: number) => {
    const elements: JSX.Element[] = [];
    let rank = 0;
    let sponsorCount = sponsorOffset;

    listItems.forEach((item, idx) => {
      rank++;

      // Insert SponsorRow periodically (e.g. rank 4, 13, 23, 33...)
      if ((rank === 4 || (rank > 10 && rank % 10 === 3)) && sponsors.length > 0) {
        const offset = sponsorCount;
        sponsorCount++;
        elements.push(
          <div key={`sponsor-row-group-${offset}-${idx}`} className="animate-fadeInUp mb-4 mt-2" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
            <SponsorRow sponsors={sponsors} startIndex={offset} />
          </div>
        );
      }


      elements.push(
        <div 
          key={item.id} 
          className="animate-fadeInUp"
          style={{ animationDelay: `${(idx % 10) * 0.04}s`, animationFillMode: 'both' }}
        >
          <DomainRow item={item} rank={rank} />
        </div>
      );
    });

    // Add Sponsor CTA at the end of the list
    if (listItems.length > 0) {
      elements.push(
        <div key="sponsor-cta" className="animate-fadeInUp mt-6" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <SponsorCTA />
        </div>
      );
    }

    return elements;
  }, [sponsors]);

  return (
    <section id="board" className="py-8 md:py-10 relative w-full overflow-hidden">
      {/* Modern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0B0F19] to-[#05080f] -z-10"></div>
      
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 relative z-10 px-4 sm:px-6">
        
        {/* LEFT COLUMN: UMUMIY */}
        <div className="flex-1 lg:w-7/12 flex flex-col min-w-0">
          <div className="mb-6 px-2 text-indigo-400 font-bold tracking-widest text-sm uppercase opacity-90 border-b border-indigo-500/20 pb-2">
            UMUMIY BO'LIM (Doimiy)
          </div>
          {loading ? (
             <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
          ) : organic.length === 0 ? (
             <div className="text-center py-10 text-slate-500">Hozircha saytlar yo'q</div>
          ) : buildList(displayedOrganic, 0)}
          
          {!loading && organic.length > umumiyLimit && (
            <button 
              onClick={() => setUmumiyLimit(prev => prev + 20)}
              className="mt-6 mx-auto bg-indigo-900/40 hover:bg-indigo-800/50 text-indigo-200 border border-indigo-500/30 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-indigo-900/50 flex items-center gap-2"
            >
              Ko'proq yuklash
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
        </div>

        {/* RIGHT COLUMN: BUGUN */}
        <div className="w-full lg:w-5/12 flex flex-col min-w-0">
          <div className="mb-6 px-2 text-emerald-400 font-bold tracking-widest text-sm uppercase opacity-90 border-b border-emerald-500/20 pb-2 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            BUGUN BO'LIMI (24 soat)
          </div>
          {loading ? (
             <><SkeletonRow /><SkeletonRow /></>
          ) : bugun.length === 0 ? (
             <div className="text-center py-10 text-slate-500">Bugun saytlar qo'shilmadi</div>
          ) : buildList(displayedBugun, 1)}

          {!loading && bugun.length > bugunLimit && (
            <Link
              to="/daily"
              className="mt-6 mx-auto bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-200 border border-emerald-500/30 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-emerald-900/50 flex items-center gap-2"
            >
              Barchasini ko'rish
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          )}
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12 relative z-10">
        <Newsletter />
        <div className="mt-6 text-center opacity-70">
          <span className="text-[10px] sm:text-xs text-slate-400 bg-slate-800/40 px-4 py-2 rounded-full border border-slate-700/30 backdrop-blur-sm shadow-inner">
            * Har bir "O'tish" — foydalanuvchi havolani ustiga bosganda hisoblanadi.
          </span>
        </div>
      </div>
    </section>
  );
};

export default Board;
