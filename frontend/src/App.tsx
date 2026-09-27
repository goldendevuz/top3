import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Board from './components/Board';
import { AddDomain } from './components/AddDomain';
import { AddFreeDomain } from './components/AddFreeDomain';
import { SEO } from './components/SEO';
import { useBoardStore } from './store/useBoardStore';
import DailyBoard from './components/DailyBoard';
import Profile from './components/Profile';
import Categories from './components/Categories';
import { useAuthStore } from './store/useAuthStore';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "your_google_client_id_here";

const toasterConfig = {
  className: 'bg-slate-800 text-white border border-slate-700',
  style: {
    background: '#1e293b',
    color: '#fff',
    border: '1px solid #334155',
  },
  success: {
    iconTheme: {
      primary: '#4ade80',
      secondary: '#1e293b',
    },
  },
  error: {
    iconTheme: {
      primary: '#f87171',
      secondary: '#1e293b',
    },
  },
};

/* ─── Page Layouts ─── */

const HomePage = () => (
  <div className="flex flex-col min-h-screen">
    <SEO />
    <Header />
    <main className="flex-1">
      <Hero />
      <Board />
      
      <section id="how">
        <div className="wrap">
          <div className="section-head reveal in">
            <div>
              <span className="kicker">Mexanika</span>
              <h2>Qanday ishlaydi</h2>
            </div>
          </div>
          <div className="how-grid reveal in">
            <div className="how-card">
              <div className="how-num">01</div>
              <h3>Bo'lim va narxni tanlaysiz</h3>
              <p>Pullik joylashda "Umumiy" (doimiy) yoki "Bugun" (faqat bir kunlik) bo'limini o'zingiz tanlaysiz — to'lagan narxingiz aynan shu bo'lim ichidagi o'rningizni belgilaydi.</p>
            </div>
            <div className="how-card">
              <div className="how-num">02</div>
              <h3>Yoki bepul, avtomatik</h3>
              <p>"Ochiq" bo'limga istalgan kishi bepul qo'shishi mumkin — domenni kiritishning o'zi yetarli, qolgan ma'lumotlar (tavsif, kategoriya) SEO orqali o'zi to'ldiriladi.</p>
            </div>
            <div className="how-card">
              <div className="how-num">03</div>
              <h3>Taxta jonli yangilanadi</h3>
              <p>Har bir yangi to'lov yoki unikal bosish darhol tegishli bo'limni qayta tartiblaydi. "Bugun" bo'limi esa har kuni nolinchidan qayta boshlanadi.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="wrap">
          <div className="section-head reveal in">
            <div>
              <span className="kicker">Tariflar</span>
              <h2>Uch yo'l bilan ro'yxatga kirish</h2>
            </div>
          </div>
          <div className="price-grid reveal in">
            <div className="price-card free">
              <span className="tag">Bepul (admin)</span>
              <h3>Umumiy bo'lim</h3>
              <div className="price-num">0 <small>so'm</small></div>
              <ul className="price-list">
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L19 7"/></svg>Faqat admin (Alventus) qo'sha oladi</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L19 7"/></svg>Tartib — unikal o'tishlar soni bo'yicha</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L19 7"/></svg>Umumiy bo'limdagi pullik joylardan pastda</li>
              </ul>
            </div>
            <div className="price-card paid">
              <span className="tag">Pullik</span>
              <h3>Umumiy yoki Bugun</h3>
              <div className="price-num">1 000 <small>so'm dan</small></div>
              <ul className="price-list">
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L19 7"/></svg>Umumiy bo'lim uchun to'lov bir marta qilinadi (doimiy).</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L19 7"/></svg>Bugun bo'limi uchun to'lov faqat bugun (24 soat) amal qiladi.</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L19 7"/></svg>Tanlagan bo'limingiz ichida faqat narx bo'yicha tartiblanasiz.</li>
              </ul>
            </div>
            <div className="price-card seo">
              <span className="tag">Ochiq / SEO</span>
              <h3>Har kim, bepul</h3>
              <div className="price-num">0 <small>so'm</small></div>
              <ul className="price-list">
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L19 7"/></svg>Istalgan kishi istalgan .uz domenini qo'shadi</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L19 7"/></svg>Tavsif va kategoriya SEO'dan avtomatik olinadi</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L19 7"/></svg>Alohida ochiq katalog, reytingsiz</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <AddDomain />
    </main>
    
    <footer>
      <div className="wrap foot-row">
        <div className="foot-brand"><span className="mark">T3</span>Top3</div>
        <span>Har bir .uz sayt uchun bitta joy. Tepaga chiqish — sizning qo'lingizda.</span>
        <span>top3.uz</span>
      </div>
    </footer>
  </div>
);

const AddFreePage = () => (
  <div className="flex flex-col min-h-screen bg-[#0A0E1D]">
    <SEO title="Bepul / Sponsor domen qo'shish — Top3" />
    <Header />
    <main className="flex-1">
      <AddFreeDomain />
    </main>
  </div>
);

const DailyPage = () => (
  <div className="flex flex-col min-h-screen">
    <SEO title="Kunlik reytinglar — Top3" />
    <Header />
    <main className="flex-1">
      <DailyBoard />
    </main>
  </div>
);

const CategoriesPage = () => (
  <div className="flex flex-col min-h-screen">
    <SEO title="Barcha Kategoriyalar — Top3" />
    <Header />
    <main className="flex-1">
      <Categories />
    </main>
  </div>
);

const ProfilePage = () => (
  <div className="flex flex-col min-h-screen">
    <SEO title="Mening profilim — Top3" />
    <Header />
    <main className="flex-1">
      <Profile />
    </main>
  </div>
);

/* ─── APP ─── */
function App() {
  const fetchDomains = useBoardStore(state => state.fetchDomains);
  const storeLogin = useAuthStore(state => state.login);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    
    if (token) {
      let userObj = null;
      if (userStr) {
        try {
          userObj = JSON.parse(decodeURIComponent(userStr));
        } catch (e) {
          console.error("Failed to parse user from URL", e);
        }
      }
      
      storeLogin(userObj || ({} as any), token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [storeLogin]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/add-free" element={<AddFreePage />} />
          <Route path="/daily" element={<DailyPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-center" toastOptions={toasterConfig} />
    </GoogleOAuthProvider>
  );
}

export default App;
