/* global chrome */
// Clicking the toolbar icon opens the side panel. The dock injected into the page asks for a panel
// too (it can only do that from a user gesture, which the click inside the dock is).
import { APP_URL } from './config.js'

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'open-panel' || !sender.tab?.id) return
  const open = typeof msg.app === 'string' && /^[a-z0-9-]{1,40}$/.test(msg.app) ? msg.app : ''
  const url = open ? `${APP_URL}?open=${open}` : APP_URL
  // Remember which page the panel should show; the panel reads it on load.
  chrome.storage?.session?.set?.({ panelUrl: url })
  chrome.sidePanel.open({ tabId: sender.tab.id })
})
