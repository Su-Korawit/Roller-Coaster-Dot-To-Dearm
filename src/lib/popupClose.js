import { APP_VIEWS } from '../constants/appViews'

// Close the open popup the way its own close button would. Esc must not skip that logic:
// the calendar has to restore the Home view (the game is paused while it is the active view),
// and the daily mood check-in cannot be dismissed until the mood is saved.
export function closeTopPopup({ activePopup, closePopup, setActiveTab }) {
  if (!activePopup) return false
  if (activePopup === 'dailyLogin') return false
  closePopup()
  if (activePopup === 'calendar') setActiveTab(APP_VIEWS.HOME)
  return true
}
