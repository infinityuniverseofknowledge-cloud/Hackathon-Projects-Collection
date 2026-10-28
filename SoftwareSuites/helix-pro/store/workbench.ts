'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkbenchState {
  activeTab: string;
  fastaRecords: { id: string; sequence: string }[];
  lastAlignment: unknown;
  lastGuides: unknown[];
  setActiveTab: (tab: string) => void;
  setFasta: (recs: { id: string; sequence: string }[]) => void;
  setAlignment: (a: unknown) => void;
  setGuides: (g: unknown[]) => void;
  reset: () => void;
}

export const useWorkbench = create<WorkbenchState>()(
  persist(
    (set) => ({
      activeTab: 'dashboard',
      fastaRecords: [],
      lastAlignment: null,
      lastGuides: [],
      setActiveTab: (tab) => set({ activeTab: tab }),
      setFasta: (recs) => set({ fastaRecords: recs }),
      setAlignment: (a) => set({ lastAlignment: a }),
      setGuides: (g) => set({ lastGuides: g }),
      reset: () => set({ fastaRecords: [], lastAlignment: null, lastGuides: [] }),
    }),
    { name: 'helix-workbench' }
  )
);
