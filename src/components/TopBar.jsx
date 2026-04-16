function TopBar({ icon = '●' }) {
  return (
    <header className="px-6 pt-8 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-black text-3xl text-white">{icon}</div>
          <p className="pixel-font text-[15px] tracking-wide text-black">Roller Coaster</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="h-3 w-3 rounded-full bg-black" />
          <span className="h-3 w-3 rounded-full bg-black" />
          <span className="h-3 w-3 rounded-full bg-black" />
        </div>
      </div>
      <div className="mt-5 h-px bg-black/80" />
    </header>
  )
}

export default TopBar
