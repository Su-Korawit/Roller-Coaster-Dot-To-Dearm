import { defineConfig } from 'vitest/config'

// Firestore security-rules tests. These need the Firestore emulator running; the
// easiest way is to let the Firebase CLI start it for the run:
//   firebase emulators:exec --only firestore "npm run test:rules"
export default defineConfig({
  test: {
    include: ['test/rules/**/*.test.js'],
    testTimeout: 15000,
  },
})
