import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useRoadmapStore = create(
  persist(
    (set) => ({
      nodes: [],
      edges: [],
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
    }),
    { name: 'rc-roadmap-store' },
  ),
)
