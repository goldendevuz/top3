import { useEffect, useState } from 'react';
import axios from 'axios';
import { DomainItem } from '../store/useBoardStore';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import { categories } from './Categories';
import { getDomainLogoUrl, handleLogoError } from '../utils';

const Profile = () => {
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [redirectErrorDomains, setRedirectErrorDomains] = useState<number[]>([]);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; domainId: number | null }>({ isOpen: false, domainId: null });
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const [usersList, setUsersList] = useState<Array<{ id: number; email: string; telegram_id?: string; created_at?: string }>>([]);
  const [ownerModal, setOwnerModal] = useState<{
    isOpen: boolean;
    domain: DomainItem | null;
    searchTerm: string;
    loading: boolean;
  }>({
    isOpen: false,
    domain: null,
    searchTerm: '',
    loading: false
  });

  const [clicksModal, setClicksModal] = useState<{
    isOpen: boolean;
    domain: DomainItem | null;
    clicks: Array<{ id: number; ip_address: string; device_id: string; user_agent: string; user_email?: string | null; user_id?: number | null; created_at: string }>;
    loading: boolean;
  }>({
    isOpen: false,
    domain: null,
    clicks: [],
    loading: false
  });

  const openClicksHistory = async (d: DomainItem) => {
    setClicksModal({
      isOpen: true,
      domain: d,
      clicks: [],
      loading: true
    });
    try {
      const backendUrl = "";
      const token = localStorage.getItem('token');
      const res = await axios.get(`${backendUrl}/api/domains/${d.id}/clicks-history`, {
        headers: {
          'x-user-id': user?.id?.toString() || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setClicksModal(prev => ({
        ...prev,
        clicks: res.data || [],
        loading: false
      }));
    } catch (err) {
      console.error('Failed to load clicks history:', err);
      toast.error("IP lar tarixini yuklab bo'lmadi");
      setClicksModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleResetClicks = async () => {
    try {
      const token = localStorage.getItem('token');
      const backendUrl = "";
      
      await axios.post(`${backendUrl}/api/admin/reset-clicks`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success("Barcha statistika muvaffaqiyatli nollandi!");
      setResetModalOpen(false);
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleSeedDemo = async () => {
    try {
      const token = localStorage.getItem('token');
      const backendUrl = "";
      
      await axios.post(`${backendUrl}/api/admin/seed-demo`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success("30 ta demo sayt muvaffaqiyatli yaratildi!");
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error("Xatolik yuz berdi");
    }
  };


  useEffect(() => {
    const savedUser = localStorage.getItem('top3_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      window.location.href = '/';
    }
  }, []);

  const handleLinkGoogle = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Token topilmadi');
      return;
    }
    const backendUrl = "";
      
    const url = `${backendUrl}/api/auth/google-link-redirect?token=${token}`;
    
    // @ts-ignore
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      // @ts-ignore
      window.Telegram.WebApp.openLink(url, { try_instant_view: false });
    } else {
      window.location.href = url;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('linked') === 'success') {
      toast.success("Google hisob muvaffaqiyatli ulandi!");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error')) {
      toast.error("Ulashda xatolik yuz berdi: " + params.get('error'));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!user || user.email !== 'yunusovabdulmajid@gmail.com') return;
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/admin/users', {
          headers: {
            'x-user-id': String(user?.id || ''),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        setUsersList(res.data || []);
      } catch (err) {
        console.error('Error fetching admin users:', err);
      }
    };
    fetchUsers();
  }, [user]);

  const handleAssignOwner = async (domainId: number, newUserId: number) => {
    try {
      const token = localStorage.getItem('token');
      const targetUser = usersList.find(u => u.id === newUserId);
      const res = await axios.put(`/api/domains/${domainId}/owner`, { user_id: newUserId }, {
        headers: {
          'x-user-id': String(user?.id || ''),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setDomains(prev => prev.map(d => d.id === domainId ? { 
        ...d, 
        owner_id: newUserId, 
        owner_email: targetUser ? targetUser.email : d.owner_email 
      } : d));
      toast.success(res.data?.message || 'Domen egasi muvaffaqiyatli almashtirildi!');
      setOwnerModal({ isOpen: false, domain: null, searchTerm: '', loading: false });
    } catch (err: any) {
      console.error('Error changing owner:', err);
      toast.error(err.response?.data?.detail || 'Domen egasini almashtirishda xatolik yuz berdi');
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchMyDomains = async () => {
      try {
        const backendUrl = "";
        const token = localStorage.getItem('token');
        
        const res = await axios.get(`${backendUrl}/api/domains/my`, {
          headers: {
            'x-user-id': String(user?.id || ''),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        const mapped = res.data.map((d: any) => ({
          id: d.id,
          dom: d.name,
          desc: d.description || '—',
          cat: d.category || 'Boshqa',
          price: d.current_price,
          clicks: d.click_count,
          addedAt: new Date(d.created_at).getTime(),
          type: d.board_type,
          isPaid: d.current_price && d.current_price > 0,
          is_sponsored: d.is_sponsored,
          owner_id: d.owner_id,
          status: d.status,
          owner_email: d.owner_email,
          is_demo: d.is_demo,
          is_deleted: d.is_deleted
        }));
        setDomains(mapped);
      } catch (err: any) {
        console.error('Error fetching my domains:', err);
        if (err.response?.status === 401) {
          toast.error("Sessiya vaqti tugagan. Iltimos, tizimga qaytadan kiring.");
          localStorage.removeItem('token');
          localStorage.removeItem('top3_user');
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else {
          toast.error("Domenlarni yuklashda xatolik yuz berdi.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMyDomains();
  }, [user]);

  const handleDeleteClick = (id: number) => {
    setConfirmState({ isOpen: true, domainId: id });
  };

  const executeDelete = async () => {
    if (!confirmState.domainId) return;
    try {
      const backendUrl = "";
      const token = localStorage.getItem('token');
      
      await axios.delete(`${backendUrl}/api/domains/${confirmState.domainId}`, {
        headers: {
          'x-user-id': user?.id.toString(),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setDomains(prev => prev.filter(d => d.id !== confirmState.domainId));
      toast.success("Muvaffaqiyatli o'chirildi");
    } catch (err) {
      console.error('Error deleting domain:', err);
      toast.error('Xatolik yuz berdi');
    } finally {
      setConfirmState({ isOpen: false, domainId: null });
    }
  };

  const handleCategoryChange = async (id: number, newCategory: string) => {
    try {
      const backendUrl = "";
      const token = localStorage.getItem('token');
      await axios.put(`${backendUrl}/api/domains/${id}/category`, { category: newCategory }, {
        headers: {
          'x-user-id': String(user?.id || ''),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setDomains(prev => prev.map(d => d.id === id ? { ...d, cat: newCategory } : d));
      toast.success("Kategoriya yangilandi");
    } catch (err) {
      console.error('Error updating category:', err);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleTariffChange = async (id: number, newTariff: string) => {
    try {
      const backendUrl = "";
      const token = localStorage.getItem('token');
      await axios.put(`${backendUrl}/api/domains/${id}/tariff`, { tariff: newTariff }, {
        headers: {
          'x-user-id': String(user?.id || ''),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      setDomains(prev => prev.map(d => {
        if (d.id === id) {
          if (newTariff === 'sponsor') {
            return { ...d, is_sponsored: true };
          } else if (newTariff === 'pullik') {
            return { ...d, is_sponsored: false, isPaid: true, price: d.price || 15000 };
          } else {
            return { ...d, is_sponsored: false, isPaid: false, price: 0 };
          }
        }
        return d;
      }));
      toast.success("Tarif yangilandi");
    } catch (err) {
      console.error('Error updating tariff:', err);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const backendUrl = "";
      const token = localStorage.getItem('token');
      await axios.put(`${backendUrl}/api/domains/${id}/status`, { status: newStatus }, {
        headers: {
          'x-user-id': String(user?.id || ''),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setDomains(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      toast.success("Status yangilandi");
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleClicksChange = async (id: number, currentClicks: number) => {
    const newVal = window.prompt("Yangi click (o'tishlar) sonini kiriting:", currentClicks.toString());
    if (newVal === null) return;
    const num = parseInt(newVal, 10);
    if (isNaN(num) || num < 0) {
      toast.error("Noto'g'ri son kiritildi!");
      return;
    }
    
    try {
      const backendUrl = "";
      const token = localStorage.getItem('token');
      await axios.put(`${backendUrl}/api/domains/${id}/clicks`, { clicks: num }, {
        headers: {
          'x-user-id': String(user?.id || ''),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setDomains(prev => prev.map(d => d.id === id ? { ...d, clicks: num } : d));
      toast.success("Clicklar soni yangilandi");
    } catch (err) {
      console.error('Error updating clicks:', err);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleRefresh = async (id: number) => {
    try {
      await axios.post(`/api/domains/${id}/refresh`, {}, {
        headers: {
          'x-user-id': String(user?.id || '')
        }
      });
      window.location.reload();
    } catch (err: any) {
      console.error('Error refreshing domain:', err);
      if (err.response?.data?.detail === 'REDIRECT_NOT_ALLOWED_FOR_FREE') {
        toast.error("Bu domen redirect qilyapti. Redirect faqat pullik tarifda ruxsat etiladi!");
        setRedirectErrorDomains(prev => [...prev, id]);
      } else {
        toast.error('Xatolik yuz berdi');
      }
    }
  };

  return (
    <section className="site pt-4 sm:pt-6 pb-16" style={{ minHeight: '100vh' }}>
      <div className="wrap">
        {/* Compact Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-400">Shaxsiy kabinet</span>
              {user?.email && !user.email.endsWith('@telegram.me') && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  ✉️ {user.email}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5 font-mono">
                {domains.length} ta domen
              </span>
              {user?.email === 'yunusovabdulmajid@gmail.com' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono flex items-center gap-1.5" title="Bazadagi barcha foydalanuvchilar soni">
                  <span>👥</span>
                  <span>{usersList.length} ta user</span>
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white mt-1">
              {user?.email === 'yunusovabdulmajid@gmail.com' ? 'Barcha domenlar (Admin nazorati)' : 'Mening domenlarim'}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {user?.email?.endsWith('@telegram.me') && (
              <button 
                onClick={handleLinkGoogle} 
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#fff" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/><path fill="#fff" d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"/><path fill="#fff" d="M5.27 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.27V6.62H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.11z"/><path fill="#fff" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.23 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77z"/></svg>
                Google hisobni ulash
              </button>
            )}

            {user?.email === 'yunusovabdulmajid@gmail.com' && (
              <>
                <button 
                  onClick={handleSeedDemo}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-sm cursor-pointer"
                >
                  + 30 ta Sayt yaratish
                </button>
                <button 
                  onClick={() => setResetModalOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-medium transition cursor-pointer"
                >
                  O'tishlarni nollash
                </button>
              </>
            )}
          </div>
        </div>

        {/* Domains List */}
        <div>
          {loading ? (
            <div className="flex flex-col gap-2">
              <div className="h-16 rounded-xl bg-white/5 animate-pulse"></div>
              <div className="h-16 rounded-xl bg-white/5 animate-pulse"></div>
              <div className="h-16 rounded-xl bg-white/5 animate-pulse"></div>
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              {user?.email === 'yunusovabdulmajid@gmail.com' ? "Tizimda hali hech qanday domen mavjud emas." : "Siz hali hech qanday domen qo'shmagansiz."}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {domains.map((d) => (
                <div 
                  key={d.id} 
                  className="group flex flex-col md:flex-row md:items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#0f172a]/70 hover:bg-[#0f172a] border border-zinc-800/80 hover:border-zinc-700/80 transition-all shadow-sm"
                >
                  {/* Left: Favicon & Domain info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                      <img 
                        src={getDomainLogoUrl(d.dom, 64)} 
                        alt={d.dom} 
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = `<div style="width:100%;height:100%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;">${d.dom.charAt(0).toUpperCase()}</div>`;
                        }} 
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a 
                          href={`/site/${d.dom}`} 
                          className="text-sm font-bold text-white hover:text-indigo-400 transition-colors truncate"
                        >
                          {d.dom}
                        </a>
                        {d.is_sponsored && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                            Sponsor
                          </span>
                        )}
                        <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium border border-zinc-700/50">
                          {d.cat}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 truncate max-w-md sm:max-w-xl mt-0.5">
                        {d.desc}
                      </p>
                      
                      {user?.email === 'yunusovabdulmajid@gmail.com' && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <button
                            type="button"
                            onClick={() => setOwnerModal({ isOpen: true, domain: d, searchTerm: '', loading: false })}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 flex items-center gap-1.5 transition cursor-pointer group/owner"
                            title="Domen egasini almashtirish uchun bosing"
                          >
                            <span className="text-zinc-500">👤 Ega:</span>
                            <span className="font-mono text-indigo-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
                              {d.owner_email || "Egasiz (biriktirish)"}
                            </span>
                            <span className="text-[10px] text-zinc-400 group-hover/owner:text-indigo-300 ml-0.5">
                              ✏️ almashtirish
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Stats, Admin Selects & Action Buttons */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/60">
                    {/* Clicks counter */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="text-right cursor-pointer flex items-center gap-1.5 bg-zinc-800/60 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700/50 transition"
                        onClick={() => user?.email === 'yunusovabdulmajid@gmail.com' && handleClicksChange(d.id!, d.clicks || 0)}
                        title={user?.email === 'yunusovabdulmajid@gmail.com' ? "Tahrirlash uchun bosing" : ""}
                      >
                        <span className="font-mono text-sm font-bold text-white">{d.clicks || 0}</span>
                        <span className="text-[10px] text-zinc-400">o'tish</span>
                        {user?.email === 'yunusovabdulmajid@gmail.com' && <span className="text-[10px] opacity-40 hover:opacity-100">✏️</span>}
                      </div>

                      {/* ONLY SHOW IP BUTTON IF CLICKS > 0 */}
                      {Boolean(d.clicks && d.clicks > 0) && (
                        <button
                          type="button"
                          onClick={() => openClicksHistory(d)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-all flex items-center gap-1 font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg border border-indigo-500/20 cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
                          title="Ushbu saytga click bosgan IP lar ro'yxati"
                        >
                          <span>🌐</span>
                          <span>IP lar ({d.clicks})</span>
                        </button>
                      )}
                    </div>

                    {/* Admin controls */}
                    {user?.email === 'yunusovabdulmajid@gmail.com' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <select 
                          value={d.status || 'pending'} 
                          onChange={(e) => handleStatusChange(d.id!, e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-1 outline-none hover:border-zinc-600 focus:border-indigo-500 transition cursor-pointer"
                        >
                          <option value="active" className="bg-[#1a1a1a]">Faol</option>
                          <option value="pending" className="bg-[#1a1a1a]">Kutishda</option>
                          <option value="banned" className="bg-[#1a1a1a]">Bloklangan</option>
                        </select>
                        <select
                          value={d.cat}
                          onChange={(e) => handleCategoryChange(d.id!, e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-1 outline-none max-w-[130px] hover:border-zinc-600 focus:border-indigo-500 transition cursor-pointer"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>
                          ))}
                        </select>
                        <select
                          value={d.is_sponsored ? 'sponsor' : (d.isPaid ? 'pullik' : 'bepul')}
                          onChange={(e) => handleTariffChange(d.id!, e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-1 outline-none hover:border-zinc-600 focus:border-indigo-500 transition cursor-pointer"
                        >
                          <option value="bepul" className="bg-[#1a1a1a]">Bepul</option>
                          <option value="pullik" className="bg-[#1a1a1a]">Pullik</option>
                          <option value="sponsor" className="bg-[#1a1a1a]">Sponsor</option>
                        </select>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!redirectErrorDomains.includes(d.id!) && (
                        <button 
                          onClick={() => handleRefresh(d.id!)}
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs cursor-pointer"
                          title="Qayta yuklash"
                        >
                          🔄
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteClick(d.id!)}
                        className={`p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-xs cursor-pointer ${redirectErrorDomains.includes(d.id!) ? 'animate-pulse bg-red-500/30 ring-2 ring-red-500' : ''}`}
                        title="O'chirish"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title="Domen o'chirish"
        message="Rostdan ham ushbu domenni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi."
        onConfirm={executeDelete}
        onCancel={() => setConfirmState({ isOpen: false, domainId: null })}
        confirmText="O'chirish"
      />
      <ConfirmModal 
        isOpen={resetModalOpen}
        title="Barcha statistikanis nollash"
        message="Haqiqatan ham barcha statistika nollansinmi? Bu amalni ortga qaytarib bo'lmaydi va tizimdagi barcha o'tishlar soni 0 ga tushadi."
        onConfirm={handleResetClicks}
        onCancel={() => setResetModalOpen(false)}
        confirmText="Nollash"
      />

      {/* IP LAR RO'YXATI MODAL */}
      {clicksModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f172a] border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl text-zinc-100 flex flex-col max-h-[85vh] relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌐</span>
                  <h3 className="text-xl font-bold text-white tracking-tight">{clicksModal.domain?.dom}</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Saytga o'tgan unikal IP manzillar tarixi (sana va soniyasi bilan)
                </p>
              </div>
              <button 
                onClick={() => setClicksModal({ isOpen: false, domain: null, clicks: [], loading: false })}
                className="w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {clicksModal.loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">IP lar tarixi yuklanmoqda...</span>
                </div>
              ) : clicksModal.clicks.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-sm">Hozircha bironta ham unikal tashrif qayd etilmagan.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider px-2 flex justify-between">
                    <span>IP Manzil & Qurilma</span>
                    <span>Sana va vaqt (soniyasi bilan)</span>
                  </div>
                  {clicksModal.clicks.map((click, index) => (
                    <div 
                      key={click.id || index}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 hover:border-indigo-500/30 transition-all gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center shrink-0 border border-zinc-700/50">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-mono text-sm font-bold text-indigo-400 flex items-center gap-2 flex-wrap">
                            <span>{click.ip_address}</span>
                            {click.user_email && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold" title="Ushbu tashrif vaqtida tizimga kirgan foydalanuvchi">
                                <span>✉️</span>
                                <span>{click.user_email}</span>
                              </span>
                            )}
                          </div>
                          {click.user_agent && click.user_agent !== '—' && (
                            <p className="text-[11px] text-zinc-500 truncate max-w-xs sm:max-w-md mt-0.5" title={click.user_agent}>
                              {click.user_agent}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20 shadow-sm">
                          {click.created_at}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-zinc-800/80 mt-4 flex items-center justify-between text-xs text-zinc-400">
              <span>Jami unikal tashriflar: <strong className="text-white font-mono text-sm">{clicksModal.clicks.length} ta</strong></span>
              <button 
                onClick={() => setClicksModal({ isOpen: false, domain: null, clicks: [], loading: false })}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DOMEN EGASINI ALMASHTIRISH SEARCHABLE MODAL */}
      {ownerModal.isOpen && ownerModal.domain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f172a] border border-zinc-800 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl text-zinc-100 flex flex-col max-h-[85vh] relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">👤</span>
                  <h3 className="text-lg font-bold text-white tracking-tight">Domen egasini almashtirish</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Domen: <strong className="text-indigo-400 font-mono">{ownerModal.domain.dom}</strong>
                </p>
              </div>
              <button 
                onClick={() => setOwnerModal({ isOpen: false, domain: null, searchTerm: '', loading: false })}
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Owner Info */}
            <div className="mb-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs flex items-center justify-between">
              <span className="text-zinc-400">Hozirgi biriktirilgan ega:</span>
              <span className="font-mono font-semibold text-emerald-400 truncate max-w-[220px]">
                {ownerModal.domain.owner_email || "Biriktirilmagan"}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <input
                type="text"
                autoFocus
                value={ownerModal.searchTerm}
                onChange={(e) => setOwnerModal(prev => ({ ...prev, searchTerm: e.target.value }))}
                placeholder="🔍 Email yoki ID bo'yicha qidirish..."
                className="w-full bg-zinc-900 border border-zinc-700/80 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition"
              />
              {ownerModal.searchTerm && (
                <button
                  onClick={() => setOwnerModal(prev => ({ ...prev, searchTerm: '' }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Users List with Real-time Search */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[220px] max-h-[380px]">
              {(() => {
                const filtered = usersList.filter(u => 
                  u.email.toLowerCase().includes(ownerModal.searchTerm.toLowerCase()) ||
                  u.id.toString().includes(ownerModal.searchTerm)
                );

                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center text-zinc-500">
                      <div className="text-2xl mb-1">🔍</div>
                      <p className="text-xs">Bunday foydalanuvchi topilmadi.</p>
                    </div>
                  );
                }

                return filtered.map((u) => {
                  const isCurrent = ownerModal.domain?.owner_id === u.id || ownerModal.domain?.owner_email === u.email;
                  return (
                    <div
                      key={u.id}
                      onClick={() => !isCurrent && handleAssignOwner(ownerModal.domain!.id!, u.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isCurrent 
                          ? 'bg-emerald-500/10 border-emerald-500/30 cursor-default'
                          : 'bg-zinc-900/50 hover:bg-indigo-600/15 border-zinc-800 hover:border-indigo-500/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 text-xs font-mono font-bold flex items-center justify-center shrink-0 border border-zinc-700/60">
                          #{u.id}
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-xs sm:text-sm font-semibold text-white truncate" title={u.email}>
                            {u.email}
                          </p>
                          {u.created_at && (
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              Ro'yxatdan o'tgan: {u.created_at.slice(0, 10)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 ml-3">
                        {isCurrent ? (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            ✓ Hozirgi ega
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-medium text-indigo-400 hover:text-white bg-indigo-500/15 hover:bg-indigo-600 px-3 py-1 rounded-lg border border-indigo-500/30 transition shadow-sm cursor-pointer"
                          >
                            Tanlash
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-zinc-800/80 mt-3 flex items-center justify-between text-xs text-zinc-400">
              <span>Jami: <strong className="text-white font-mono">{usersList.length} ta</strong> foydalanuvchi</span>
              <button 
                onClick={() => setOwnerModal({ isOpen: false, domain: null, searchTerm: '', loading: false })}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Profile;
