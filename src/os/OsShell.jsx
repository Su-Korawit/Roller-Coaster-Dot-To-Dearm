import { useState } from 'react'
import { useAuthStore } from '../stores/useAuthStore'
import { useConsentStore } from '../stores/useConsentStore'
import ConsentGate from '../components/ConsentGate'
import LoadingScene from '../components/ui/LoadingScene'
import LoginScreen from './LoginScreen'
import PasscodeScreen from './PasscodeScreen'
import HomeScreen from './HomeScreen'
import AppWindow from './AppWindow'
import { useDevice } from './hooks'
import {
  openWindow, focusWindow, closeWindow, minimizeWindow, toggleMaximize, moveWindow, topWindowId, taskbarToggle,
} from './windowsLogic'
import { hasPasscode } from './passcode'
import { trackEvent } from '../lib/track'
import { useVoiceSync } from './useVoiceSync'
import './os.css'

// The "device" for one signed-in user. Remounted per uid (key), so a different account never
// inherits the previous one's unlocked state.
function Device({ user }) {
  const [passcodeSet, setPasscodeSet] = useState(() => hasPasscode(user.uid))
  const [unlocked, setUnlocked] = useState(false)
  const [windows, setWindows] = useState([])
  const { device } = useDevice()
  useVoiceSync(user.uid)
  const open = (app) => {
    trackEvent(`app_${app.id}`)
    // Sites that forbid embedding (X-Frame-Options) can't be shown in a window: go straight to a
    // new tab instead of a dead-end card. Called from the tap handler, so popup blockers allow it.
    if (app.url && app.embed === false) {
      window.open(app.url, '_blank', 'noopener,noreferrer')
      return
    }
    setWindows((l) => openWindow(l, app))
  }
  const close = (id) => setWindows((l) => closeWindow(l, id))

  if (!passcodeSet) {
    return <PasscodeScreen user={user} mode="set" onDone={() => { setPasscodeSet(true); setUnlocked(true) }} />
  }
  if (!unlocked) {
    return <PasscodeScreen user={user} mode="unlock" onDone={() => setUnlocked(true)} />
  }
  return (
    <>
      <HomeScreen
        user={user}
        onOpenApp={open}
        onLock={() => { setWindows([]); setUnlocked(false) }}
        windows={windows}
        topId={topWindowId(windows)}
        onTaskbar={(id) => setWindows((l) => taskbarToggle(l, id))}
      />
      {windows.map((w, i) => (
        <AppWindow
          key={w.id}
          win={w}
          index={i}
          isTop={topWindowId(windows) === w.id}
          desktop={device === 'desktop'}
          onClose={close}
          onMinimize={(id) => setWindows((l) => minimizeWindow(l, id))}
          onMaximize={(id) => setWindows((l) => toggleMaximize(l, id))}
          onFocus={(id) => setWindows((l) => focusWindow(l, id))}
          onMove={(id, pos) => setWindows((l) => moveWindow(l, id, pos))}
          onOpenApp={open}
        />
      ))}
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
