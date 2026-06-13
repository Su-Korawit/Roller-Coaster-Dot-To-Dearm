// Shared tab bar — brand underline active state, consistent across all panels.
// tabs: [{ id, label, icon?, badge? }]
// activeId: currently active tab id
// onChange: (id) => void
export default function SegmentedTabs({ tabs, activeId, onChange }) {
  return (
    <div className="flex border-b border-gray-200 shrink-0" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-1 py-3 text-[11px] font-semibold
              transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset
              ${isActive ? 'text-brand-strong' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            <span className="thai-font">{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center leading-none">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-strong rounded-t-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
