/**
 * Button — canonical interactive button for the onboarding flow.
 *
 * variant:  'primary'   — brand gradient (default, for main CTAs)
 *           'secondary' — white background (for OAuth, back actions)
 *           'ghost'     — transparent (for nav-style links)
 * size:     'md' (default, h-11), 'lg' (h-14)
 * Always ≥44px tall. Visible focus-visible ring. Forwards aria-label.
 */
export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 w-full rounded-2xl font-bold ' +
    'transition-all active:scale-95 disabled:opacity-50 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand '

  const sizes = {
    md: 'h-11 px-5 text-sm',
    lg: 'h-14 px-6 text-base',
  }

  const variants = {
    primary: 'text-white shadow-lg',
    secondary: 'bg-white text-gray-800 shadow border border-gray-100',
    ghost: 'text-brand',
  }

  const primaryStyle =
    variant === 'primary'
      ? { background: 'linear-gradient(135deg, #a78bda, #7c3aed)' }
      : undefined

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.primary} ${className}`}
      style={primaryStyle}
      {...rest}
    >
      {children}
    </button>
  )
}
