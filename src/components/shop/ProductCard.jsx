export default function ProductCard({ product, onBuy, disabled }) {
  const { name, coins, price, image } = product

  return (
    <button
      onClick={() => onBuy(product)}
      disabled={disabled}
      className="px-card px-btn flex w-full flex-col items-center gap-1.5 px-3 py-3 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="px-slab flex h-14 w-14 items-center justify-center text-3xl" aria-hidden="true">{image ?? '🪙'}</span>
      <p className="thai-font text-center text-xs font-semibold text-ink">{name}</p>
      <p className="pixel-font text-xs text-brand-strong">🪙 {coins}</p>
      <div className="rpg-btn-primary mt-1 rounded-lg border-2 px-2.5 py-1">
        <span className="pixel-font text-xs text-ink">{price} ฿</span>
      </div>
    </button>
  )
}
