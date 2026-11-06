import { useState } from 'react'
import { useAuthStore } from '../stores/useAuthStore'
import { useConsentStore } from '../stores/useConsentStore'
import ConsentGate from '../components/ConsentGate'
import LoadingScene from '../components/ui/LoadingScene'
import LoginScreen from './LoginScreen'
import PasscodeScreen from './PasscodeScreen'
import HomeScreen from './HomeScreen'
import AppWindow from './AppWindow'
import { hasPasscode } from './passcode'
import './os.css'

// The "device" for one signed-in user. Remounted per uid (key), so a different account never
// inherits the previous one's unlocked state.
function Device({ user }) {
  const [passcodeSet, setPasscodeSet] = useState(() => hasPasscode(user.uid))
  const [unlocked, setUnlocked] = useState(false)
  const [openApp, setOpenApp] = useState(null)

  if (!passcodeSet) {
    return <PasscodeScreen user={user} mode="set" onDone={() => { setPasscodeSet(true); setUnlocked(true) }} />
  }
  if (!unlocked) {
    return <PasscodeScreen user={user} mode="unlock" onDone={() => setUnlocked(true)} />
  }
  return (
    <>
      <HomeScreen onOpenApp={setOpenApp} onLock={() => { setOpenApp(null); setUnlocked(false) }} />
      {openApp && <AppWindow app={openApp} onClose={() => setOpenApp(null)} onOpenApp={setOpenApp} />}
    </>
  )
}

// Entry of the app site: sign in with Google → passcode → Home. Everything else is an app.
export default function OsShell() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const consent = useConsentStore((s) => s.status)

  if (loading) return <LoadingScene />
  if (!user) return <LoginScreen />
  // PDPA: nothing past this point until the current Privacy Policy/Terms are accepted.
  if (consent === 'needed') return <ConsentGate />
  return <Device key={user.uid} user={user} />
}
