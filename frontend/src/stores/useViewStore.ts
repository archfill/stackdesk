import { create } from 'zustand'

interface ViewStore {
  activeView: string
  setActiveView: (view: string) => void
}

export const useViewStore = create<ViewStore>((set) => ({
  activeView: 'all',
  setActiveView: (view) => set({ activeView: view }),
}))
