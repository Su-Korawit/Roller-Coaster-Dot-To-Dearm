// Red dot/count badge for news unread, tab requests, contact-dev ping.
// count: number (shows dot if 0 or undefined)
// animated: adds a pulse ring for urgent notifications
export default function NotificationBadge({ count, animated = false }) {
  const hasCount = count != null && count > 0
  return (
    <span
      className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white
        text-[9px] font-bold flex items-center justify-center leading-none
        ${animated ? 'animate-pulse' : ''}`}
      aria-hidden="true"
    >
      {hasCount ? (count > 99 ? '99+' : count) : ''}
    </span>
  )
}
