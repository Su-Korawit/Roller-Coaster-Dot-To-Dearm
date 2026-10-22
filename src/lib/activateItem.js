// What using an item does, shared by the hotbar and the Bag so an item behaves the same wherever
// the student put it. `ctx` comes from HomePage: openView, openPopup, openSheet, openAdminChat.
import { useGuideStore } from '../stores/useGuideStore'

export function activateItem(item, ctx) {
  if (item.id === 'adminChat') ctx.openAdminChat?.()
  else if (item.id === 'guide') useGuideStore.getState().replay()
  else if (item.sheet) ctx.openSheet(item.sheet)
  else if (item.popup) ctx.openPopup(item.popup)
  else ctx.openView(item.view)
}
