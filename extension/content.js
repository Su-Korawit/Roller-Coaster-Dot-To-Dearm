/* global chrome */
// A slim dock at the bottom of MyTCAS / university pages: shortcuts that open I LOVE TCAS in the side
// panel next to the page. It lives in a shadow root so the page's CSS cannot touch it (and ours cannot
// leak out), it never reads the page, and it can be hidden for the session with ×.
(() => {
  if (window.top !== window || document.getElementById('ilovetcas-dock')) return
  try { if (sessionStorage.getItem('ilovetcas-dock-hidden') === '1') return } catch { /* ignore */ }

  const APPS = [
    { id: 'countdown', label: 'Countdown' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'secretary', label: 'เลขา AI' },
  ]

  const host = document.createElement('div')
  host.id = 'ilovetcas-dock'
  host.style.cssText = 'all:initial;position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483646;'
  const root = host.attachShadow({ mode: 'closed' })
  root.innerHTML = `
    <style>
      .dock{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:14px;background:rgba(255,255,255,.96);
        border:2px solid #1f2937;box-shadow:0 3px 0 #1f2937;font:600 13px system-ui,sans-serif;color:#1f2937}
      .brand{padding:0 6px 0 4px;font-weight:800}
      button{all:unset;cursor:pointer;padding:5px 10px;border-radius:9px;background:#eef2ff}
      button:hover{background:#dbe4ff} button:focus-visible{outline:2px solid #2563eb}
      .x{padding:5px 8px;background:transparent;opacity:.6}
      @media (prefers-reduced-motion:no-preference){.dock{animation:up .3s cubic-bezier(.32,.72,0,1)}@keyframes up{from{opacity:0;transform:translateY(16px)}}}
    </style>
    <div class="dock" role="toolbar" aria-label="I LOVE TCAS">
      <span class="brand">I LOVE TCAS</span>
      <button data-app="" title="เปิดแผงข้างจอ">เปิด</button>
      ${APPS.map((a) => `<button data-app="${a.id}">${a.label}</button>`).join('')}
      <button class="x" data-hide="1" aria-label="ซ่อนแถบนี้" title="ซ่อนแถบนี้">×</button>
    </div>`
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    if (b.dataset.hide) {
      try { sessionStorage.setItem('ilovetcas-dock-hidden', '1') } catch { /* ignore */ }
      host.remove()
      return
    }
    chrome.runtime.sendMessage({ type: 'open-panel', app: b.dataset.app })
  })
  document.documentElement.appendChild(host)
})()
