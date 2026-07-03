import { defineConfig } from 'vitest/config'

// Default unit-test run. The emulator-dependent Firestore rules tests under
// test/rules are excluded here and run separately via `npm run test:rules`.
// Worktrees under .claude/worktrees/ are also excluded — they have their own
// test suites that may depend on different configs or emulators.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', 'test/rules/**', '.claude/worktrees/**'],
  },
})
