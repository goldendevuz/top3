import React, { useEffect, useState } from 'react';
import { useBoardStore, DomainItem } from '../store/useBoardStore';
import { SponsorRow } from './Board';

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

const formatDateGroup = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  if (d.toDateString() === today.toDateString()) return "Bugun";
  
  const f = d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  if (d.toDateString() === yesterday.toDateString()) return `${f} (kecha)`;
  
  return f;
};

const DailyBoard = () => {
  const { domains } = useBoardStore();
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    if(domains.length > 0) setLoading(false);
    return () => clearTimeout(t);
  }, [domains]);

  const buildUtmUrl = (domain: string) => {
    const base = domain.startsWith('http') ? domain : `https://${domain}`;
    const params = `utm_source=top3.uz&utm_medium=directory&utm_campaign=top3_referral`;
    return base.includes('?') ? `${base}&${params}` : `${base}?${params}`;
  };

  const handleLinkClick = (id: number) => {
    fetch(`/api/domains/${id}/visit`, { method: 'POST' }).catch(() => {});
  };

  // Group all organic domains by date string
  const grouped: Record<string, DomainItem[]> = {};
  const sponsors: DomainItem[] = [];

  domains.forEach(d => {
    if (d.is_sponsored) {
      sponsors.push(d);
    } else {
      const dateStr = new Date(d.addedAt).toISOString().split('T')[0];
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(d);
    }
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let globalRank = 0;
  let sponsorOffset = 0;
  let totalDisplayed = 0;

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
      <section id="board">
        <div className="wrap">
          <div className="section-head reveal in">
            <div>
              <span className="kicker">Barcha kunlik saytlar</span>
              <h2>Barcha saytlar xronologiyasi</h2>
              <p>Top3 ga har kuni qo'shiladigan pullik va bepul saytlar ro'yxati kunlar kesimida.</p>
            </div>
          </div>

          <div className="board reveal in max-w-4xl mx-auto">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink)' }}>Yuklanmoqda...</div>
            ) : sortedDates.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <h3 className="text-zinc-300 font-semibold mb-2">Hozircha ro'yxat bo'sh!</h3>
                <p className="text-sm text-zinc-500 max-w-sm mb-4">Birinchi bo'lib qo'shiling va loyihangizga mijoz jalb qiling.</p>
                <button onClick={() => window.location.href = '/add'} className="bg-white text-black px-6 py-2 rounded-full font-medium text-sm hover:bg-zinc-200 transition-colors">
                  Sayt qo'shish
                </button>
              </div>
            ) : (
              sortedDates.map((date, dateIndex) => {
                const groupLabel = formatDateGroup(date);
                const isLive = groupLabel === "Bugun";
                
                // Sort domains within the day by clicks or price
                const dayDomains = grouped[date].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
                
                return (
                  <div key={date} className="mb-12">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-3 px-2">
                      <span className="text-sm text-zinc-200">{groupLabel}</span>
                      <span className="text-zinc-500 font-normal normal-case">— {dayDomains.length} ta sayt</span>
                      <span className="flex-1 h-px bg-zinc-800"></span>
                      {isLive && <span className="bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-medium text-[10px]">Live</span>}
                    </div>
                    
                    <div className="flex flex-col">
                      {dayDomains.map((item, idx) => {
                        if (totalDisplayed >= limit) return null;
                        
                        globalRank++;
                        totalDisplayed++;
                        const rankColor = globalRank === 1 ? 'text-yellow-500' : globalRank === 2 ? 'text-zinc-300' : globalRank === 3 ? 'text-orange-400' : 'text-zinc-500';
                        
                        const renderItem = (
                          <a 
                            key={item.id} 
                            href={buildUtmUrl(item.dom)} 
                            target="_blank" 
                            rel="noopener noreferrer dofollow"
                            onClick={() => handleLinkClick(item.id!)}
                            className={`flex items-center justify-between p-4 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors rounded-xl mb-3`}
                          >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className={`text-2xl sm:text-3xl font-black italic min-w-[2rem] sm:min-w-[2.5rem] text-center ${rankColor}`}>
                                #{globalRank}
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
                            <div className="flex items-center gap-4 shrink-0 pl-2">
                              <div className="flex flex-col items-end">
                                {item.isPaid ? (
                                  <>
                                    <span className="text-base sm:text-lg font-black text-white">{fmt(item.price || 0)}</span>
                                    <span className="text-[9px] sm:text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">so'm</span>
                                  </>
                                ) : null}
                                <span className="text-xs text-zinc-400 mt-0.5">{fmt(item.clicks || 0)} <span className="text-zinc-500">o'tish</span></span>
                              </div>
                              <div className="hidden sm:flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold transition-colors bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white">
                                O'tish →
                              </div>
                            </div>
                          </a>
                        );

                        // Insert sponsor slot every 10 items
                        let sponsorRender = null;
                        if (globalRank % 10 === 0 && sponsors.length > 0) {
                          const offset = sponsorOffset;
                          sponsorOffset++;
                          sponsorRender = (
                            <div key={`sponsor-row-${globalRank}`} className="animate-fadeInUp mb-4 mt-2">
                              <SponsorRow sponsors={sponsors} startIndex={offset} />
                            </div>
                          );
                        }

                        return (
                          <React.Fragment key={`frag-${item.id}`}>
                            {renderItem}
                            {sponsorRender}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {!loading && Object.values(grouped).reduce((acc, curr) => acc + curr.length, 0) > limit && (
              <button 
                onClick={() => setLimit(prev => prev + 20)}
                className="mt-2 mx-auto bg-zinc-900/40 hover:bg-zinc-800/50 text-zinc-200 border border-zinc-500/30 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-zinc-900/50 flex items-center gap-2"
              >
                Ko'proq yuklash
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DailyBoard;
