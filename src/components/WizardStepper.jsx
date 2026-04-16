const labels = ['Career', 'Mastery', 'University', 'Program']

function WizardStepper({ step }) {
  return (
    <div className="mt-2 mb-5 px-1">
      <div className="flex items-start justify-between">
        {labels.map((label, index) => {
          const active = step === index
          const done = step > index

          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs ${
                    active
                      ? 'border-pink-400 bg-linear-to-b from-cyan-100 to-emerald-200'
                      : done
                        ? 'border-transparent bg-linear-to-b from-purple-100 to-purple-200'
                        : 'border-transparent bg-linear-to-b from-blue-50 to-blue-200'
                  }`}
                >
                  {done ? '✓' : ''}
                </div>
                <p className="pixel-font mt-1 text-[10px] text-black">{label}</p>
              </div>
              {index < labels.length - 1 && (
                <div className="pixel-font -mt-3 px-0.5 text-xs text-black">→</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WizardStepper
