import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { armGuestDirtyTracking } from './services/guestMerge'

// Watch the guest-capable stores from boot; marking only activates once auth
// resolves to logged-out (see services/guestMerge.js lifecycle).
armGuestDirtyTracking()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
