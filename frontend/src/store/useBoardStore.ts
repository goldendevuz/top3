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
}

interface BoardStore {
  domains: DomainItem[];
  fetchDomains: () => Promise<void>;
  simulateClick: () => void;
  registerVisit: (dom_id: number) => Promise<void>;
}

const backendUrl = "";

export const useBoardStore = create<BoardStore>((set, get) => ({
  domains: [],
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
          custom_description: d.custom_description
        }));
        set({ domains: parsed });
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
