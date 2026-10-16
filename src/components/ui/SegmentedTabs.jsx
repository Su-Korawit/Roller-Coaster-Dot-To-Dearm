// Shared tab bar — brand underline active state, consistent across all panels.
// tabs: [{ id, label, icon?, badge? }]
// activeId: currently active tab id
// onChange: (id) => void
export default function SegmentedTabs({ tabs, activeId, onChange }) {
  return (
    <div className="flex gap-1 border-b-2 border-hairline bg-paper p-1.5 shrink-0" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-1 py-2.5 text-[13px] font-semibold rounded-ui
              transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset
              ${isActive ? 'bg-ink text-white font-bold' : 'text-ink-soft hover:text-ink hover:bg-mist'}`}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            <span className="thai-font">{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] flex items-center justify-center leading-none">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
