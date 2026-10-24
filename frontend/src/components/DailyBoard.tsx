import React, { useEffect, useState } from 'react';
import { useBoardStore, DomainItem } from '../store/useBoardStore';
import { SponsorRow } from './Board';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getDomainLogoUrl, handleLogoError } from '../utils';

const cleanUrlDisplay = (url: string) => {
  if (!url) return "";
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./i, '');
  } catch (e) {
    return url;
  }
};

const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const uzMonths = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

const formatDateGroup = (dateStr: string) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  const formatted = `${day}-${uzMonths[month]}, ${year}-yil`;

  if (dateStr === todayStr) return `${formatted} (Bugun)`;
  if (dateStr === yesterdayStr) return `${formatted} (Kecha)`;
  return formatted;
};

const DailyBoard = () => {
  const { date: routeDate } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const { domains, registerVisit } = useBoardStore();
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    if(domains.length > 0) setLoading(false);
    return () => clearTimeout(t);
  }, [domains]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();
      
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const buildUtmUrl = (domain: string) => {
    const base = domain.startsWith('http') ? domain : `https://${domain}`;
    const params = `utm_source=top3.uz&utm_medium=directory&utm_campaign=top3_referral`;
    return base.includes('?') ? `${base}&${params}` : `${base}?${params}`;
  };

  const handleLinkClick = (id: number) => {
    registerVisit(id);
  };

  const grouped: Record<string, DomainItem[]> = {};
  const sponsors: DomainItem[] = [];

  domains.forEach(d => {
    if (d.is_sponsored) {
      sponsors.push(d);
    } else {
      let dateStr = "";
      if (d.addedToday) {
        const today = new Date();
        dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      } else {
        const localD = new Date(d.addedAt);
        dateStr = `${localD.getFullYear()}-${String(localD.getMonth() + 1).padStart(2, '0')}-${String(localD.getDate()).padStart(2, '0')}`;
        const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
        if (dateStr === todayStr) {
           const yesterday = new Date();
           yesterday.setDate(yesterday.getDate() - 1);
           dateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        }
      }
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(d);
    }
  });

  let sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  if (routeDate) {
    sortedDates = sortedDates.filter(d => d === routeDate);
  }

  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div id="board" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
        <div className="wrap">
          <div className="section-head reveal in">
            <div>
              {routeDate ? (
                <>
                  <Link to="/daily" className="text-zinc-500 hover:text-white transition-colors text-sm font-bold mb-4 inline-flex items-center gap-2">
                    ← Barcha kunlarga qaytish
                  </Link>
                  <h2>{formatDateGroup(routeDate)}</h2>
                  <p>Shu kundagi barcha saytlar xronologiyasi.</p>
                </>
              ) : (
                <>
                  <span className="kicker">Barcha kunlik saytlar</span>
                  <h2>Barcha saytlar xronologiyasi</h2>
                  <p>Top3 ga har kuni qo'shiladigan pullik va bepul saytlar ro'yxati kunlar kesimida.</p>
                </>
              )}
            </div>
          </div>

          <div className="board reveal in max-w-4xl mx-auto pb-12 px-2 sm:px-4">
            

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink)' }}>Yuklanmoqda...</div>
            ) : sortedDates.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <h3 className="text-zinc-300 font-semibold mb-2">Hozircha ro'yxat bo'sh!</h3>
                <p className="text-sm text-zinc-500 max-w-sm mb-4">Birinchi bo'lib qo'shiling va loyihangizga mijoz jalb qiling.</p>
                <a href="/#add" className="bg-white text-black px-6 py-2 rounded-full font-medium text-sm hover:bg-zinc-200 transition-colors">
                  Sayt qo'shish
                </a>
              </div>
            ) : (
              sortedDates.map((date, dateIndex) => {
                const groupLabel = formatDateGroup(date);
                const isLive = date === todayStr;
                
                const dayDomains = grouped[date].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
                
                // If not in single date route, limit to top 3
                const displayDomains = routeDate ? dayDomains : dayDomains.slice(0, 3);
                const hiddenCount = Math.max(0, dayDomains.length - 3);
                
                const sponsorForDay = sponsors.length > 0 ? sponsors[dateIndex % sponsors.length] : null;

                return (
                  <div 
                    key={date} 
                    className={`mb-6 rounded-[24px] p-5 sm:p-6 ${
                      isLive 
                        ? 'bg-[#181111] border border-red-900/30 shadow-[0_0_30px_rgba(220,38,38,0.05)]' 
                        : 'bg-zinc-900/40 border border-zinc-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-white">{groupLabel}</h3>
                          {isLive && (
                            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider">
                              Live
                            </span>
                          )}
                        </div>
                        {isLive ? (
                          <p className="text-sm text-red-400/80">Bu kun hali ochiq. Soat 00:00 da yakunlanadi.</p>
                        ) : (
                          <p className="text-sm text-zinc-500">{dayDomains.length} ta sayt qo'shilgan</p>
                        )}
                      </div>
                      
                      {isLive && (
                        <div className="text-sm font-medium text-red-400/90 sm:text-right">
                          {timeLeft} qoldi — {dayDomains.length} ta sayt
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const elements: JSX.Element[] = [];
                        let sponsorCount = 0;

                        displayDomains.forEach((item, idx) => {
                          const rankColor = idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-orange-400' : 'text-zinc-500';
                          
                          elements.push(
                            <div 
                              key={item.id} 
                              className={`relative group flex items-center justify-between p-3 transition-colors rounded-xl ${
                                isLive 
                                  ? 'bg-[#221717] border border-red-900/20 hover:border-red-900/40' 
                                  : 'bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700'
                              }`}
                            >
                              <a
                                href={buildUtmUrl(item.dom)}
                                target="_blank"
                                rel="noopener noreferrer dofollow"
                                onClick={() => handleLinkClick(item.id!)}
                                className="absolute inset-0 z-0 rounded-xl"
                                aria-label={`Go to ${item.dom}`}
                              />
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`text-xl sm:text-2xl font-black italic w-8 sm:w-10 text-center ${rankColor}`}>
                                  #{idx + 1}
                                </div>
                                <img src={getDomainLogoUrl(cleanUrlDisplay(item.dom), 128)} alt="logo" className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 p-1.5 object-contain shrink-0" onError={(e) => handleLogoError(e, cleanUrlDisplay(item.dom))} />
                                <div className="flex flex-col min-w-0 pr-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className={`text-sm sm:text-base font-bold truncate transition-colors ${
                                      isLive ? 'text-white group-hover:text-red-400' : 'text-zinc-200 group-hover:text-indigo-400'
                                    }`}>
                                      {cleanUrlDisplay(item.dom)}
                                    </h3>
                                  </div>
                                  <div className={`flex items-center gap-1 text-[11px] sm:text-xs relative z-10 ${isLive ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                    <span className="truncate flex-1 min-w-0 line-clamp-1">{item.desc}</span>
                                    <Link 
                                      to={`/site/${cleanUrlDisplay(item.dom)}`}
                                      className="text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap shrink-0"
                                    >
                                      batafsil
                                    </Link>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end shrink-0 pl-2">
                                {item.isPaid && (
                                  <span className={`${isLive ? 'text-red-400' : 'text-emerald-500'} font-bold text-[11px] sm:text-xs mb-0.5`}>
                                    {fmt(item.price || 0)} UZS
                                  </span>
                                )}
                                <span className="text-[10px] sm:text-xs text-zinc-500 flex items-center gap-1">
                                  {fmt(item.clicks || 0)} o'tish
                                </span>
                              </div>
                            </div>
                          );

                          // Insert sponsor after the 3rd item (idx 2), and then every 10 items
                          const shouldInsertSponsor = (idx === 2) || (idx > 2 && (idx - 2) % 10 === 0);
                          
                          if (shouldInsertSponsor && sponsorForDay) {
                            elements.push(
                              <div key={`sponsor-${idx}`} className="mt-2 mb-2">
                                <SponsorRow sponsors={[sponsorForDay]} startIndex={sponsorCount} />
                              </div>
                            );
                            sponsorCount++;
                          }
                        });

                        return elements;
                      })()}
                    </div>

                    {!routeDate && (
                      <div className={`mt-5 flex flex-col sm:flex-row gap-2.5 ${isLive ? 'grid sm:grid-cols-2' : ''}`}>
                        {isLive && (
                          <a 
                            href="/#add"
                            className="flex items-center justify-center py-2.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white transition-all shadow-lg shadow-red-900/20 w-full"
                          >
                            Bugunni egallash
                          </a>
                        )}
                        {(hiddenCount > 0 || isLive) && (
                          <Link 
                            to={`/daily/${date}`}
                            className={`flex items-center justify-center py-2.5 px-4 rounded-xl font-bold text-sm border transition-all w-full ${
                              isLive
                                ? 'border-red-900/30 hover:border-red-500/50 text-red-200 hover:text-white bg-red-950/20 hover:bg-red-900/20'
                                : 'border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-800'
                            }`}
                          >
                            Barchasini ko'rish {hiddenCount > 0 ? `(+${hiddenCount})` : ''}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyBoard;
