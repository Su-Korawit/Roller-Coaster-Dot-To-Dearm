import { defineConfig } from 'vitest/config'

// Default unit-test run. The emulator-dependent Firestore rules tests under
// test/rules are excluded here and run separately via `npm run test:rules`.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'test/rules/**'],
  },
})
