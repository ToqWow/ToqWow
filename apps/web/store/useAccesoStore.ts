import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AccesoState {
  plan: 'FREE' | 'PREMIUM';
  planVence: string | null;
  packsComprados: string[];
  token: string | null;
  padreId: string | null;
  setToken: (t: string, pid: string) => void;
  setPremium: (vence: string) => void;
  addPack: (packId: string) => void;
  tieneMundo: (mundoId: number, packId: string | null) => boolean;
  logout: () => void;
}

export const useAccesoStore = create<AccesoState>()(
  persist(
    (set, get) => ({
      plan: 'FREE',
      planVence: null,
      packsComprados: [],
      token: null,
      padreId: null,
      setToken: (token, padreId) => set({ token, padreId }),
      setPremium: (planVence) => set({ plan: 'PREMIUM', planVence }),
      addPack: (packId) => set(s => ({ packsComprados: [...new Set([...s.packsComprados, packId])] })),
      tieneMundo: (mundoId, packId) => {
        if (mundoId === 0) return true;
        const { plan, planVence, packsComprados } = get();
        if (plan === 'PREMIUM' && planVence && new Date(planVence) > new Date()) return true;
        if (!packId) return false;
        return packsComprados.includes(packId);
      },
      logout: () => set({ token: null, padreId: null, plan: 'FREE', planVence: null, packsComprados: [] }),
    }),
    { name: 'toqwow-acceso' }
  )
);
