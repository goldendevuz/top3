import React, { useEffect, useState } from 'react';

const hashCode = (s: string) => {
  let h = 0;
  for(let i=0; i<s.length; i++){
    h = ((h<<5)-h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const faviconStyle = (dom: string) => {
  const h = hashCode(dom);
  const h1 = h % 360, h2 = (h1 + 46) % 360;
  return { background: `linear-gradient(135deg, hsl(${h1} 70% 46%), hsl(${h2} 70% 36%))` };
};

const initials = (dom: string) => dom.slice(0, 2).toUpperCase();
const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const DailyBoard = () => {
  const [data, setData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/domains/daily')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const buildUtmUrl = (domain: string) => {
    const base = `https://${domain}`;
    const params = `utm_source=top3.uz&utm_medium=directory&utm_campaign=top3_referral`;
    return base.includes('?') ? `${base}&${params}` : `${base}?${params}`;
  };

  const handleLinkClick = (id: number) => {
    fetch(`http://localhost:8000/api/domains/${id}/visit`, { method: 'POST' }).catch(() => {});
  };

  const dates = Object.keys(data).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
      <section id="board">
        <div className="wrap">
          <div className="section-head reveal in">
            <div>
              <span className="kicker">Kunlik reyting</span>
              <h2>Pullik saytlar arxivi</h2>
              <p>Top3 ga qo'shilgan pullik va sponsor saytlar ro'yxati kunlar kesimida.</p>
            </div>
          </div>

          <div className="board reveal in">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink)' }}>Yuklanmoqda...</div>
            ) : dates.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <h3 className="text-zinc-300 font-semibold mb-2">Hozircha arxiv bo'sh!</h3>
                <p className="text-sm text-zinc-500 max-w-sm mb-4">Birinchi bo'lib qo'shiling va loyihangizga mijoz jalb qiling.</p>
                <button onClick={() => window.location.href = '/add'} className="bg-white text-black px-6 py-2 rounded-full font-medium text-sm hover:bg-zinc-200 transition-colors">
                  Sayt qo'shish
                </button>
              </div>
            ) : (
              dates.map(date => {
                const isLive = date === todayStr;
                const formattedDate = new Date(date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
                const domains = data[date].sort((a, b) => b.current_price - a.current_price);
                
                return (
                  <div key={date} className="mb-12">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                      <span className="text-sm text-zinc-200">{formattedDate}</span>
                      <span className="text-zinc-500 font-normal normal-case">— {domains.length} ta sayt</span>
                      <span className="flex-1 h-px bg-zinc-800"></span>
                      {isLive && <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded font-medium text-[10px]">Live</span>}
                    </div>
                    
                    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                      {domains.map((item: any, idx: number) => {
                        const rank = idx + 1;
                        const rankColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-zinc-300' : rank === 3 ? 'text-orange-400' : 'text-zinc-500';
                        const isSponsor = item.is_sponsored;
                        
                        return (
                          <div key={item.id} className={`flex items-center gap-4 py-4 px-4 border-b border-zinc-800 transition-all hover:bg-zinc-900 ${isSponsor ? 'border border-yellow-500/30 bg-yellow-500/5' : ''}`}>
                            <div className={`w-6 text-center font-bold ${isSponsor ? 'text-yellow-500 text-xs' : rankColor}`}>{isSponsor ? 'AD' : rank}</div>
                            
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <img 
                                src={`https://www.google.com/s2/favicons?domain=${item.name}&sz=64`} 
                                alt="favicon" 
                                className="w-8 h-8 rounded-md bg-zinc-800 p-1 object-contain shrink-0"
                              />
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <a 
                                    href={buildUtmUrl(item.name)} 
                                    target="_blank" 
                                    rel="noopener noreferrer dofollow"
                                    onClick={() => handleLinkClick(item.id)} 
                                    className="text-zinc-100 font-semibold hover:underline truncate"
                                  >
                                    {item.name}
                                  </a>
                                  {isSponsor && <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded font-medium border border-yellow-500/30 shrink-0">Sponsor</span>}
                                  <span className="text-zinc-500 text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded shrink-0">{item.category || "Boshqa"}</span>
                                </div>
                                <div className="text-sm text-zinc-400 truncate mt-0.5">{item.description || "Tavsif yo'q"}</div>
                              </div>
                            </div>

                            <div className="hidden sm:block text-right text-sm">
                              <b className="text-zinc-200">{fmt(item.current_price || 0)}</b> <span className="text-zinc-500 text-xs">so'm</span>
                            </div>

                            <a 
                              href={buildUtmUrl(item.name)} 
                              target="_blank" 
                              rel="noopener noreferrer dofollow"
                              onClick={() => handleLinkClick(item.id)} 
                              className="bg-white text-black hover:bg-zinc-200 rounded-full px-5 py-1.5 text-sm font-medium transition-colors shrink-0 shadow-sm"
                            >
                              O'tish
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DailyBoard;
