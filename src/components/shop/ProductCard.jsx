export default function ProductCard({ product, onBuy, disabled }) {
  const { name, coins, price, image } = product

  return (
    <button
      onClick={() => onBuy(product)}
      disabled={disabled}
      className="flex w-full flex-col items-center gap-1 rounded-2xl border-2 border-brand bg-white px-3 py-3 shadow-[3px_3px_0_0_#a78bda] transition-all hover:shadow-[4px_4px_0_0_#a78bda] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-3xl">{image ?? '🪙'}</span>
      <p className="thai-font text-center text-xs font-semibold text-ink">{name}</p>
      <p className="pixel-font text-[10px] text-brand-strong">🪙 {coins}</p>
      <div className="mt-1 rounded-lg border border-accent-pink/30 bg-accent-pink/10 px-2 py-0.5">
        <span className="pixel-font text-[10px] text-accent-pink">{price} ฿</span>
      </div>
    </button>
  )
}
