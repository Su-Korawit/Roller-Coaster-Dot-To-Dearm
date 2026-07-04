import { create } from 'zustand'

// Lets ProfilePanel / SettingsSheet reopen OnboardingModal on top of the
// current screen without touching useSelectStore — the wizard should show
// existing selections, not blank ones, when re-entered this way.
export const useOnboardingUiStore = create((set) => ({
  forceOpen: false,
  open: () => set({ forceOpen: true }),
  close: () => set({ forceOpen: false }),
}))
