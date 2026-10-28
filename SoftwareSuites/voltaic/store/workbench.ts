'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export interface WorkbenchState {
  activeTab: string;
  lastCase: unknown;
  lastResult: unknown;
  setActiveTab: (tab: string) => void;
  setCase: (c: unknown) => void;
  setResult: (r: unknown) => void;
  reset: () => void;
}
export const useWorkbench = create<WorkbenchState>()(
  persist(
    (set) => ({
      activeTab: 'dashboard',
      lastCase: null,
      lastResult: null,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCase: (c) => set({ lastCase: c }),
      setResult: (r) => set({ lastResult: r }),
      reset: () => set({ lastCase: null, lastResult: null }),
    }),
    { name: 'voltaic-workbench' }
  )
);
