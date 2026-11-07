// Tutoring institutes and online providers found on the providers' own websites
// (source: thailand-tutoring-directory.html, "เว็บไซต์ของสถาบันและผู้ให้บริการกวดวิชาที่ตรวจพบ").
// Use these to look at courses and programmes; the registry check lives in the source table.
// [name, url, area]  area = '' for online / nationwide brands, else the province.
const ROWS = [
  ['OnDemand', 'https://www.ondemand.in.th/', ''],
  ['WE BY THE BRAIN', 'https://www.webythebrain.com/', ''],
  ['Enconcept', 'https://enconcept.com/', ''],
  ['เคมี อ.อุ๊ / วรรณสรณ์', 'https://www.chem-ou.com/', ''],
  ['Applied Physics', 'https://www.appliedphysics.ac.th/', ''],
  ['Bio BEAM Center', 'https://www.biobeamcenter.com/', ''],
  ['Da’Vance / อาจารย์ปิง', 'https://www.davance.com/', ''],
  ['SmartMathPro', 'https://www.smartmathpro.com/', ''],
  ['ideal Physics', 'https://idealphysics.com/', ''],
  ['Math Mavens Thailand', 'https://mathmavens.co.th/', ''],
  ['Rose Marie Academy', 'https://www.rose-marie.ac.th/', ''],
  ['Dek-D School', 'https://school.dek-d.com/', ''],
  ['OpenDurian', 'https://www.opendurian.com/', ''],
  ['findme', 'https://www.findme.ac.th/', ''],
  ['บ้านครูมด', 'https://www.baankrumod.com/', ''],
  ['บ้านครูจ๋า', 'https://www.baankruja.com/', ''],
  ['บ้านบดินทร์ติวเตอร์', 'https://www.banbodintutor.com/', ''],
  ['ติวเตอร์ลูกน้ำ', 'https://purimprat.com/', ''],
  ['CWD Tutor / ชลวัตร', 'https://chonlawat.com/', ''],
  ['Top One', 'https://toponeschool.com/', ''],
  ['Bright Up Tutor', 'https://www.brightuptutor.com/th', ''],
  ['Q Tutor', 'https://www.qtutorgroup.com/', ''],
  ['กวดวิชาวิภาภรณ์', 'https://www.kru-wi.com/', 'ขอนแก่น'],
  ['กวดวิชาแก่นวิทย์', 'https://kw-center.com/', 'ขอนแก่น'],
  ['ตรงใจติวเตอร์', 'https://trongjaitutor.com/', 'ขอนแก่น / เชียงใหม่'],
  ['SPTUTOR', 'https://www.sptutor.com/', 'อุบลราชธานี'],
  ['Future Enhance Skills', 'https://www.futureeducation.co.th/', 'นครราชสีมา'],
  ['Phuket PALS', 'https://phuketpals.org/th/tutoring-services-th/', 'ภูเก็ต'],
  ['เชียงใหม่ คาเด็ท เซ็นเตอร์', 'https://www.cmcadet.com/', 'เชียงใหม่'],
  ['DNP The Tutor', 'https://www.dnpthetutor.com/', 'เชียงราย'],
  ['Ignite by OnDemand', 'https://onlineshop.ignitebyondemand.com/', ''],
  ['Interpass', 'https://interpass.in.th/', ''],
  ['AIMS', 'https://aims.co.th/', ''],
  ['Premier Prep', 'https://www.ondemand.in.th/premierprep/', ''],
  ['คณิตศาสตร์ อ.อรรณพ', 'https://annop.ac.th/', ''],
  ['SupK Center', 'https://www.supk.com/School', ''],
  ['The Pro Tutor', 'https://theprotutor.com/', ''],
]

export const TUTORING_SITES = ROWS.map(([name, url, area]) => ({ name, url, area }))

// Filter by name or area, case-insensitive; `area` is 'all' | 'online' | a province name.
export function searchTutoring(query = '', area = 'all', sites = TUTORING_SITES) {
  const q = query.trim().toLowerCase()
  return sites.filter(
    (s) =>
      (area === 'all' || (area === 'online' ? !s.area : s.area.includes(area))) &&
      (!q || s.name.toLowerCase().includes(q) || s.area.includes(q)),
  )
}

// Province names that appear in the list, sorted by how many institutes they have.
export function tutoringAreas(sites = TUTORING_SITES) {
  const count = {}
  for (const s of sites) for (const a of s.area.split(' / ').filter(Boolean)) count[a] = (count[a] ?? 0) + 1
  return Object.entries(count).sort((a, b) => b[1] - a[1]).map(([a]) => a)
}
