/* global chrome */
// The side panel is a narrow window, so the site shows its phone layout. We navigate the panel to
// the site itself (not an iframe), so Google sign-in and the saved login work like in a normal tab.
import { APP_URL } from './config.js'

async function target() {
  try {
    const { panelUrl } = await chrome.storage.session.get('panelUrl')
    if (panelUrl && panelUrl.startsWith(APP_URL)) { await chrome.storage.session.remove('panelUrl'); return panelUrl }
  } catch { /* storage unavailable: open the home screen */ }
  return APP_URL
}

target().then((url) => { window.location.replace(url) })
setTimeout(() => {
  const msg = document.getElementById('msg')
  if (msg) msg.innerHTML = `เปิดไม่สำเร็จ <a href="${APP_URL}" target="_blank" rel="noopener">เปิดในแท็บใหม่</a>`
}, 8000)
