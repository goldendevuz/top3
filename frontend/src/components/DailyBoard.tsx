import { useEffect, useState } from 'react';

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
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    const backendUrl = "";
      
    fetch(`${backendUrl}/api/domains/${id}/click`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId })
    }).catch(() => {});
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
              <div className="border-2 border-dashed border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 my-4">
                <h3 className="text-lg font-semibold text-indigo-300">Saytingizni shu yerga joylang!</h3>
                <p className="text-sm text-slate-400">Raqobatchilardan doim yuqorida turing va loyihangizga ko'proq mijoz jalb qiling.</p>
                <button onClick={() => window.location.href = '/add'} className="mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors cursor-pointer">
                  Sayt qo'shish
                </button>
              </div>
            ) : (
              dates.map(date => {
                const isLive = date === todayStr;
                const formattedDate = new Date(date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
                const domains = data[date].sort((a, b) => b.current_price - a.current_price);
                
                return (
                  <div key={date} className="panel active" style={{ marginBottom: '40px' }}>
                    <div className="tier-label" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{formattedDate}</span>
                      <span style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.6 }}>— {domains.length} ta sayt</span>
                      <span className="line" style={{ flex: 1 }}></span>
                      {isLive && <span className="badge" style={{ background: '#ff4d4d', color: '#fff' }}>Live</span>}
                    </div>
                    
                    <div>
                      {domains.map((item: any, idx: number) => (
                        <div key={item.id} className="row paid shadow-lg shadow-indigo-500/20 border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/40 animate-fadeInUp">
                          <div className="rank top1" style={{ background: 'var(--surface-high)', color: 'var(--ink)' }}>{idx + 1}</div>
                          <div className="listing flex items-center gap-3 min-w-0 flex-1">
                            <div className="dom flex items-center gap-2 shrink-0">
                              <img 
                                src={`https://www.google.com/s2/favicons?domain=${item.name}&sz=64`} 
                                alt="favicon" 
                                className="w-6 h-6 rounded-md bg-white p-0.5 object-contain shrink-0"
                              />
                              <a 
                                href={buildUtmUrl(item.name)} 
                                target="_blank" 
                                rel="noopener noreferrer dofollow"
                                onClick={() => handleLinkClick(item.id)} 
                                className="visit-link whitespace-nowrap shrink-0"
                              >
                                {item.name}
                              </a>
                              {item.is_sponsored && <span className="badge sponsor shrink-0">Sponsor</span>}
                              <span className="badge cat whitespace-nowrap shrink-0">{item.category || "Boshqa"}</span>
                            </div>
                            <div className="desc flex-1 min-w-0 truncate">{item.description || "Tavsif yo'q"}</div>
                          </div>
                          <div className="metric price">
                            <b className="mono">{fmt(item.current_price || 0)}</b>
                            <span>so'm</span>
                          </div>
                          <a 
                            href={buildUtmUrl(item.name)} 
                            target="_blank" 
                            rel="noopener noreferrer dofollow"
                            onClick={() => handleLinkClick(item.id)} 
                            className="go-btn"
                          >
                            O'tish &rarr;
                          </a>
                        </div>
                      ))}
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
