// Bottom Navigation Bar — Home | Task | Skill | Profile
export default function BottomNavBar({ active, onChange }) {
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <path d="M3 12L12 4l9 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'task',
      label: 'Task',
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="3.5" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="3.5" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="3.5" cy="18" r="1.5" fill="currentColor"/>
        </svg>
      ),
    },
    {
      id: 'skill',
      label: 'Skill',
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] z-60">
      <div className="bg-white rounded-[28px] shadow-lg px-2 py-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all
                ${isActive
                  ? 'text-[#a78bda]'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {tab.icon}
              <span
                className={`pixel-font text-[7px] leading-tight ${isActive ? 'text-[#a78bda]' : 'text-gray-400'}`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
