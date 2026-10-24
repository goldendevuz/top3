import { useParams, Link } from 'react-router-dom';
import { useBoardStore, DomainItem } from '../store/useBoardStore';
import { categoryConfig } from './Categories';
import { useEffect, useState } from 'react';
import { getDomainLogoUrl, handleLogoError } from '../utils';

const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const cleanUrlDisplay = (val: string) => {
  let cleaned = val.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.split(/[/?#]/)[0];
  return cleaned;
};

const SitePage = () => {
  const { domain } = useParams<{ domain: string }>();
  const { domains, fetchDomains, registerVisit } = useBoardStore();
  const [loading, setLoading] = useState(domains.length === 0);

  const buildUtmUrl = (dom: string) => {
    const base = dom.startsWith('http') ? dom : `https://${dom}`;
    const params = `utm_source=top3.uz&utm_medium=directory&utm_campaign=product_page`;
    return base.includes('?') ? `${base}&${params}` : `${base}?${params}`;
  };

  const currentDomain = domain ? cleanUrlDisplay(domain) : '';
  const item = domains.find(d => cleanUrlDisplay(d.dom) === currentDomain);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentDomain]);

  useEffect(() => {
    if (domains.length === 0) {
      setLoading(true);
      fetchDomains().finally(() => setLoading(false));
    } else if (!item) {
      // Re-fetch once to see if newly registered domain exists in DB
      fetchDomains();
    }
  }, [currentDomain, domains.length, item, fetchDomains]);

  if (loading && !item) {
    return (
      <div className="min-h-screen bg-[#05080f] flex items-center justify-center py-20 px-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#05080f] flex items-center justify-center py-20 px-4 text-center">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center text-3xl mb-6">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">Sayt topilmadi</h1>
          <p className="text-zinc-500 mb-8 max-w-sm">Kechirasiz, ushbu domen bo'yicha ma'lumot topilmadi yoki u tizimdan o'chirilgan bo'lishi mumkin.</p>
          <Link to="/" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-colors">
            Bosh sahifaga qaytish
          </Link>
        </div>
      </div>
    );
  }

  // Calculate Ranks
  const allSorted = [...domains].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  const overallRank = allSorted.findIndex(d => d.id === item.id) + 1;
  const overallTotal = allSorted.length;

  const catFiltered = domains.filter(d => d.cat === item.cat);
  const catSorted = [...catFiltered].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  const catRank = catSorted.findIndex(d => d.id === item.id) + 1;
  const catTotal = catSorted.length;

  const cfg = categoryConfig[item.cat || ''];
  
  const competitors = catSorted.filter(d => d.id !== item.id).slice(0, 5);

  const getAddedBadgeText = (timestamp: number) => {
    if (!timestamp) return null;
    const now = new Date();
    const date = new Date(timestamp);
    
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((todayDate - itemDate) / (24 * 3600 * 1000));
    
    if (diffDays === 0) return "Bugun qo'shildi";
    if (diffDays === 1) return "Kecha qo'shildi";
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} kun oldin`;
    
    const monthsUz = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
    ];
    return `${date.getDate()}-${monthsUz[date.getMonth()]}`;
  };

  const isNew = (Date.now() - item.addedAt) < 7 * 24 * 3600 * 1000;
  
  const handleVisit = () => {
    if (item.id) registerVisit(item.id);
    window.open(buildUtmUrl(item.dom), '_blank', 'noopener,noreferrer,dofollow');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://top3.uz/site/${currentDomain}`);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#0B0F19] to-[#05080f] -z-10 h-[500px]"></div>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium mb-10">
          <Link to="/" className="hover:text-indigo-400 transition-colors">Bosh sahifa</Link>
          <span>/</span>
          <Link to="/categories" className="hover:text-indigo-400 transition-colors">Kategoriyalar</Link>
          <span>/</span>
          {item.cat && item.cat !== '—' ? (
            <>
              <Link to={`/category/${encodeURIComponent(item.cat)}`} className="hover:text-indigo-400 transition-colors">{item.cat}</Link>
              <span>/</span>
            </>
          ) : null}
          <span className="text-zinc-300">{currentDomain}</span>
        </div>

        {/* Main Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-zinc-900/50 border border-zinc-800 p-6 sm:p-10 mb-8 backdrop-blur-sm">
          {/* Subtle glow */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
            {/* Logo */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-white rounded-3xl p-3 flex items-center justify-center shadow-2xl shadow-black/50 border-4 border-zinc-800/50 relative">
              <img 
                src={getDomainLogoUrl(currentDomain, 256)} 
                alt={`${currentDomain} logo`}
                className="w-full h-full object-contain"
                onError={(e) => handleLogoError(e, currentDomain)}
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight break-words">
                  {currentDomain}
                </h1>
                {item.addedAt && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    <span>{getAddedBadgeText(item.addedAt)}</span>
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium mb-6">
                {item.cat && item.cat !== '—' && (
                  <Link 
                    to={`/category/${encodeURIComponent(item.cat)}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors border border-zinc-700/50"
                  >
                    <span>{cfg?.icon || '📁'}</span>
                    {item.cat}
                  </Link>
                )}
                <div className="flex items-center gap-2 text-zinc-400">
                  <span>🗓</span>
                  <span>{new Date(item.addedAt).toLocaleDateString('uz-UZ')}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <span>👀</span>
                  <span>{fmt(item.clicks || 0)} o'tish</span>
                </div>
                {item.is_sponsored && (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <span>👑</span> Homiylik
                  </div>
                )}
              </div>

              <p className="text-lg text-zinc-300 leading-relaxed max-w-2xl">
                {item.desc !== '—' ? item.desc : "Ushbu loyiha uchun qo'shimcha tavsif kiritilmagan."}
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 pt-8 border-t border-zinc-800/80">
            <button 
              onClick={handleVisit}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-indigo-600/20"
            >
              Saytga o'tish
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
            <button 
              onClick={handleCopy}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-6 py-3.5 rounded-xl font-bold text-base transition-colors border border-zinc-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Nusxa olish
            </button>
          </div>
        </div>

        {/* Stats & Ranks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Category Rank */}
          {item.cat && item.cat !== '—' && (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-8 flex flex-col justify-center">
              <div className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-3">Kategoriya bo'yicha</div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-black text-white">#{catRank}</span>
              </div>
              <p className="text-zinc-400 text-sm">
                <b>{item.cat}</b> yo'nalishidagi jami <span className="text-zinc-300 font-semibold">{catTotal}</span> ta sayt ichida
              </p>
              <div className="mt-4">
                <Link to={`/category/${encodeURIComponent(item.cat)}`} className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors">
                  Kategoriya reytingini ko'rish &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Overall Rank */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-8 flex flex-col justify-center">
            <div className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-3">Umumiy reyting</div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-black text-white">#{overallRank}</span>
            </div>
            <p className="text-zinc-400 text-sm">
              Top3.uz dagi jami <span className="text-zinc-300 font-semibold">{overallTotal}</span> ta sayt ichida
            </p>
            <div className="mt-4">
              <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors">
                Asosiy doskani ko'rish &rarr;
              </Link>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-12"></div>

        {/* Details & Competitors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Info Text */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-6">Reyting haqida</h2>
            <div className="space-y-6 text-zinc-300 leading-relaxed text-sm sm:text-base">
              <p>
                <b>{currentDomain}</b> sayti hozirda <b>{item.cat !== '—' ? item.cat : 'Boshqa'}</b> kategoriyasida <b>#{catRank}</b>-o'rinni egallab turibdi. 
                Sayt platformaga qo'shilganidan beri jami <b>{fmt(item.clicks || 0)}</b> marta tashrif buyurilgan.
              </p>
              
              <div className="mt-8">
                <h3 className="text-lg font-bold text-white mb-3">Saytni qanday qilib yuqoriga ko'tarish mumkin?</h3>
                <p className="mb-4">
                  Top3.uz da reyting doimiy ravishda foydalanuvchilar qiziqishiga qarab o'zgarib boradi. Saytingizni yuqoriga olib chiqish uchun unga ko'proq e'tibor qaratishingiz mumkin:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>O'z foydalanuvchilaringiz bilan havolani ulashing.</li>
                  <li>"Bugun" bo'limida kunlik o'rinni sotib oling.</li>
                  <li>Umumiy bo'limda pullik asosida yuqoriroq pozitsiyaga chiqing.</li>
                  <li>Sponsorlik (Homiylik) orqali VIP ko'rinishga va doimiy reklama joyiga ega bo'ling.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right: Competitors */}
          {competitors.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-5 flex items-center justify-between">
                Raqobatchilar
                <Link to={`/category/${encodeURIComponent(item.cat || '')}`} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                  Barchasi
                </Link>
              </h2>
              <div className="flex flex-col gap-3">
                {competitors.map((comp) => (
                  <Link 
                    key={comp.id} 
                    to={`/site/${cleanUrlDisplay(comp.dom)}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/80 transition-colors group"
                  >
                    <div className="text-zinc-600 font-black text-sm w-5">
                      #{catSorted.findIndex(d => d.id === comp.id) + 1}
                    </div>
                    <img 
                      src={getDomainLogoUrl(cleanUrlDisplay(comp.dom), 128)}
                      alt=""
                      className="w-8 h-8 rounded-lg bg-white p-1 object-contain shrink-0"
                      onError={(e) => handleLogoError(e, cleanUrlDisplay(comp.dom))}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-200 font-bold text-sm truncate group-hover:text-indigo-400 transition-colors">
                        {cleanUrlDisplay(comp.dom)}
                      </div>
                      <div className="text-zinc-500 text-xs truncate">
                        {fmt(comp.clicks || 0)} o'tish
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SitePage;
