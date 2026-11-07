// Tutoring institutes and online providers found on the providers' own websites
// (source: thailand-tutoring-directory.html, "เว็บไซต์ของสถาบันและผู้ให้บริการกวดวิชาที่ตรวจพบ", 37 sites).
// Each one becomes its own Store app (see storeLinks.js) that opens the site, like SmartMathPro.
// SmartMathPro already exists as `link-smartmathpro`, so the other 36 are listed here.
//
// [id, name, url, area, embed]
//   area  '' = online / nationwide, else the province (shown in the tagline)
//   embed false = the site forbids being framed (X-Frame-Options / frame-ancestors, checked 2026-11-07)
const ROWS = [
  ['ondemand', 'OnDemand', 'https://www.ondemand.in.th/', ''],
  ['webythebrain', 'WE BY THE BRAIN', 'https://www.webythebrain.com/', ''],
  ['enconcept', 'Enconcept', 'https://enconcept.com/', ''],
  ['chem-ou', 'เคมี อ.อุ๊', 'https://www.chem-ou.com/', ''],
  ['appliedphysics', 'Applied Physics', 'https://www.appliedphysics.ac.th/', ''],
  ['biobeam', 'Bio BEAM Center', 'https://www.biobeamcenter.com/', ''],
  ['davance', 'Da’Vance', 'https://www.davance.com/', ''],
  ['idealphysics', 'ideal Physics', 'https://idealphysics.com/', '', false],
  ['mathmavens', 'Math Mavens', 'https://mathmavens.co.th/', ''],
  ['rosemarie', 'Rose Marie Academy', 'https://www.rose-marie.ac.th/', ''],
  ['dekd-school', 'Dek-D School', 'https://school.dek-d.com/', ''],
  ['opendurian', 'OpenDurian', 'https://www.opendurian.com/', ''],
  ['findme', 'findme', 'https://www.findme.ac.th/', ''],
  ['baankrumod', 'บ้านครูมด', 'https://www.baankrumod.com/', ''],
  ['baankruja', 'บ้านครูจ๋า', 'https://www.baankruja.com/', ''],
  ['banbodin', 'บ้านบดินทร์ติวเตอร์', 'https://www.banbodintutor.com/', ''],
  ['looknam', 'ติวเตอร์ลูกน้ำ', 'https://purimprat.com/', '', false],
  ['cwdtutor', 'CWD Tutor', 'https://chonlawat.com/', ''],
  ['topone', 'Top One', 'https://toponeschool.com/', ''],
  ['brightup', 'Bright Up Tutor', 'https://www.brightuptutor.com/th', ''],
  ['qtutor', 'Q Tutor', 'https://www.qtutorgroup.com/', ''],
  ['kruwi', 'กวดวิชาวิภาภรณ์', 'https://www.kru-wi.com/', 'ขอนแก่น'],
  ['kwcenter', 'กวดวิชาแก่นวิทย์', 'https://kw-center.com/', 'ขอนแก่น'],
  ['trongjai', 'ตรงใจติวเตอร์', 'https://trongjaitutor.com/', 'ขอนแก่น / เชียงใหม่'],
  ['sptutor', 'SPTUTOR', 'https://www.sptutor.com/', 'อุบลราชธานี'],
  ['futureenhance', 'Future Enhance Skills', 'https://www.futureeducation.co.th/', 'นครราชสีมา'],
  ['phuketpals', 'Phuket PALS', 'https://phuketpals.org/th/tutoring-services-th/', 'ภูเก็ต'],
  ['cmcadet', 'เชียงใหม่ คาเด็ท เซ็นเตอร์', 'https://www.cmcadet.com/', 'เชียงใหม่', false],
  ['dnpthetutor', 'DNP The Tutor', 'https://www.dnpthetutor.com/', 'เชียงราย'],
  ['ignite', 'Ignite by OnDemand', 'https://onlineshop.ignitebyondemand.com/', '', false],
  ['interpass', 'Interpass', 'https://interpass.in.th/', ''],
  ['aims', 'AIMS', 'https://aims.co.th/', ''],
  ['premierprep', 'Premier Prep', 'https://www.ondemand.in.th/premierprep/', ''],
  ['annop', 'คณิตศาสตร์ อ.อรรณพ', 'https://annop.ac.th/', ''],
  ['supk', 'SupK Center', 'https://www.supk.com/School', ''],
  ['theprotutor', 'The Pro Tutor', 'https://theprotutor.com/', ''],
]

// Sites whose favicon is missing, tiny (< 64px), a placeholder (WordPress / Wix default) or shared with
// another app on the same domain. Their tile shows the icon on a colour instead of a wrong or blurry
// picture. Checked 2026-11-07 against the 128px favicon of every site.
const NO_LOGO = new Set([
  'baankrumod', 'banbodin', 'brightup', 'futureenhance', 'supk',   // no usable favicon
  'ignite', 'findme', 'theprotutor',                               // only 32-48px
  'baankruja',                                                     // default WordPress icon
  'premierprep',                                                   // same domain/logo as OnDemand
])

export const TUTORING_SITES = ROWS.map(([id, name, url, area, embed]) => ({
  id: `tutor-${id}`, name, url, area, embed: embed !== false, hasLogo: !NO_LOGO.has(id),
}))

// Site favicon at 128px (the logo for apps that have no picture of their own); the tile falls back to
// its icon if this fails to load.
export const faviconUrl = (url) => {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128` } catch { return null }
}
