import admin from 'firebase-admin'

const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'rollercoasterdottodream.firebasestorage.app'

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: BUCKET,
})

const corsConfig = [
  {
    origin: [
      'http://localhost:5173',
      'https://rollercoasterdottodream.web.app',
      'https://rollercoasterdottodream.firebaseapp.com',
    ],
    method: ['GET'],
    maxAgeSeconds: 3600,
    responseHeader: ['Content-Type', 'Access-Control-Allow-Origin'],
  },
]

await admin.storage().bucket().setCorsConfiguration(corsConfig)
console.log('CORS set successfully on bucket:', BUCKET)
process.exit(0)
