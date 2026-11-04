import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useShopStore } from '../../stores/useShopStore'
import { useShopChatStore } from '../../stores/useShopChatStore'
import { buildShopSystemPrompt } from '../../constants/shopPrompt'
import { sendShopChat } from '../../services/shopAi'
import ProductCard from './ProductCard'
import UnlockSection from './UnlockSection'
import PaymentCard from './PaymentCard'
import { useChatComposer } from '../../hooks/useChatComposer'

const WELCOME = 'สวัสดีครับ! 🛒 ฉันคือผู้ช่วยร้านค้า I LOVE TCAS ต้องการซื้อเหรียญหรือมีคำถามอะไรไหมครับ?'

export default function ShopChatView({ onBack }) {
  const user = useAuthStore((s) => s.user)
  const products = useShopStore((s) => s.products)
  const messages = useShopChatStore((s) => s.messages)
  const addText = useShopChatStore((s) => s.addText)
  const addPaymentCard = useShopChatStore((s) => s.addPaymentCard)
  const addSystemMessage = useShopChatStore((s) => s.addSystemMessage)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [buying, setBuying] = useState(false)
  const bottomRef = useRef(null)

  // Load catalogue + live purchases on mount
  useEffect(() => {
    const unsub = useShopStore.getState().loadProducts()
    if (user?.uid) useShopStore.getState().loadPurchases(user.uid)
    return () => { if (typeof unsub === 'function') unsub() }
  }, [user?.uid])

  // Seed welcome message once
  useEffect(() => {
    if (messages.length === 0) addText('ai', WELCOME)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const systemPrompt = buildShopSystemPrompt(products)

  const handleSend = async (text) => {
    if (!text.trim() || sending) return
    const msg = text.trim()
    setInput('')
    addText('user', msg)
    setSending(true)
    try {
      const history = messages
        .filter((m) => m.type === 'text' && (m.role === 'user' || m.role === 'ai'))
        .map((m) => ({ role: m.role, text: m.text }))
      const reply = await sendShopChat(history, msg, systemPrompt)
      addText('ai', reply)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const { textareaRef, handleKeyDown } = useChatComposer(input, () => handleSend(input))

  const handleBuy = async (product) => {
    if (buying) return
    setBuying(true)
    addText('ai', `กำลังสร้างคำสั่งซื้อ "${product.name}" (${product.coins} เหรียญ / ${product.price} ฿)...`)
    try {
      const { purchaseId } = await useShopStore.getState().createPurchase(product.id)
      addPaymentCard(purchaseId)
    } catch (err) {
      addSystemMessage('error', `❌ ไม่สามารถสร้างคำสั่งซื้อได้: ${err.message ?? 'ลองใหม่อีกครั้ง'}`)
    } finally {
      setBuying(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-paper">
      {/* Top bar */}
      <div className="rpg-plank flex items-center gap-3 px-4 py-3">
        <button
          onClick={onBack}
          className="px-btn rounded-lg bg-paper px-2 py-0.5 text-ink"
        >
          ←
        </button>
        <span className="text-xl">🛒</span>
        <div>
          <p className="pixel-font text-xs text-ink">SHOP AI</p>
          <p className="thai-font text-xs text-ink/50">ซื้อเหรียญด้วย PromptPay</p>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {messages.map((msg) => {
            if (msg.type === 'text') {
              const isUser = msg.role === 'user'
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && <span className="mr-2 mt-1 text-lg">🛒</span>}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${
                      isUser
                        ? 'rounded-tr-none border-2 border-line/60 bg-brand text-white'
                        : 'px-slab rounded-tl-none text-ink'
                    }`}
                  >
                    <p className="thai-font leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              )
            }

            if (msg.type === 'payment_card') {
              return (
                <div key={msg.id} className="flex justify-center py-1">
                  <PaymentCard purchaseId={msg.purchaseId} />
                </div>
              )
            }

            if (msg.type === 'system_message') {
              const isError = msg.tone === 'error'
              return (
                <div key={msg.id} className="flex justify-center">
                  <span
                    className={`thai-font rounded-full px-3 py-1 text-xs ${
                      isError
                        ? 'border-2 border-danger/40 bg-danger/10 text-danger'
                        : 'border-2 border-good/60 bg-good/15 text-ink'
                    }`}
                  >
                    {msg.text}
                  </span>
                </div>
              )
            }

            return null
          })}

          {sending && (
            <div className="flex justify-start">
              <span className="mr-2 mt-1 text-lg">🛒</span>
              <div className="px-slab rounded-tl-none px-4 py-2">
                <span className="pixel-font text-xs text-ink/60 animate-pulse">...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Product grid */}
      {products.length > 0 && (
        <div className="border-t-2 border-line/40 bg-paper px-4 py-3">
          <p className="pixel-font mb-2 text-xs text-ink/50">COIN PACKAGES</p>
          <div className="grid grid-cols-3 gap-2">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onBuy={handleBuy} disabled={buying} />
            ))}
          </div>
        </div>
      )}

      {/* Entitlement unlocks — spend Coins on permanent features */}
      <UnlockSection />

      {/* Chat input */}
      <div className="border-t-2 border-line/40 bg-paper px-4 py-3">
        <div className="flex items-center gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์ข้อความ..."
            disabled={sending}
            className="px-input thai-font flex-1 px-3 py-2 text-sm text-ink placeholder-ink/40 disabled:opacity-50 resize-none leading-relaxed"
            style={{ maxHeight: 120, overflowY: 'auto' }}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || sending}
            className="px-btn rpg-btn-primary rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            ส่ง
          </button>
        </div>
      </div>
    </div>
  )
}
