import { Users, Trophy, Star, Flame } from 'lucide-react'

const MOCK_FRIENDS = [
  { id: 1, name: 'นักผจญภัย #1', stacks: 14, coins: 320, streak: 7, avatar: null },
  { id: 2, name: 'นักผจญภัย #2', stacks: 9,  coins: 210, streak: 3, avatar: null },
  { id: 3, name: 'นักผจญภัย #3', stacks: 6,  coins: 150, streak: 5, avatar: null },
]

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-base">🥇</span>
  if (rank === 2) return <span className="text-base">🥈</span>
  if (rank === 3) return <span className="text-base">🥉</span>
  return <span className="pixel-font text-[10px] text-gray-400">#{rank}</span>
}

export default function SocialPanel({ onClose }) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden"
      style={{ top: '8%' }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      <div className="px-4 pb-4 flex-1 overflow-y-auto">
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Users size={16} strokeWidth={2} className="text-[#a78bda]" />
              <h2 className="pixel-font text-[12px] text-gray-800">Social</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 text-xl leading-none">x</button>
          </div>

          {/* Coming soon banner */}
          <div className="mx-4 mt-4 rounded-xl bg-purple-50 border border-purple-100 px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="pixel-font text-[10px] text-purple-700 font-bold">Coming Soon</p>
              <p className="pixel-font text-[8px] text-purple-400 mt-0.5">เชื่อมต่อกับเพื่อนๆ และแข่งขันกัน</p>
            </div>
          </div>

          {/* Leaderboard section */}
          <div className="px-4 pt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Trophy size={13} className="text-yellow-500" />
              <p className="pixel-font text-[10px] text-gray-700 font-bold">Leaderboard (ตัวอย่าง)</p>
            </div>
            <div className="flex flex-col gap-2">
              {MOCK_FRIENDS.map((friend, i) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100"
                >
                  <div className="w-7 flex items-center justify-center shrink-0">
                    <RankBadge rank={i + 1} />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    {friend.avatar
                      ? <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover rounded-full" />
                      : <span className="text-lg">🎮</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="pixel-font text-[9px] text-gray-800 truncate">{friend.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="pixel-font text-[8px] text-orange-500 flex items-center gap-0.5">
                        <Flame size={9} />
                        {friend.stacks}
                      </span>
                      <span className="pixel-font text-[8px] text-yellow-600">
                        {friend.coins}
                        <span className="inline-block ml-0.5 w-3.5 h-3.5 rounded-full border border-yellow-600 text-center text-[7px] leading-[13px]">$</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star size={10} className="text-purple-400" />
                    <span className="pixel-font text-[8px] text-purple-500">{friend.streak}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add friend placeholder */}
          <div className="px-4 py-4 mt-2">
            <button
              disabled
              className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
            >
              <Users size={14} className="text-gray-400" />
              <span className="pixel-font text-[9px] text-gray-400">เพิ่มเพื่อน (เร็วๆ นี้)</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
