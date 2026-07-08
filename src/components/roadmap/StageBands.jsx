export const DEFAULT_STAGES = [
  { label: 'School', startMonth: 1, endMonth: 5 },
  { label: 'University', startMonth: 6, endMonth: 12 },
]

const BAND_COLORS = ['bg-good/30', 'bg-accent-pink/20', 'bg-brand-soft']

export default function StageBands({ stages, onRename }) {
  return (
    <div className="flex w-full h-6 border-b-2 border-ink/20 select-none">
      {stages.map((stage, i) => (
        <div
          key={`${stage.label}-${i}`}
          data-testid="stage-band"
          style={{ width: `${((stage.endMonth - stage.startMonth + 1) / 12) * 100}%` }}
          className={`flex items-center justify-center border-r border-ink/10 ${BAND_COLORS[i % BAND_COLORS.length]}`}
        >
          <button
            aria-label={`แก้ชื่อช่วง ${stage.label}`}
            onDoubleClick={() => {
              const name = window.prompt('ชื่อช่วง', stage.label)
              if (name && name.trim()) onRename(i, name.trim())
            }}
            className="pixel-font text-[8px] text-ink truncate px-1"
          >
            {stage.label}
          </button>
        </div>
      ))}
    </div>
  )
}
