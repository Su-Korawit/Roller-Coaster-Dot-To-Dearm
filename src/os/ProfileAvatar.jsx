import { useOsStore } from '../stores/useOsStore'
import { avatarSrc, findAvatar } from './avatars'

// The user's picture: chosen avatar → Google photo → first letter of the name.
export default function ProfileAvatar({ user, size = 80, className = '' }) {
  const avatarId = useOsStore((s) => s.avatars[user.uid])
  const avatar = findAvatar(avatarId)
  const name = user.displayName || user.email || 'ผู้ใช้'
  const box = { width: size, height: size }

  if (avatar) {
    return (
      <img
        src={avatarSrc(avatar.id)}
        alt=""
        draggable={false}
        className={`rounded-full ${className}`}
        style={{ ...box, imageRendering: 'pixelated' }}
      />
    )
  }
  if (user.photoURL) {
    return <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className={`rounded-full border-2 border-line ${className}`} style={box} />
  }
  return (
    <span
      className={`rounded-full border-2 border-line bg-paper text-ink font-display font-bold flex items-center justify-center ${className}`}
      style={{ ...box, fontSize: size * 0.4 }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
