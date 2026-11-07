// Open House: opening it drops you straight into the walkable campus (/openhouse) inside the OS window,
// with no extra bars. It is the real page in a same-origin frame, so the game's stores stay isolated
// from the OS. The page works without sign-in.
export default function OpenHouseApp() {
  return <iframe src="/openhouse" title="Open House" allow="fullscreen" className="w-full h-full border-0 bg-mist block" />
}
