import { create } from 'zustand'
import { LibraryItem } from '../types'

interface LibraryState {
  items: LibraryItem[]
  addItems: (items: LibraryItem[]) => void
  addItem: (item: LibraryItem) => void
  clearItems: () => void
  getItem: (id: string) => LibraryItem | null
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: [],
  addItems: (items) =>
    set((state) => ({
      items: [...items, ...state.items.filter((item) => !items.some((next) => next.id === item.id))]
    })),
  addItem: (item) =>
    set((state) => ({
      items: [item, ...state.items.filter((existing) => existing.id !== item.id)]
    })),
  clearItems: () => set({ items: [] }),
  getItem: (id) => get().items.find((item) => item.id === id) || null
}))
