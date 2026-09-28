import React, { useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';

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

const timeAgo = (ts: number) => {
  const d = Date.now() - ts;
  const MIN = 60000, HOUR = 3600000;
  if(d < MIN) return "hozir";
  if(d < HOUR) return Math.floor(d/MIN) + " daqiqa oldin";
  if(d < 24*HOUR) return Math.floor(d/HOUR) + " soat oldin";
  return Math.floor(d/(24*HOUR)) + " kun oldin";
};

const DomainRow = ({ item, rank, kind }: { item: any, rank: number, kind: string }) => {
  const isSponsor = kind === 'sponsor';
  const rankColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-zinc-300' : rank === 3 ? 'text-orange-400' : 'text-zinc-500';

  let metricHTML;
  if (kind === "sponsor") {
    if (item.price !== null && item.price !== undefined) {
      metricHTML = <div className="text-sm text-right"><b className="text-zinc-200">{fmt(item.price)}</b> <span className="text-zinc-500 text-xs">so'm</span></div>;
    }
  } else if (kind === "general-paid" || kind === "today-paid") {
    metricHTML = <div className="text-sm text-right"><b className="text-zinc-200">{fmt(item.price || 0)}</b> <span className="text-zinc-500 text-xs">{kind === 'today-paid' ? "so'm/kun" : "so'm"}</span></div>;
  } else if (kind === "general-free" || kind === "open") {
    if (!item.clicks) {
      metricHTML = <div className="text-sm text-right"><b className="text-zinc-300">Yangi</b></div>;
    } else {
      metricHTML = <div className="text-sm text-right"><b className="text-zinc-200">{fmt(item.clicks)}</b> <span className="text-zinc-500 text-xs">o'tish</span></div>;
    }
  } else {
    metricHTML = <div className="text-sm text-zinc-500 text-right">{timeAgo(item.addedAt)}</div>;
  }

  const buildUtmUrl = (domain: string) => {
    const base = `https://${domain}`;
    const params = `utm_source=top3.uz&utm_medium=directory&utm_campaign=top3_referral`;
    return base.includes('?') ? `${base}&${params}` : `${base}?${params}`;
  };

  const handleLinkClick = (id: number) => {
    fetch(`http://localhost:8000/api/domains/${id}/visit`, { method: 'POST' }).catch(() => {});
  };

  return (
    <div className={`flex items-center justify-between p-4 transition-colors w-full ${isSponsor ? 'border border-yellow-500/30 bg-yellow-500/5 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-zinc-900/50 rounded-xl border border-zinc-800 hover:bg-zinc-900'}`}>
      
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-6 text-center font-bold shrink-0 ${isSponsor ? 'text-yellow-500 text-xs' : rankColor}`}>
          {isSponsor ? 'AD' : rank}
        </div>
        
        <div className="w-10 h-10 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center overflow-hidden border border-zinc-700">
          <img 
            src={`https://www.google.com/s2/favicons?domain=${item.dom}&sz=64`} 
            alt="favicon" 
            className="w-full h-full object-cover p-1"
          />
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <a 
              href={buildUtmUrl(item.dom)} 
              target="_blank" 
              rel="noopener noreferrer dofollow"
              onClick={() => handleLinkClick(item.id)} 
              className="text-white font-medium hover:underline truncate"
            >
              {item.dom}
            </a>
            {isSponsor && <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded font-medium border border-yellow-500/30 shrink-0">Sponsor</span>}
            {kind === 'today-paid' && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0">Bugun</span>}
            <span className="text-zinc-500 text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded shrink-0">{item.cat}</span>
          </div>
          <p className="text-sm text-zinc-400 truncate mt-0.5">{item.desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0 ml-4">
        <div className="text-right hidden sm:block">
          {metricHTML}
        </div>
        
        <a 
          href={buildUtmUrl(item.dom)} 
          target="_blank" 
          rel="noopener noreferrer dofollow"
          onClick={() => handleLinkClick(item.id)} 
          className="px-5 py-2 text-sm font-medium bg-white text-black rounded-full hover:bg-zinc-200 transition-colors shrink-0"
        >
          O'tish
        </a>
      </div>
      
    </div>
  );
};

const SkeletonRow = () => (
  <div className="flex items-center gap-4 py-4 px-4 border-b border-zinc-800 animate-pulse">
    <div className="w-6 h-4 bg-zinc-800 rounded"></div>
    <div className="w-8 h-8 rounded-md bg-zinc-800 shrink-0"></div>
    <div className="flex flex-col gap-2 flex-1">
      <div className="w-32 h-4 bg-zinc-800 rounded"></div>
      <div className="w-48 h-3 bg-zinc-800 rounded"></div>
    </div>
    <div className="hidden sm:flex flex-col items-end gap-1">
      <div className="w-16 h-4 bg-zinc-800 rounded"></div>
    </div>
    <div className="w-20 h-8 bg-zinc-800 rounded-full shrink-0"></div>
  </div>
);

const Board = () => {
  const { domains, fetchDomains } = useBoardStore();
  const [activeTab, setActiveTab] = useState<'umumiy' | 'bugun'>('umumiy');
  
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    if(domains.length > 0) setLoading(false);
    return () => clearTimeout(t);
  }, [domains]);

  const displayDomains = domains;

  const generalSponsor = displayDomains.filter(d => d.type === 'umumiy' && d.is_sponsored).sort((a, b) => (b.price || 0) - (a.price || 0));
  const generalPaid = displayDomains.filter(d => d.type === 'umumiy' && d.isPaid && !d.is_sponsored).sort((a, b) => (b.price || 0) - (a.price || 0));
  const generalFree = displayDomains.filter(d => (!d.isPaid && !d.is_sponsored) && (d.type === 'umumiy' || d.type === 'ochiq')).sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || a.addedAt - b.addedAt);
  const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
  const todayAll = displayDomains.filter(d => isToday(d.addedAt)).sort((a, b) => (b.price || 0) - (a.price || 0) || (b.clicks || 0) - (a.clicks || 0) || b.addedAt - a.addedAt);

  return (
    <section id="board" className="py-12 bg-zinc-950">
      <div className="w-full max-w-4xl mx-auto flex flex-col px-4">
        <div className="mb-12 text-center reveal in">
          <span className="text-zinc-500 font-semibold tracking-widest text-xs uppercase mb-2 block">Uch bo'lim</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{domains.length} ta sayt, uchta taxta</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">"Umumiy" — doimiy pullik va admin qo'shgan bepul joylar. "Bugun" — faqat shu kunga sotib olingan o'rinlar. "Ochiq" — har kim bepul qo'sha oladigan ro'yxat.</p>
        </div>

        <div className="bg-zinc-950 p-2 md:p-4 reveal in">
          <div className="flex gap-4 border-b border-zinc-800 mb-8">
            <button className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'umumiy' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`} onClick={() => setActiveTab('umumiy')}>
              Umumiy <span className="ml-1 bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-xs">{generalSponsor.length + generalPaid.length + generalFree.length}</span>
            </button>
            <button className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'bugun' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`} onClick={() => setActiveTab('bugun')}>
              Bugun <span className="ml-1 bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-xs">{todayAll.length}</span>
            </button>
          </div>

          <div className={activeTab === 'umumiy' ? 'block' : 'hidden'}>
            {generalSponsor.length > 0 && (
              <div className="mb-12">
                <div className="px-4 pb-2 border-b border-zinc-800 text-xs font-bold text-yellow-500 tracking-wider flex justify-between uppercase mb-2">
                  <span>Sponsor joylar</span>
                  <span className="text-zinc-600">premium</span>
                </div>
                <div className="bg-zinc-950 flex flex-col gap-3">
                  {generalSponsor.map((item, idx) => <DomainRow key={item.id} item={item} rank={idx + 1} kind="sponsor" />)}
                </div>
              </div>
            )}

            <div className="mb-12">
              <div className="px-4 pb-2 border-b border-zinc-800 text-xs font-bold text-zinc-500 tracking-wider flex justify-between uppercase mb-2">
                <span>Pullik joylar</span>
                <span className="text-zinc-600">narx bo'yicha</span>
              </div>
              <div className="bg-zinc-950 flex flex-col gap-3">
                {loading && (
                  <div className="flex flex-col gap-3">
                    <SkeletonRow /><SkeletonRow /><SkeletonRow />
                  </div>
                )}
                {!loading && generalPaid.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <h3 className="text-zinc-300 font-semibold mb-2">Hozircha bo'sh!</h3>
                    <p className="text-sm text-zinc-500 max-w-sm mb-4">Birinchi bo'lib qo'shiling va loyihangizga mijoz jalb qiling.</p>
                    <button onClick={() => window.location.href = '/add'} className="bg-white text-black px-6 py-2 rounded-full font-medium text-sm hover:bg-zinc-200 transition-colors">
                      Sayt qo'shish
                    </button>
                  </div>
                )}
                {!loading && generalPaid.map((item, idx) => <DomainRow key={item.id} item={item} rank={idx + 1} kind="general-paid" />)}
              </div>
            </div>
            
            <div>
              <div className="px-4 pb-2 border-b border-zinc-800 text-xs font-bold text-zinc-500 tracking-wider flex justify-between uppercase mb-2">
                <span>Bepul joylar</span>
                <span className="text-zinc-600">unikal o'tishlar bo'yicha</span>
              </div>
              <div className="bg-zinc-950 flex flex-col gap-3">
                {loading && (
                  <div className="flex flex-col gap-3">
                    <SkeletonRow /><SkeletonRow />
                  </div>
                )}
                {!loading && generalFree.length === 0 && <div className="py-8 text-center text-sm text-zinc-500">Hozircha bepul saytlar yo'q</div>}
                {!loading && generalFree.map((item, idx) => <DomainRow key={item.id} item={item} rank={generalPaid.length + idx + 1} kind="general-free" />)}
              </div>
            </div>
          </div>

          <div className={activeTab === 'bugun' ? 'block' : 'hidden'}>
            <div className="px-4 pb-2 border-b border-zinc-800 text-xs font-bold text-zinc-500 tracking-wider flex justify-between uppercase mb-2">
              <span>Bugungi o'rinlar</span>
              <span className="text-zinc-600">narx bo'yicha</span>
            </div>
            <div className="bg-zinc-950 flex flex-col gap-3">
              {loading && (
                <div className="flex flex-col gap-3">
                  <SkeletonRow /><SkeletonRow />
                </div>
              )}
              {!loading && todayAll.length === 0 && <div className="py-12 text-center text-sm text-zinc-500">Hozircha bugungi saytlar yo'q</div>}
              {!loading && todayAll.map((item, idx) => {
                let kind = 'general-free';
                if (item.is_sponsored) kind = 'sponsor';
                else if (item.isPaid) kind = 'today-paid';
                return <DomainRow key={item.id} item={item} rank={idx + 1} kind={kind} />
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Board;
