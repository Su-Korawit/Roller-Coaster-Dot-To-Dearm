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
    'inline-flex items-center justify-center gap-2 w-full rounded-slot font-bold ' +
    'disabled:opacity-50 disabled:pointer-events-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand '

  const sizes = {
    md: 'h-11 px-5 text-sm',
    lg: 'h-14 px-6 text-base',
  }

  const variants = {
    primary: 'px-btn bg-ink text-white border-ink',
    secondary: 'px-btn bg-paper text-ink',
    ghost: 'text-brand-strong',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.primary} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
