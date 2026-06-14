import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timerRefs = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timerRefs.current[id])
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((type, msg) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-4), { id, type, msg }])
    timerRefs.current[id] = setTimeout(() => dismiss(id), 3000)
  }, [dismiss])

  const toast = {
    success: (msg) => add('success', msg),
    error:   (msg) => add('error', msg),
  }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-9999 flex flex-col gap-2 pointer-events-none">
          {toasts.map(({ id, type, msg }) => (
            <div
              key={id}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-auto transition-all ${
                type === 'success'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              <span>{type === 'success' ? '✓' : '✕'}</span>
              <span>{msg}</span>
              <button
                onClick={() => dismiss(id)}
                className="ml-2 opacity-70 hover:opacity-100 text-base leading-none"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastCtx)
}
