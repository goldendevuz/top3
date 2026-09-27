import { useEffect, useState } from 'react';
import axios from 'axios';
import { DomainItem } from '../store/useBoardStore';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

const Profile = () => {
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [redirectErrorDomains, setRedirectErrorDomains] = useState<number[]>([]);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; domainId: number | null }>({ isOpen: false, domainId: null });
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const handleResetClicks = async () => {
    try {
      const token = localStorage.getItem('token');
      const backendUrl = window.location.hostname.includes('localhost') 
        ? 'http://localhost:8000' 
        : 'https://piglet-factual-mentally.ngrok-free.app';
      
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
      const backendUrl = window.location.hostname.includes('localhost') 
        ? 'http://localhost:8000' 
        : 'https://piglet-factual-mentally.ngrok-free.app';
      
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

  const handleToggleDemo = async () => {
    try {
      const token = localStorage.getItem('token');
      const backendUrl = window.location.hostname.includes('localhost') 
        ? 'http://localhost:8000' 
        : 'https://piglet-factual-mentally.ngrok-free.app';
      
      await axios.post(`${backendUrl}/api/admin/toggle-demo`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success("Demo saytlar holati o'zgartirildi!");
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
    const backendUrl = window.location.hostname.includes('localhost') 
      ? 'http://localhost:8000' 
      : 'https://piglet-factual-mentally.ngrok-free.app';
      
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
    if (!user) return;
    const fetchMyDomains = async () => {
      try {
        const backendUrl = window.location.hostname.includes('localhost') 
          ? 'http://localhost:8000' 
          : 'https://piglet-factual-mentally.ngrok-free.app';
        const token = localStorage.getItem('token');
        
        const res = await axios.get(`${backendUrl}/api/domains/my`, {
          headers: {
            'x-user-id': user.id.toString(),
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
          owner_email: d.owner_email
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
      const backendUrl = window.location.hostname.includes('localhost') 
        ? 'http://localhost:8000' 
        : 'https://piglet-factual-mentally.ngrok-free.app';
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

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await axios.put(`http://localhost:8000/api/domains/${id}/status`, { status: newStatus }, {
        headers: {
          'x-user-id': user.id.toString()
        }
      });
      setDomains(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      toast.success("Status yangilandi");
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleRefresh = async (id: number) => {
    try {
      await axios.post(`http://localhost:8000/api/domains/${id}/refresh`, {}, {
        headers: {
          'x-user-id': user.id.toString()
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
    <section className="site pt-32 pb-24" style={{ minHeight: '100vh' }}>
      <div className="wrap">
        <div className="section-head reveal in">
          <div className="flex justify-between items-center w-full">
            <div>
              <span className="kicker">Shaxsiy kabinet</span>
              <h2>{user?.email === 'yunusovabdulmajid@gmail.com' ? 'Barcha domenlar (Admin nazorati)' : 'Mening domenlarim'}</h2>
            </div>
            {user?.email === 'yunusovabdulmajid@gmail.com' && (
              <div className="flex gap-2 flex-wrap justify-end">
                <button 
                  onClick={handleSeedDemo}
                  className="btn py-2 px-4 shadow-lg transition-all duration-300"
                  style={{ backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', fontSize: '14px' }}
                >
                  30 ta Demo yaratish
                </button>
                <button 
                  onClick={handleToggleDemo}
                  className="btn py-2 px-4 shadow-lg transition-all duration-300"
                  style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '8px', fontSize: '14px' }}
                >
                  Demo yoqish/o'chirish
                </button>
                <button 
                  onClick={() => setResetModalOpen(true)}
                  className="btn py-2 px-4 shadow-lg transition-all duration-300"
                  style={{ backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', fontSize: '14px' }}
                >
                  O'tishlarni nollash
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="profile-container mt-8" style={{ background: 'var(--surface)', borderRadius: '24px', padding: '24px', border: 'none', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 15px 40px -25px rgb(var(--shadow)/.3)', marginBottom: '24px' }}>
          <h3 className="text-xl font-bold mb-4 text-[var(--ink)]">Hisob sozlamalari</h3>
          <div className="flex items-center gap-4">
            {user?.email?.endsWith('@telegram.me') ? (
              <div>
                <p className="text-[var(--ink-soft)] text-sm mb-2">Google hisobingiz ulanmagan. Birlashtirish tavsiya etiladi.</p>
                <button 
                  onClick={() => handleLinkGoogle()} 
                  className="btn btn-google text-sm py-2 px-4 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.27V6.62H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.11z"/><path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.23 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77z"/></svg>
                  Google hisobni ulash
                </button>
              </div>
            ) : (
              <div className="bg-green-500/10 text-green-400 px-4 py-3 rounded-xl border border-green-500/20 w-full max-w-md">
                <p className="text-sm font-semibold mb-1">Bog'langan Google pochta:</p>
                <p className="opacity-90">{user?.email}</p>
              </div>
            )}
          </div>
        </div>

        <div className="profile-container" style={{ background: 'var(--surface)', borderRadius: '24px', padding: '24px', border: 'none', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 15px 40px -25px rgb(var(--shadow)/.3)' }}>
          <p className="text-[var(--ink-soft)] mb-8">
            Bu yerda siz o'zingiz qo'shgan barcha domenlarni ko'rishingiz va ularning statistikasini (o'tishlar sonini) kuzatishingiz mumkin.
          </p>

          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="skeleton-row" style={{ height: '80px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)' }}></div>
              <div className="skeleton-row" style={{ height: '80px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)' }}></div>
            </div>
          ) : domains.length === 0 ? (
            <div className="empty text-center py-12 text-[var(--muted)]">
              {user?.email === 'yunusovabdulmajid@gmail.com' ? "Tizimda hali hech qanday domen mavjud emas." : "Siz hali hech qanday domen qo'shmagansiz."}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {domains.map((d) => (
                <div key={d.id} className="domain-row group transition-all duration-300" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px 24px', background: 'var(--surface-2)', borderRadius: '16px', border: 'none', backdropFilter: 'blur(8px)', boxShadow: '0 10px 20px -10px rgb(var(--shadow)/.2)' }}>
                  
                  <div className="d-ava" style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={`https://www.google.com/s2/favicons?domain=${d.dom}&sz=64`} alt={d.dom} style={{ width: '32px', height: '32px' }} onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<div style="width:100%;height:100%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;">${d.dom.charAt(0).toUpperCase()}</div>`;
                    }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{d.dom}</h3>
                      {d.is_sponsored && <span style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--gold-soft)', color: 'var(--gold-strong)', borderRadius: '10px', fontWeight: 600 }}>Sponsor</span>}
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--ink-soft)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.desc}</p>
                    {user?.email === 'yunusovabdulmajid@gmail.com' && d.owner_email && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>Ega: {d.owner_email}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '4px 12px', background: 'var(--surface)', borderRadius: '8px', fontSize: '12px', color: 'var(--ink-soft)', fontWeight: 600 }}>
                      {d.cat}
                    </div>
                    
                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                        {d.clicks || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>jami o'tishlar</div>
                    </div>
                  </div>

                  {user?.email === 'yunusovabdulmajid@gmail.com' && (
                    <div className="flex gap-2 ml-4">
                      <select 
                        value={d.status || 'pending'} 
                        onChange={(e) => handleStatusChange(d.id!, e.target.value)}
                        className="bg-transparent border border-[var(--ink-soft)] text-[var(--ink)] text-sm rounded-lg px-2 py-1 outline-none"
                      >
                        <option value="active" className="bg-[#1a1a1a]">Faol</option>
                        <option value="pending" className="bg-[#1a1a1a]">Kutishda</option>
                        <option value="banned" className="bg-[#1a1a1a]">Bloklangan</option>
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 ml-4">
                    {!redirectErrorDomains.includes(d.id!) && (
                      <button 
                        onClick={() => handleRefresh(d.id!)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="Qayta yuklash"
                      >
                        🔄
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteClick(d.id!)}
                      className={`p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors ${redirectErrorDomains.includes(d.id!) ? 'animate-pulse bg-red-500/30 ring-2 ring-red-500' : ''}`}
                      title="O'chirish"
                    >
                      🗑️
                    </button>
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
    </section>
  );
};

export default Profile;
