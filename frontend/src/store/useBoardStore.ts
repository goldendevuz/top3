import { create } from 'zustand';
import axios from 'axios';

export type DomainType = 'umumiy' | 'bugun' | 'ochiq';

export interface DomainItem {
  id?: number;
  dom: string;
  desc: string;
  cat: string;
  price?: number;
  clicks?: number;
  addedToday?: boolean;
  addedAt: number;
  seo?: boolean;
  type: DomainType;
  isPaid?: boolean;
  is_sponsored?: boolean;
  status?: string;
  owner_email?: string;
  custom_url?: string;
  custom_cta?: string;
  custom_description?: string;
  custom_banner?: string;
}

interface BoardStore {
  domains: DomainItem[];
  fetchDomains: () => Promise<void>;
  simulateClick: () => void;
  registerVisit: (dom_id: number) => Promise<void>;
}

const backendUrl = "";

const DEMO_UMUMIY_PAID: DomainItem[] = [
  { dom: 'asaxiy-shop.uz',   desc: "Maishiy texnika va kitoblar do'koni", cat: "Onlayn do'konlar va Savdo", clicks: 14250, addedAt: Date.now() - 3600000*24, type: 'umumiy', isPaid: true, price: 35000 },
  { dom: 'olx-savdo.uz',      desc: "E'lonlar doskasi, oldi-sotdi",        cat: "Onlayn do'konlar va Savdo", clicks: 8340,  addedAt: Date.now() - 3600000*48, type: 'umumiy', isPaid: true, price: 25000 },
  { dom: 'click-pay.uz',    desc: "Elektron to'lovlar va pul o'tkazmalari", cat: "Biznes, Moliya va Huquq", clicks: 5120,  addedAt: Date.now() - 3600000*12, type: 'umumiy', isPaid: true, price: 20000 },
  { dom: 'payme-app.uz',    desc: "To'lov tizimi, pul o'tkazmalari",     cat: "Biznes, Moliya va Huquq", clicks: 4100,  addedAt: Date.now() - 3600000*72, type: 'umumiy', isPaid: true, price: 15000 },
  { dom: 'daryo-news.uz',    desc: "O'zbekiston va jahon yangiliklari",   cat: "Yangiliklar va OAV",     clicks: 3500,  addedAt: Date.now() - 3600000*96, type: 'umumiy', isPaid: true, price: 10000 },
  { dom: 'kun-uzb.uz',      desc: "Eng so'nggi yangiliklar, maqolalar",  cat: "Yangiliklar va OAV",     clicks: 2900,  addedAt: Date.now() - 3600000*120, type: 'umumiy', isPaid: true, price: 5000 },
].map((d, i) => ({ ...d, id: -100 - i }));

const DEMO_BUGUN_PAID: DomainItem[] = [
  { dom: 'texnomart-uz.uz', desc: "Texnika va elektronika onlayn do'koni", cat: "Onlayn do'konlar va Savdo", clicks: 420, addedAt: Date.now() - 3600000, addedToday: true, type: 'bugun', isPaid: true, price: 15000 },
  { dom: 'alif-shop.uz',      desc: "Muddatli to'lovga texnika va narsalar", cat: "Onlayn do'konlar va Savdo", clicks: 310, addedAt: Date.now() - 3600000*2, addedToday: true, type: 'bugun', isPaid: true, price: 12000 },
  { dom: 'uzum-market.uz',      desc: "Marketpleys va tezkor yetkazib berish", cat: "Onlayn do'konlar va Savdo", clicks: 250, addedAt: Date.now() - 3600000*3, addedToday: true, type: 'bugun', isPaid: true, price: 9000 },
  { dom: 'makro-super.uz',     desc: "Oziq-ovqat va ro'zg'or buyumlari",    cat: "Onlayn do'konlar va Savdo", clicks: 180, addedAt: Date.now() - 3600000*4, addedToday: true, type: 'bugun', isPaid: true, price: 5000 },
  { dom: 'korzinka-uz.uz',  desc: "Supermarketlar tarmog'i aksiyalari",  cat: "Onlayn do'konlar va Savdo", clicks: 110, addedAt: Date.now() - 3600000*5, addedToday: true, type: 'bugun', isPaid: true, price: 2000 },
].map((d, i) => ({ ...d, id: -200 - i }));

const DEMO_FREE: DomainItem[] = [
  { dom: 'pdp-uz.uz',      desc: "IT akademiyasi, dasturlash kurslari",   cat: "Ta'lim va O'quv markazlari", clicks: 800, addedAt: Date.now() - 3600000*8, type: 'umumiy', isPaid: false },
  { dom: 'najottalim-uz.uz', desc: "Zamonaviy kasblar markazi",          cat: "Ta'lim va O'quv markazlari", clicks: 650, addedAt: Date.now() - 3600000*15, type: 'umumiy', isPaid: false },
  { dom: 'my-gov.uz',   desc: "Yagona interaktiv davlat xizmatlari",  cat: "Biznes, Moliya va Huquq", clicks: 1200, addedAt: Date.now() - 3600000*20, type: 'umumiy', isPaid: false },
  { dom: 'uzrailway-demo.uz', desc: "O'zbekiston temir yo'llari chiptalari", cat: "Sayohat va Turizm",       clicks: 450, addedAt: Date.now() - 3600000*30, type: 'umumiy', isPaid: false },
  { dom: 'yandex-uz.uz',   desc: "Qidiruv, taksi va yetkazib berish",    cat: "Xizmat ko'rsatish",         clicks: 3400, addedAt: Date.now() - 3600000*40, type: 'umumiy', isPaid: false },
  { dom: 'islom-uz.uz',    desc: "Diniy-ma'rifiy portal, namoz vaqtlari", cat: "Boshqa",                    clicks: 2100, addedAt: Date.now() - 3600000*50, type: 'umumiy', isPaid: false },
  { dom: 'sport-uz.uz',    desc: "O'zbek sporti va futbol yangiliklari",  cat: "Sport va Salomatlik",       clicks: 320, addedAt: Date.now() - 3600000*2, addedToday: true, type: 'bugun', isPaid: false },
  { dom: 'hh-uz.uz',       desc: "Bo'sh ish o'rinlari va vakansiyalar",   cat: "Ish, Karyera va Vakansiyalar", clicks: 540, addedAt: Date.now() - 3600000*3, addedToday: true, type: 'bugun', isPaid: false },
].map((d, i) => ({ ...d, id: -300 - i }));

function mergeDemoData(real: DomainItem[]): DomainItem[] {
  // Demo data is disabled as per user request
  return real;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  domains: mergeDemoData([]),
  fetchDomains: async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/domains/`);
      if (res.data && Array.isArray(res.data)) {
        const parsed = res.data.map((d: any) => ({
          id: d.id,
          dom: d.name,
          desc: d.description || '—',
          cat: d.category || 'Boshqa',
          price: d.current_price,
          clicks: d.click_count,
          addedToday: new Date(d.created_at).toDateString() === new Date().toDateString(),
          addedAt: new Date(d.created_at).getTime(),
          seo: d.board_type === 'ochiq',
          type: d.board_type,
          isPaid: d.current_price > 0,
          is_sponsored: d.is_sponsored,
          custom_url: d.custom_url,
          custom_cta: d.custom_cta,
          custom_description: d.custom_description,
          custom_banner: d.custom_banner
        }));
        set({ domains: mergeDemoData(parsed) });
      }
    } catch (err) {
      console.error('Failed to fetch domains', err);
    }
  },
  simulateClick: () => {
    const { domains, registerVisit } = get();
    const freeDomains = domains.filter(d => !d.isPaid && d.type !== 'bugun');
    if (freeDomains.length > 0) {
      const pick = freeDomains[Math.floor(Math.random() * freeDomains.length)];
      if (pick.id) registerVisit(pick.id);
    }
  },
  registerVisit: async (dom_id: number) => {
    set(state => ({
      domains: state.domains.map(d =>
        d.id === dom_id && d.clicks !== undefined ? { ...d, clicks: d.clicks + 1 } : d
      )
    }));
    try {
      await axios.post(`${backendUrl}/api/domains/${dom_id}/visit`);
    } catch(err) {
      console.error('Failed to register visit', err);
    }
  }
}));
