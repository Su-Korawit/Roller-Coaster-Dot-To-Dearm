// Pure rule for useVoiceSync: when to reload the OS plan after the voice secretary edited it on the server.
// `prevRev` is undefined until the first snapshot arrives (only changes after that count).
export function shouldReloadForVoice(prevRev, nextRev) {
  return typeof nextRev === 'number' && nextRev > 0 && nextRev !== prevRev && prevRev !== undefined
}
