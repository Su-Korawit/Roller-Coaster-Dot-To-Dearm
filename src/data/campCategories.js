// CampHub category taxonomy for the News filter.
// `slug` must match a whitelisted slug in api/camphub.js.
// Two-level: group → sub-categories. Single-select; selecting a sub refetches.
// Note: 'architect-design' intentionally appears under both science and arts.

export const CAMP_GROUPS = [
  {
    key: 'medical-health',
    label: 'หมอ/สุขภาพ',
    icon: '🩺',
    items: [
      { slug: 'medical-health/doctor', label: 'หมอ' },
      { slug: 'medical-health/dentist', label: 'ทันตแพทย์' },
      { slug: 'medical-health/nurse', label: 'พยาบาล' },
      { slug: 'medical-health/pharma', label: 'เภสัช' },
      { slug: 'medical-health/psychology', label: 'จิตวิทยา' },
      { slug: 'medical-health/vet', label: 'สัตวแพทย์' },
      { slug: 'medical-health/allied-health-sciences', label: 'สหเวชศาสตร์' },
      { slug: 'medical-health/health-other', label: 'สุขภาพอื่นๆ' },
    ],
  },
  {
    key: 'science',
    label: 'วิทย์/วิศวะ',
    icon: '🔬',
    items: [
      { slug: 'engineer', label: 'วิศวกรรม' },
      { slug: 'science', label: 'วิทยาศาสตร์' },
      { slug: 'computer', label: 'คอมพิวเตอร์' },
      { slug: 'aviation', label: 'การบิน' },
      { slug: 'architect-design', label: 'สถาปัตย์/ออกแบบ' },
      { slug: 'agri-fishery', label: 'เกษตร/ประมง' },
    ],
  },
  {
    key: 'arts',
    label: 'สายศิลป์',
    icon: '🎨',
    items: [
      { slug: 'law', label: 'นิติศาสตร์' },
      { slug: 'political', label: 'รัฐศาสตร์' },
      { slug: 'account-commerce', label: 'บัญชี/พาณิชย์' },
      { slug: 'commarts', label: 'นิเทศศาสตร์' },
      { slug: 'teacher', label: 'ครุศาสตร์' },
      { slug: 'lang-human', label: 'อักษร/มนุษย์' },
      { slug: 'social', label: 'สังคมศาสตร์' },
      { slug: 'economic', label: 'เศรษฐศาสตร์' },
      { slug: 'logistics', label: 'โลจิสติกส์' },
      { slug: 'architect-design', label: 'สถาปัตย์/ออกแบบ' },
      { slug: 'hospitality', label: 'การโรงแรม' },
      { slug: 'music', label: 'ดนตรี' },
    ],
  },
  {
    key: 'university',
    label: 'ตามมหาลัย',
    icon: '🎓',
    items: [
      { slug: 'tag/chulalongkorn-university', label: 'จุฬาฯ' },
      { slug: 'tag/thammasat-university', label: 'ธรรมศาสตร์' },
      { slug: 'tag/mahidol-university', label: 'มหิดล' },
      { slug: 'tag/kasetsart-university', label: 'เกษตรฯ' },
      { slug: 'tag/kmitl-king-mongkuts-institute-of-technology-ladkrabang', label: 'สจล.' },
      { slug: 'tag/kmutt-king-mongkuts-university-of-technology-thonburi', label: 'มจธ.' },
      { slug: 'tag/silpakorn-university', label: 'ศิลปากร' },
      { slug: 'tag/chiang-mai-university', label: 'มช.' },
      { slug: 'tag/srinakharinwirot-university', label: 'มศว' },
      { slug: 'tag/kmutnb-king-mongkuts-university-of-technology-north-bangkok', label: 'มจพ.' },
      { slug: 'tag/khon-kaen-university', label: 'มข.' },
      { slug: 'tag/naresuan-university', label: 'นเรศวร' },
      { slug: 'tag/burapha-university', label: 'บูรพา' },
      { slug: 'tag/prince-of-songkla-university', label: 'ม.อ.' },
      { slug: 'tag/suranaree-university-of-technology', label: 'มทส.' },
      { slug: 'tag/rajamangala-university-of-technology', label: 'ราชมงคล' },
      { slug: 'tag/rajabhat-university', label: 'ราชภัฏ' },
    ],
  },
  {
    key: 'other',
    label: 'อื่นๆ',
    icon: '✨',
    items: [
      { slug: 'private-university', label: 'ม.เอกชน' },
      { slug: 'contest', label: 'การแข่งขัน' },
    ],
  },
]

// Default category shown on open (keeps existing behavior).
export const DEFAULT_CATEGORY = 'computer'

// Find which group owns a given category slug (first match wins —
// 'architect-design' lives in two groups, defaults to 'science').
export function groupKeyForCategory(slug) {
  return CAMP_GROUPS.find((g) => g.items.some((it) => it.slug === slug))?.key ?? CAMP_GROUPS[0].key
}

// Human label for a category slug (for the "currently viewing" indicator).
export function labelForCategory(slug) {
  for (const g of CAMP_GROUPS) {
    const hit = g.items.find((it) => it.slug === slug)
    if (hit) return hit.label
  }
  return slug
}
