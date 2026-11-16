// "?open=countdown" opens that app right after unlock. Used by the Chrome extension dock and by
// bookmarks. Only a plain app id is accepted; the caller still checks that the app exists.
export function appIdFromSearch(search = '') {
  const id = new URLSearchParams(search).get('open')
  return id && /^[a-z0-9-]{1,40}$/.test(id) ? id : null
}
