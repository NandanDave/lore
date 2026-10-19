import { create } from 'zustand'

const useStore = create((set) => ({
  // User
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  updateProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),

  // Character
  character: null,
  domainScores: {
    Body: 0,
    Mind: 0,
    Craft: 0,
    Relationships: 0,
    Wealth: 0,
    Purpose: 0,
  },
  setCharacter: (character) => set({ character }),
  setDomainScores: (domainScores) => set({ domainScores }),
  updateDomainScore: (domain, score) =>
    set((state) => ({
      domainScores: { ...state.domainScores, [domain]: score },
    })),

  // Drift
  isDrifting: false,
  setIsDrifting: (isDrifting) => set({ isDrifting }),
  driftIntroSeen: false,
  setDriftIntroSeen: (driftIntroSeen) => set({ driftIntroSeen }),

  // Quests
  quests: [],
  setQuests: (quests) => set({ quests }),
  updateQuest: (questId, updates) =>
    set((state) => ({
      quests: state.quests.map((q) =>
        q.id === questId ? { ...q, ...updates } : q
      ),
    })),

  // Reset everything on logout
  reset: () =>
    set({
      user: null,
      profile: null,
      character: null,
      domainScores: {
        Body: 0,
        Mind: 0,
        Craft: 0,
        Relationships: 0,
        Wealth: 0,
        Purpose: 0,
      },
      quests: [],
      isDrifting: false,
      driftIntroSeen: false,
    }),
}))

export default useStore