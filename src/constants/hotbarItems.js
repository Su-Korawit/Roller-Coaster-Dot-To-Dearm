// What each hotbar / Bag item is and what it opens. `icon` is a sprite name in
// public/assets/rc/icons.json. Exactly one of `view` (an APP_VIEWS value), `sheet` (a
// useRoomUiStore sheet) or `popup` (a usePopupStore id) says where it goes; HomePage turns
// that into an action. `ready: false` items exist for later sub-projects and are never
// offered. `badge(state)` returns a count for the slot badge.
import { APP_VIEWS } from './appViews'

const item = (id, labelTh, icon, target, extra = {}) => ({ id, labelTh, icon, ready: true, ...target, ...extra })

export const HOTBAR_ITEMS = {
  focus: item('focus', 'โฟกัส', 'focus', { sheet: 'focus' }),
  warp: item('warp', 'วาร์ป', 'warp', { sheet: 'warp' }),
  plan: item('plan', 'แผน TCAS', 'plan', { sheet: 'plan' }),
  tasks: item('tasks', 'งาน', 'tasks', { view: APP_VIEWS.TASK }),
  letter: item('letter', 'แชท', 'friends', { view: APP_VIEWS.CHAT }),
  shop: item('shop', 'ร้านค้า', 'shop', { sheet: 'shop' }),
  wardrobe: item('wardrobe', 'โปรไฟล์', 'wardrobe', { view: APP_VIEWS.PROFILE }),
}

export const BAG_ONLY_ITEMS = {
  calendar: item('calendar', 'ปฏิทิน', 'plan', { view: APP_VIEWS.PLANNER_CALENDAR }),
  mastery: item('mastery', 'Mastery', 'guide', { popup: 'mastery' }),
  roadmap: item('roadmap', 'Roadmap', 'plan', { popup: 'roadmap' }),
  school: item('school', 'ตารางเรียน', 'tasks', { view: APP_VIEWS.SCHOOL }),
  news: item('news', 'ข่าวสาร', 'guide', { view: APP_VIEWS.NEWS }),
  music: item('music', 'เพลง', 'friends', { view: APP_VIEWS.MUSIC }),
  friends: item('friends', 'เพื่อน', 'friends', { view: APP_VIEWS.SOCIAL }),
  settings: item('settings', 'ตั้งค่า', 'bag', { popup: 'settings' }),
  guide: item('guide', 'คู่มือ', 'guide', { sheet: 'guide' }),
  adminChat: item('adminChat', 'ติดต่อผู้พัฒนา', 'friends', { sheet: 'adminChat' }),
}

export const ALL_ITEMS = { ...HOTBAR_ITEMS, ...BAG_ONLY_ITEMS }
