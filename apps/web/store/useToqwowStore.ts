import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ToqwowAvatar {
  colorPelaje: string;
  colorAntenita1: string;
  colorAntenita2: string;
  accesorios: string[];
}

interface ToqwowState {
  avatar: ToqwowAvatar;
  mundoActual: number;
  setMundo: (id: number) => void;
  updateAvatar: (p: Partial<ToqwowAvatar>) => void;
  addAccesorio: (id: string) => void;
}

export const useToqwowStore = create<ToqwowState>()(
  persist(
    (set) => ({
      avatar: {
        colorPelaje: '#B8A9FF',
        colorAntenita1: '#FFD700',
        colorAntenita2: '#00D4C8',
        accesorios: [],
      },
      mundoActual: 0,
      setMundo: (id) => set({ mundoActual: id }),
      updateAvatar: (p) => set(s => ({ avatar: { ...s.avatar, ...p } })),
      addAccesorio: (id) => set(s => ({ avatar: { ...s.avatar, accesorios: [...new Set([...s.avatar.accesorios, id])] } })),
    }),
    { name: 'toqwow-avatar' }
  )
);
