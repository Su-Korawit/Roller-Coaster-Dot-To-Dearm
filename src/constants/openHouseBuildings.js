// The 18 faculty buildings of the Open House campus (spec 2026-10-16-openhouse-campus-design).
// `group` is MyTCAS `group_field_id`; group 90 is split into law/comm/pol/hum by keywords
// (src/utils/openHouseIndex.js splitGroup90).
export const ZONES = {
  health: { nameTh: 'สุขภาพ', color: '#E8817B', soft: '#FCE5E3', deep: '#B9544F' },
  sci: { nameTh: 'วิทย์ เทคโนโลยี', color: '#5B8DEF', soft: '#E3ECFD', deep: '#3B63B8' },
  soc: { nameTh: 'สังคม มนุษย์', color: '#9B7BD6', soft: '#EEE6FA', deep: '#6C51A8' },
  biz: { nameTh: 'ธุรกิจ', color: '#E8A93B', soft: '#FCF2DA', deep: '#8A5A00' },
  arts: { nameTh: 'ศิลปะ', color: '#E58BC0', soft: '#FBEEF6', deep: '#955A7D' },
  earth: { nameTh: 'การศึกษา เกษตร', color: '#5FB57A', soft: '#E7F4EB', deep: '#3F7750' },
}

const b = (id, nameTh, shortTh, zone, group, signature) => ({ id, nameTh, shortTh, zone, group, signature })

export const BUILDINGS = [
  b('med', 'แพทยศาสตร์', 'แพทย์', 'health', '10', 'glass atrium with a red cross, rooftop helipad'),
  b('dent', 'ทันตแพทยศาสตร์', 'ทันตะ', 'health', '12', 'tooth-shaped canopy, white tiles'),
  b('pharm', 'เภสัชศาสตร์', 'เภสัช', 'health', '13', 'capsule-shaped roof lantern, herb planters'),
  b('vet', 'สัตวแพทยศาสตร์', 'สัตวแพทย์', 'health', '14', 'paw-print sign, small paddock'),
  b('allied', 'สหเวชศาสตร์ / พยาบาล / สาธารณสุข', 'สหเวช', 'health', '11', 'ambulance bay, heartbeat line on the facade'),
  b('sci', 'วิทยาศาสตร์', 'วิทย์', 'sci', '21', 'observatory dome'),
  b('it', 'เทคโนโลยีสารสนเทศ', 'IT', 'sci', '22', 'glass cube with pixel screens, antenna'),
  b('eng', 'วิศวกรรมศาสตร์', 'วิศวะ', 'sci', '30', 'saw-tooth roof workshop, gear'),
  b('arch', 'สถาปัตยกรรมศาสตร์', 'สถาปัตย์', 'sci', '40', 'cantilevered stacked boxes, green roof'),
  b('law', 'นิติศาสตร์', 'นิติ', 'soc', '90', 'slim colonnade, floating roof, scales'),
  b('comm', 'นิเทศศาสตร์', 'นิเทศ', 'soc', '90', 'broadcast tower, big screen, on-air sign'),
  b('pol', 'รัฐศาสตร์ / สังคมศาสตร์', 'รัฐศาสตร์', 'soc', '90', 'dome and flag row, round council hall'),
  b('hum', 'อักษรศาสตร์ / มนุษยศาสตร์', 'อักษร', 'soc', '90', 'library facade with arched windows, book banners'),
  b('biz', 'บริหาร / บัญชี / เศรษฐศาสตร์', 'บริหาร', 'biz', '61', 'glass tower with a ticker band'),
  b('tour', 'ท่องเที่ยวและโรงแรม', 'ท่องเที่ยว', 'biz', '62', 'hotel canopy, suitcase sign, rooftop cafe'),
  b('fine', 'ศิลปกรรม / ดนตรี / ออกแบบ', 'ศิลปกรรม', 'arts', '80', 'sculptural wavy roof, piano-key steps'),
  b('edu', 'ครุศาสตร์ / ศึกษาศาสตร์', 'ครุ', 'earth', '70', 'school bell tower, chalkboard facade'),
  b('agri', 'เกษตร / วนศาสตร์', 'เกษตร', 'earth', '50', 'greenhouse and a rice field'),
]

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((x) => [x.id, x]))
export const BUILDING_IDS = BUILDINGS.map((x) => x.id)
