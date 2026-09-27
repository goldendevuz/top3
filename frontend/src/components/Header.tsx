import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import logo from '../assets/logo.png';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('top3_user');
    setUser(null);
    setDropdownOpen(false);
  };

  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('top3_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Telegram Native Auth
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initDataUnsafe?.user) {
      setIsTelegram(true);
      if (!savedUser) {
        const backendUrl = window.location.hostname.includes('localhost') 
          ? 'http://localhost:8000' 
          : 'https://piglet-factual-mentally.ngrok-free.app';
        axios.post(`${backendUrl}/api/auth/telegram`, tg.initDataUnsafe.user)
          .then(res => {
            setUser(res.data.user);
            localStorage.setItem('top3_user', JSON.stringify(res.data.user));
            localStorage.setItem('token', res.data.token);
            useAuthStore.getState().login(res.data.user, res.data.token);
          })
          .catch(err => console.error('Telegram auth error:', err));
      }
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const backendUrl = window.location.hostname.includes('localhost') 
          ? 'http://localhost:8000' 
          : 'https://piglet-factual-mentally.ngrok-free.app';
        const res = await axios.post(`${backendUrl}/api/auth/google`, {
          access_token: tokenResponse.access_token
        });
        setUser(res.data);
        localStorage.setItem('top3_user', JSON.stringify(res.data));
        localStorage.setItem('token', tokenResponse.access_token);
        useAuthStore.getState().login(res.data, tokenResponse.access_token);
      } catch (err) {
        console.error('Google login backend error:', err);
      }
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(false);
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  const isHome = location.pathname === '/';

  return (
    <header className={`site ${scrolled ? 'bg-slate-900/50 backdrop-blur-md shadow-lg shadow-indigo-500/20 scrolled' : 'bg-transparent'}`} id="siteHeader">
      <div className="wrap nav">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={logo} alt="Top3 Logo" style={{ height: '32px', objectFit: 'contain' }} />
          <Link to="/"><span>Top3</span></Link>
        </div>
        <nav className="navlinks">
          <Link to="/" className={location.pathname === '/' ? 'text-indigo-400' : ''}>Asosiy</Link>
          <Link to="/daily" className={location.pathname === '/daily' ? 'text-indigo-400' : ''}>Kunlik</Link>
          <Link to="/add-free" className={location.pathname === '/add-free' ? 'text-indigo-400' : ''}>Bepul qo'shish</Link>
          {isHome && (
            <>
              <a href="#how">Qanday ishlaydi</a>
              <a href="#pricing">Narxlar</a>
              <a href="#add">Sayt qo'shish</a>
            </>
          )}
        </nav>
        <div className="navcta">
          {user ? (
            <div style={{ position: 'relative' }}>
              <div 
                className="user-chip" 
                onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '4px 12px 4px 4px', borderRadius: '20px', cursor: 'pointer' }}
              >
                {user.picture ? (
                  <img src={user.picture} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                    {user.name?.charAt(0) || user.email?.charAt(0)}
                  </div>
                )}
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>{user.name || user.email}</span>
              </div>
              
              {dropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', minWidth: '200px', zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  <div style={{ padding: '8px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '4px', wordBreak: 'break-all' }}>
                    {user.email}
                  </div>
                  <button 
                    onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', color: 'var(--ink)', border: 'none', cursor: 'pointer', fontSize: '14px', borderRadius: '8px' }} 
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} 
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Mening profilim
                  </button>
                  <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', color: '#ff4d4d', border: 'none', cursor: 'pointer', fontSize: '14px', borderRadius: '8px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,77,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    Tizimdan chiqish
                  </button>
                </div>
              )}
            </div>
          ) : isTelegram ? null : (
            <button className="btn btn-google shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300" id="googleBtn" onClick={() => login()}>
              <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.27V6.62H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.11z"/><path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.23 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77z"/></svg>
              Google bilan kirish
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
