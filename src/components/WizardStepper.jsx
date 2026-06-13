const labels = ['Career', 'Mastery', 'University', 'Program']

function WizardStepper({ step }) {
  return (
    <nav aria-label="Setup progress" className="mt-2 mb-5 px-1">
      <ol className="flex items-start justify-between">
        {labels.map((label, index) => {
          const active = step === index
          const done = step > index

          return (
            <li key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  aria-current={active ? 'step' : undefined}
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold ${
                    active
                      ? 'border-pink-400 bg-linear-to-b from-brand-soft to-purple-100 text-brand-strong'
                      : done
                        ? 'border-transparent bg-linear-to-b from-purple-100 to-purple-200 text-purple-600'
                        : 'border-transparent bg-linear-to-b from-blue-50 to-blue-200 text-gray-400'
                  }`}
                >
                  {done ? '✓' : ''}
                </div>
                <p className="pixel-font mt-1 text-[9px] text-black">{label}</p>
              </div>
              {index < labels.length - 1 && (
                <div className="pixel-font -mt-3 px-0.5 text-xs text-gray-400" aria-hidden="true">→</div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default WizardStepper
