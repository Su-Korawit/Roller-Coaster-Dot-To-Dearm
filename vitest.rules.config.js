import { defineConfig } from 'vitest/config'

// Firestore security-rules tests. These need the Firestore emulator running; the
// easiest way is to let the Firebase CLI start it for the run:
//   firebase emulators:exec --only firestore "npm run test:rules"
export default defineConfig({
  test: {
    include: ['test/rules/**/*.test.js'],
    // Every file shares ONE emulator database and several clear/delete it in
    // beforeEach; run files one at a time or they wipe each other's seed data.
    fileParallelism: false,
    testTimeout: 15000,
    // initializeTestEnvironment loads rules into the Firestore emulator, whose
    // rules-engine JVM can take >10s to warm up — the 10s default fails the
    // whole suite before a single test runs.
    hookTimeout: 60000,
  },
})
