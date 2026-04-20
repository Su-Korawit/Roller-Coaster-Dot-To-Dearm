export const registerAssets = {
  bg: new URL('../../assets/eachPageAssets/register/01_Register_Background.png', import.meta.url).href,
}

export const mbtiDescriptions = {
  INTJ: 'นักวางแผนผู้มีวิสัยทัศน์ หมกมุ่นกับการหาเหตุผลและกลยุทธ์',
  INTP: 'นักคิดวิเคราะห์ที่ชอบแก้ปัญหาด้วยตรรกะและความคิดสร้างสรรค์',
  ENTJ: 'ผู้นำที่กล้าตัดสินใจ มุ่งมั่นขับเคลื่อนเป้าหมายอย่างเป็นระบบ',
  ENTP: 'นักโต้วาทีที่ชอบท้าทายความคิด และหาวิธีแก้ปัญหาแบบใหม่',
  INFJ: 'ผู้มีอุดมการณ์และสัญชาตญาณสูง มุ่งมั่นช่วยเหลือผู้อื่นอย่างลึกซึ้ง',
  INFP: 'นักฝันผู้มีอุดมคติ ใส่ใจคุณค่าและความรู้สึกของตนเองและผู้อื่น',
  ENFJ: 'ผู้นำที่เปี่ยมเสน่ห์ ชอบสร้างแรงบันดาลใจและพัฒนาคนรอบข้าง',
  ENFP: 'นักสร้างสรรค์ที่กระตือรือร้น ชอบสำรวจความเป็นไปได้ใหม่ๆ',
  ISTJ: 'ผู้รับผิดชอบสูง มีระเบียบวินัย และยึดมั่นในหน้าที่อย่างเคร่งครัด',
  ISFJ: 'ผู้พิทักษ์ที่เอาใจใส่ อดทน และทุ่มเทเพื่อปกป้องคนที่รัก',
  ESTJ: 'ผู้บริหารที่มีประสิทธิภาพ ชอบจัดการและดูแลให้ทุกอย่างเป็นระเบียบ',
  ESFJ: 'ผู้ใจดีที่ชอบดูแลผู้อื่น สร้างความสามัคคีและบรรยากาศที่อบอุ่น',
  ISTP: 'นักทดลองมือฉมัง ชอบแยกแยะและแก้ปัญหาด้วยทักษะปฏิบัติ',
  ISFP: 'ศิลปินผู้เงียบสงบ ใช้ชีวิตตามค่านิยมและสุนทรียภาพของตน',
  ESTP: 'นักลงมือทำที่กล้าเสี่ยง ชอบแก้ปัญหาเฉพาะหน้าด้วยพลังงานสูง',
  ESFP: 'นักแสดงที่มีเสน่ห์ ชอบสนุกสนานและสร้างความสุขให้คนรอบข้าง',
}

export const mbtiCharacters = [
  { code: 'INTJ', name: 'Architect', image: new URL('../../assets/eachPageAssets/mbti/Character/INTJ.png', import.meta.url).href },
  { code: 'INTP', name: 'Logician', image: new URL('../../assets/eachPageAssets/mbti/Character/INTP.png', import.meta.url).href },
  { code: 'ENTJ', name: 'Commander', image: new URL('../../assets/eachPageAssets/mbti/Character/ENTJ.png', import.meta.url).href },
  { code: 'ENTP', name: 'Debater', image: new URL('../../assets/eachPageAssets/mbti/Character/ENTP.png', import.meta.url).href },
  { code: 'INFJ', name: 'Advocate', image: new URL('../../assets/eachPageAssets/mbti/Character/INFJ.png', import.meta.url).href },
  { code: 'INFP', name: 'Mediator', image: new URL('../../assets/eachPageAssets/mbti/Character/INFP.png', import.meta.url).href },
  { code: 'ENFJ', name: 'Protagonist', image: new URL('../../assets/eachPageAssets/mbti/Character/ENFJ.png', import.meta.url).href },
  { code: 'ENFP', name: 'Campaigner', image: new URL('../../assets/eachPageAssets/mbti/Character/ENFP.png', import.meta.url).href },
  { code: 'ISTJ', name: 'Logistician', image: new URL('../../assets/eachPageAssets/mbti/Character/ISTJ.png', import.meta.url).href },
  { code: 'ISFJ', name: 'Defender', image: new URL('../../assets/eachPageAssets/mbti/Character/ISFJ.png', import.meta.url).href },
  { code: 'ESTJ', name: 'Executive', image: new URL('../../assets/eachPageAssets/mbti/Character/ESTJ.png', import.meta.url).href },
  { code: 'ESFJ', name: 'Consul', image: new URL('../../assets/eachPageAssets/mbti/Character/ESFJ.png', import.meta.url).href },
  { code: 'ISTP', name: 'Virtuoso', image: new URL('../../assets/eachPageAssets/mbti/Character/ISTP.png', import.meta.url).href },
  { code: 'ISFP', name: 'Adventurer', image: new URL('../../assets/eachPageAssets/mbti/Character/ISFP.png', import.meta.url).href },
  { code: 'ESTP', name: 'Entrepreneur', image: new URL('../../assets/eachPageAssets/mbti/Character/ESTP.png', import.meta.url).href },
  { code: 'ESFP', name: 'Entertainer', image: new URL('../../assets/eachPageAssets/mbti/Character/ESFP.png', import.meta.url).href },
]

const cardImage = new URL('../../assets/03_Setup_Carrer_Refferent.png', import.meta.url).href
const cardImage2 = new URL('../../assets/03_Setup_Mastery_Refferent.png', import.meta.url).href

export const careers = [
  // — Analysts (NT): INTJ, INTP, ENTJ, ENTP —
  { id: 'data-scientist',       name: 'Data Scientist',          detail: 'วิเคราะห์ข้อมูลและสร้าง insight ด้วย AI/ML',                       image: cardImage, mbti: ['INTJ', 'INTP', 'ENTJ'] },
  { id: 'ml-engineer',          name: 'AI / ML Specialist',      detail: 'พัฒนาโมเดล Machine Learning และระบบอัจฉริยะ',                      image: cardImage, mbti: ['INTP', 'INTJ', 'ENTP'] },
  { id: 'ai-architect',         name: 'AI Solutions Architect',  detail: 'ออกแบบระบบ AI ระดับองค์กรเพื่อแก้ปัญหาธุรกิจซับซ้อน',              image: cardImage, mbti: ['INTJ', 'ENTJ', 'INTP'] },
  { id: 'prompt-engineer',      name: 'Prompt Engineer',         detail: 'สร้างและปรับแต่ง Prompt เพื่อดึงประสิทธิภาพสูงสุดจาก LLM',         image: cardImage, mbti: ['ENTP', 'INTP', 'INFJ'] },
  { id: 'product-manager',      name: 'Product Manager',         detail: 'ขับเคลื่อนทีมและวางกลยุทธ์ผลิตภัณฑ์',                             image: cardImage, mbti: ['ENTJ', 'ENTP', 'ESTJ'] },
  { id: 'fintech-developer',    name: 'Fintech Developer',       detail: 'พัฒนาแอปการเงินและระบบ Blockchain สำหรับยุค Digital Banking',        image: cardImage, mbti: ['INTJ', 'INTP', 'ENTJ'] },

  // — Diplomats (NF): INFJ, INFP, ENFJ, ENFP —
  { id: 'ui-ux',                name: 'UI/UX Designer',          detail: 'ออกแบบประสบการณ์ใช้งานที่ใช้ง่ายและสวยงาม',                        image: cardImage, mbti: ['INFP', 'ENFP', 'ISFP'] },
  { id: 'content-strategist',   name: 'Content Strategist',      detail: 'วางกลยุทธ์คอนเทนต์และ Brand Storytelling ที่ขับเคลื่อนด้วย AI',    image: cardImage, mbti: ['ENFP', 'INFJ', 'ENFJ'] },
  { id: 'learning-designer',    name: 'Learning Experience Designer', detail: 'ออกแบบหลักสูตรและประสบการณ์การเรียนรู้ดิจิทัลยุค EdTech',    image: cardImage, mbti: ['INFJ', 'ENFJ', 'INFP'] },
  { id: 'wellness-coach',       name: 'Digital Wellness Coach',  detail: 'ให้คำปรึกษาสุขภาพจิตและ Productivity ผ่านแพลตฟอร์มออนไลน์',        image: cardImage, mbti: ['INFJ', 'ISFJ', 'ENFJ'] },
  { id: 'hr-tech',              name: 'HR Tech Specialist',      detail: 'ใช้ Data และ AI เพื่อยกระดับกระบวนการสรรหาและพัฒนาคน',            image: cardImage, mbti: ['ENFJ', 'ESFJ', 'INFJ'] },

  // — Sentinels (SJ): ISTJ, ISFJ, ESTJ, ESFJ —
  { id: 'cybersecurity',        name: 'Cybersecurity Analyst',   detail: 'ตรวจจับและป้องกันภัยคุกคามทางไซเบอร์ระดับองค์กร',                  image: cardImage, mbti: ['ISTJ', 'INTJ', 'ESTJ'] },
  { id: 'compliance-officer',   name: 'Digital Compliance Officer', detail: 'ดูแลให้ระบบและข้อมูลองค์กรสอดคล้องกับกฎหมาย PDPA/GDPR',        image: cardImage, mbti: ['ISTJ', 'ESTJ', 'ISFJ'] },
  { id: 'project-manager',      name: 'Project Manager (Agile)', detail: 'บริหารโปรเจกต์เทคโนโลยีด้วย Agile/Scrum ให้ส่งมอบตรงเวลา',        image: cardImage, mbti: ['ESTJ', 'ENTJ', 'ISFJ'] },
  { id: 'cloud-ops',            name: 'Cloud Operations Engineer', detail: 'ดูแลโครงสร้างพื้นฐาน Cloud (AWS/GCP/Azure) ให้เสถียรและปลอดภัย', image: cardImage, mbti: ['ISTJ', 'ISTP', 'ESTJ'] },
  { id: 'business-analyst',     name: 'Business Analyst',        detail: 'แปลงความต้องการธุรกิจเป็น Requirement ที่ทีม Tech นำไปพัฒนาได้',   image: cardImage, mbti: ['ESTJ', 'ESFJ', 'ISTJ'] },

  // — Explorers (SP): ISTP, ISFP, ESTP, ESFP —
  { id: 'fullstack-dev',        name: 'Full-Stack Developer',    detail: 'พัฒนาเว็บและแอปตั้งแต่ Frontend ถึง Backend แบบครบวงจร',           image: cardImage, mbti: ['ISTP', 'INTP', 'ESTP'] },
  { id: 'digital-artist',       name: 'Digital Artist / 3D Creator', detail: 'สร้างงานศิลปะดิจิทัล, Game Asset, และงาน NFT/Metaverse',      image: cardImage, mbti: ['ISFP', 'INFP', 'ESFP'] },
  { id: 'game-developer',       name: 'Game Developer',          detail: 'ออกแบบและพัฒนาเกมด้วย Unity/Unreal ตั้งแต่ Logic ถึง Visual',      image: cardImage, mbti: ['ISTP', 'INTP', 'ISFP'] },
  { id: 'growth-hacker',        name: 'Growth Hacker',           detail: 'ทดลองกลยุทธ์ Marketing แบบ Data-driven เพื่อขยายฐานผู้ใช้',        image: cardImage, mbti: ['ESTP', 'ENTP', 'ESFP'] },
  { id: 'iot-engineer',         name: 'IoT / Hardware Engineer', detail: 'เชื่อมโลก Physical และ Digital ด้วยอุปกรณ์ Embedded และ Sensor',    image: cardImage, mbti: ['ISTP', 'ESTP', 'INTJ'] },
]

export const masteries = [
  // — Data & AI —
  { id: 'python',               name: 'Python for AI',           detail: 'ภาษาหลักสำหรับ Data Science, ML และ Automation',                   image: cardImage2, careers: ['data-scientist', 'ml-engineer', 'ai-architect', 'prompt-engineer'] },
  { id: 'sql',                  name: 'SQL & Data Analytics',    detail: 'วิเคราะห์และจัดการฐานข้อมูลเชิงโครงสร้าง',                        image: cardImage2, careers: ['data-scientist', 'business-analyst', 'compliance-officer'] },
  { id: 'machine-learning',     name: 'Machine Learning',        detail: 'สร้างโมเดลทำนายและจำแนกข้อมูลด้วย Supervised/Unsupervised Learning', image: cardImage2, careers: ['ml-engineer', 'ai-architect', 'data-scientist'] },
  { id: 'prompt-engineering',   name: 'Prompt Engineering',      detail: 'ออกแบบ Prompt ให้ LLM ทำงานได้แม่นยำและมีประสิทธิภาพสูง',          image: cardImage2, careers: ['prompt-engineer', 'content-strategist', 'learning-designer'] },
  { id: 'cloud-computing',      name: 'Cloud Computing',         detail: 'ออกแบบและบริหารระบบบน AWS, GCP หรือ Azure',                        image: cardImage2, careers: ['ai-architect', 'cloud-ops', 'fintech-developer'] },

  // — Design & Product —
  { id: 'figma',                name: 'Figma & Prototyping',     detail: 'ออกแบบ UI และ Prototype แบบมืออาชีพ',                              image: cardImage2, careers: ['ui-ux', 'learning-designer', 'content-strategist'] },
  { id: 'user-research',        name: 'User Research',           detail: 'ศึกษาพฤติกรรมผู้ใช้เพื่อออกแบบ Product ที่ตรงความต้องการ',         image: cardImage2, careers: ['ui-ux', 'product-manager', 'hr-tech'] },
  { id: 'strategic-thinking',   name: 'Strategic Thinking',      detail: 'คิดเชิงระบบ วางกลยุทธ์ และตัดสินใจด้วยข้อมูล',                    image: cardImage2, careers: ['product-manager', 'data-scientist', 'business-analyst'] },
  { id: 'storytelling',         name: 'Storytelling & Copywriting', detail: 'เล่าเรื่องที่ดึงดูดใจและสร้าง Brand Narrative ที่ทรงพลัง',     image: cardImage2, careers: ['content-strategist', 'wellness-coach', 'hr-tech'] },

  // — Engineering & Security —
  { id: 'cybersecurity-fundamentals', name: 'Cybersecurity Fundamentals', detail: 'ความรู้พื้นฐานด้านความมั่นคงปลอดภัยไซเบอร์และ Ethical Hacking', image: cardImage2, careers: ['cybersecurity', 'cloud-ops', 'compliance-officer'] },
  { id: 'agile-scrum',          name: 'Agile & Scrum',           detail: 'บริหารโปรเจกต์แบบ Iterative ด้วย Framework ที่ทีม Tech ใช้จริง',    image: cardImage2, careers: ['project-manager', 'product-manager', 'business-analyst'] },
  { id: 'react-nextjs',         name: 'React / Next.js',         detail: 'พัฒนา Web Application สมัยใหม่ด้วย Component-based Architecture',    image: cardImage2, careers: ['fullstack-dev', 'fintech-developer', 'growth-hacker'] },
  { id: 'blockchain',           name: 'Blockchain & Web3',       detail: 'เข้าใจระบบ Decentralized, Smart Contract และ DeFi',                 image: cardImage2, careers: ['fintech-developer', 'digital-artist'] },

  // — Creative & Growth —
  { id: '3d-modeling',          name: '3D Modeling & Animation', detail: 'สร้าง 3D Asset สำหรับเกม, VR/AR และ Metaverse ด้วย Blender/Maya',  image: cardImage2, careers: ['digital-artist', 'game-developer'] },
  { id: 'game-design',          name: 'Game Design & Unity',     detail: 'ออกแบบ Gameplay Mechanic และพัฒนาเกมด้วย Unity Engine',             image: cardImage2, careers: ['game-developer', 'digital-artist'] },
  { id: 'growth-marketing',     name: 'Growth Marketing & SEO',  detail: 'ขยายฐานผู้ใช้ด้วย Data-driven Marketing, A/B Testing และ SEO',      image: cardImage2, careers: ['growth-hacker', 'content-strategist'] },
  { id: 'iot-embedded',         name: 'IoT & Embedded Systems',  detail: 'เขียนโปรแกรมควบคุมฮาร์ดแวร์และเชื่อมต่ออุปกรณ์ Smart Device',      image: cardImage2, careers: ['iot-engineer', 'cloud-ops'] },
]

export const universities = [
  { id: 'cu',     score: 88.07, name: 'จุฬาลงกรณ์มหาวิทยาลัย',                           shortName: 'CU',     image: new URL('../../assets/eachPageAssets/page4/University/จุฬาลงกรณ์มหาวิทยาลัย.png', import.meta.url).href },
  { id: 'mu',     score: 87.55, name: 'มหาวิทยาลัยมหิดล',                                 shortName: 'MU',     image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยมหิดล.png', import.meta.url).href },
  { id: 'cmu',    score: 83.47, name: 'มหาวิทยาลัยเชียงใหม่',                             shortName: 'CMU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยเชียงใหม่.png', import.meta.url).href },
  { id: 'kku',    score: 81.69, name: 'มหาวิทยาลัยขอนแก่น',                               shortName: 'KKU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยขอนแก่น.png', import.meta.url).href },
  { id: 'ku',     score: 80.79, name: 'มหาวิทยาลัยเกษตรศาสตร์',                           shortName: 'KU',     image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยเกษตรศาสตร์.png', import.meta.url).href },
  { id: 'psu',    score: 80.75, name: 'มหาวิทยาลัยสงขลานครินทร์',                         shortName: 'PSU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยสงขลานครินทร์.png', import.meta.url).href },
  { id: 'kmutt',  score: 78.27, name: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี',           shortName: 'KMUTT',  image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี.jpg', import.meta.url).href },
  { id: 'tu',     score: 78.14, name: 'มหาวิทยาลัยธรรมศาสตร์',                            shortName: 'TU',     image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยธรรมศาสตร์.png', import.meta.url).href },
  { id: 'nu',     score: 75.77, name: 'มหาวิทยาลัยนเรศวร',                                shortName: 'NU',     image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยนเรศวร.png', import.meta.url).href },
  { id: 'ait',    score: 73.57, name: 'สถาบันเทคโนโลยีแห่งเอเชีย',                        shortName: 'AIT',    image: null },
  { id: 'kmutnb', score: 73.14, name: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ',      shortName: 'KMUTNB', image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ.png', import.meta.url).href },
  { id: 'buu',    score: 71.01, name: 'มหาวิทยาลัยบูรพา',                                 shortName: 'BUU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยบูรพา.png', import.meta.url).href },
  { id: 'msu',    score: 70.48, name: 'มหาวิทยาลัยมหาสารคาม',                             shortName: 'MSU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยมหาสารคาม.svg.png', import.meta.url).href },
  { id: 'swu',    score: 69.26, name: 'มหาวิทยาลัยศรีนครินทรวิโรฒ',                       shortName: 'SWU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยศรีนครินทรวิโรฒ.png', import.meta.url).href },
  { id: 'ssru',   score: 68.84, name: 'มหาวิทยาลัยราชภัฏสวนสุนันทา',                      shortName: 'SSRU',   image: null },
  { id: 'mfu',    score: 68.52, name: 'มหาวิทยาลัยแม่ฟ้าหลวง',                            shortName: 'MFU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยแม่ฟ้าหลวง.png', import.meta.url).href },
  { id: 'wu',     score: 66.31, name: 'มหาวิทยาลัยวลัยลักษณ์',                            shortName: 'WU',     image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยวลัยลักษณ์.png', import.meta.url).href },
  { id: 'ubu',    score: 65.58, name: 'มหาวิทยาลัยอุบลราชธานี',                           shortName: 'UBU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยอุบลราชธานี.gif', import.meta.url).href },
  { id: 'nida',   score: 63.28, name: 'สถาบันบัณฑิตพัฒนบริหารศาสตร์',                     shortName: 'NIDA',   image: null },
  { id: 'ru',     score: 62.29, name: 'มหาวิทยาลัยรามคำแหง',                              shortName: 'RU',     image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยรามคำแหง.png', import.meta.url).href },
  { id: 'rsu',    score: 61.97, name: 'มหาวิทยาลัยรังสิต',                                shortName: 'RSU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยรังสิต.png', import.meta.url).href },
  { id: 'rmuti',  score: 61.67, name: 'มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน',                shortName: 'RMUTI',  image: null },
  { id: 'bu',     score: 59.95, name: 'มหาวิทยาลัยกรุงเทพ',                               shortName: 'BU',     image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยกรุงเทพ.png', import.meta.url).href },
  { id: 'utcc',   score: 59.77, name: 'มหาวิทยาลัยหอการค้าไทย',                           shortName: 'UTCC',   image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยหอการค้าไทย.jpg', import.meta.url).href },
  { id: 'sdu',    score: 59.51, name: 'มหาวิทยาลัยสวนดุสิต',                              shortName: 'SDU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยสวนดุสิต.png', import.meta.url).href },
  { id: 'au',     score: 59.47, name: 'มหาวิทยาลัยอัสสัมชัญ',                             shortName: 'AU',     image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยอัสสัมชัญ.png', import.meta.url).href },
  { id: 'npru',   score: 58.89, name: 'มหาวิทยาลัยราชภัฏนครปฐม',                          shortName: 'NPRU',   image: null },
  { id: 'up',     score: 58.55, name: 'มหาวิทยาลัยพะเยา',                                 shortName: 'UP',     image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยพะเยา.png', import.meta.url).href },
  { id: 'tsu',    score: 56.27, name: 'มหาวิทยาลัยทักษิณ',                                shortName: 'TSU',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยทักษิณ.png', import.meta.url).href },
  { id: 'mut',    score: 55.39, name: 'มหาวิทยาลัยเทคโนโลยีมหานคร',                       shortName: 'MUT',    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยเทคโนโลยีมหานคร.png', import.meta.url).href },
]

export const programs = [
  { id: 'ce-cu',       name: 'วิศวกรรมคอมพิวเตอร์',                          uni: 'cu',     detail: 'เน้นการพัฒนา software, AI และระบบขนาดใหญ่',                         round: 'TCAS รอบ 1 Portfolio',   careers: ['ai-architect', 'fullstack-dev'],      masteries: ['python', 'machine-learning'] },
  { id: 'ict-mu',      name: 'เทคโนโลยีสารสนเทศและการสื่อสาร (ICT)',          uni: 'mu',     detail: 'หลักสูตรนานาชาติ เน้น Tech Ecosystem และ Networking',              round: 'TCAS รอบ 1 Portfolio',   careers: ['fullstack-dev', 'cybersecurity'],     masteries: ['cloud-computing', 'cybersecurity-fundamentals'] },
  { id: 'se-cmu',      name: 'วิศวกรรมซอฟต์แวร์',                             uni: 'cmu',    detail: 'การสร้างซอฟต์แวร์มาตรฐานสากลและ Agile Methodology',                round: 'TCAS รอบ 2 Quota',       careers: ['fullstack-dev', 'product-manager'],   masteries: ['agile-scrum', 'react-nextjs'] },
  { id: 'ai-kku',      name: 'ปัญญาประดิษฐ์',                                  uni: 'kku',    detail: 'ออกแบบโมเดล AI และประยุกต์ใช้กับงานจริงในอุตสาหกรรม',             round: 'TCAS รอบ 2 Quota',       careers: ['ai-architect', 'ml-engineer'],        masteries: ['machine-learning', 'python'] },
  { id: 'ds-ku',       name: 'วิทยาการข้อมูล (Data Science)',                  uni: 'ku',     detail: 'สถิติขั้นสูง การวิเคราะห์ข้อมูล Big Data และ ML',                  round: 'TCAS รอบ 3 Admission',   careers: ['data-scientist', 'business-analyst'], masteries: ['sql', 'machine-learning'] },
  { id: 'ce-psu',      name: 'วิศวกรรมคอมพิวเตอร์',                            uni: 'psu',    detail: 'พัฒนาระบบฝังตัว (Embedded) และความปลอดภัยไซเบอร์',                  round: 'TCAS รอบ 2 Quota',       careers: ['cybersecurity', 'iot-engineer'],       masteries: ['cybersecurity-fundamentals', 'iot-embedded'] },
  { id: 'mdd-kmutt',   name: 'วิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย',       uni: 'kmutt',  detail: 'ผสานโค้ดดิ้งกับศิลปะ สร้าง Interactive Media และเกม',               round: 'TCAS รอบ 1 Portfolio',   careers: ['ui-ux', 'game-developer'],            masteries: ['figma', '3d-modeling'] },
  { id: 'se-tu',       name: 'วิศวกรรมซอฟต์แวร์ (Soft-en)',                   uni: 'tu',     detail: 'การบริหารจัดการโปรเจกต์ซอฟต์แวร์ขนาดใหญ่',                        round: 'TCAS รอบ 3 Admission',   careers: ['fullstack-dev', 'product-manager'],   masteries: ['agile-scrum', 'react-nextjs'] },
  { id: 'cs-nu',       name: 'วิทยาการคอมพิวเตอร์',                            uni: 'nu',     detail: 'พื้นฐานโครงสร้างข้อมูลและอัลกอริทึมที่แข็งแกร่ง',                  round: 'TCAS รอบ 2 Quota',       careers: ['fullstack-dev', 'ml-engineer'],        masteries: ['python', 'sql'] },
  { id: 'de-ait',      name: 'Data Science and AI',                            uni: 'ait',    detail: 'หลักสูตรอินเตอร์ เน้นงานวิจัยและการนำ AI ไปแก้ปัญหา Global',      round: 'Direct Admission',       careers: ['ai-architect', 'data-scientist'],     masteries: ['machine-learning', 'prompt-engineering'] },
  { id: 'it-kmutnb',   name: 'เทคโนโลยีสารสนเทศ (IT)',                         uni: 'kmutnb', detail: 'เน้นการปฏิบัติงานจริง Network และ System Admin',                   round: 'TCAS รอบ 3 Admission',   careers: ['cybersecurity', 'cloud-ops'],         masteries: ['cloud-computing', 'cybersecurity-fundamentals'] },
  { id: 'ai-buu',      name: 'ปัญญาประดิษฐ์ประยุกต์และเทคโนโลยีอัจฉริยะ',     uni: 'buu',    detail: 'การสร้าง Smart Device และ IoT อัจฉริยะ',                           round: 'TCAS รอบ 2 Quota',       careers: ['ai-architect', 'iot-engineer'],       masteries: ['python', 'iot-embedded'] },
  { id: 'cs-msu',      name: 'วิทยาการคอมพิวเตอร์',                            uni: 'msu',    detail: 'เน้น Full-stack Web Development และ Mobile App',                   round: 'TCAS รอบ 2 Quota',       careers: ['fullstack-dev'],                      masteries: ['react-nextjs', 'sql'] },
  { id: 'dsi-swu',     name: 'นวัตกรรมข้อมูลและการสื่อสาร',                    uni: 'swu',    detail: 'บูรณาการ Data เข้ากับการสร้างสรรค์ Content และ Marketing',         round: 'TCAS รอบ 1 Portfolio',   careers: ['data-scientist', 'content-strategist'],masteries: ['sql', 'storytelling'] },
  { id: 'digi-ssru',   name: 'การออกแบบดิจิทัล',                               uni: 'ssru',   detail: 'กราฟิกดีไซน์, 3D Animation และ UX/UI',                             round: 'TCAS รอบ 1 Portfolio',   careers: ['ui-ux', 'digital-artist'],            masteries: ['figma', '3d-modeling'] },
  { id: 'se-mfu',      name: 'วิศวกรรมซอฟต์แวร์',                              uni: 'mfu',    detail: 'เรียนเป็นภาษาอังกฤษทั้งหมด เน้น Software Testing และ QA',           round: 'TCAS รอบ 1 Portfolio',   careers: ['fullstack-dev', 'compliance-officer'],masteries: ['agile-scrum', 'cloud-computing'] },
  { id: 'ai-wu',       name: 'วิศวกรรมคอมพิวเตอร์และปัญญาประดิษฐ์',            uni: 'wu',     detail: 'เน้น AI ทางการแพทย์และระบบอัตโนมัติ',                              round: 'TCAS รอบ 2 Quota',       careers: ['ai-architect', 'ml-engineer'],        masteries: ['machine-learning', 'iot-embedded'] },
  { id: 'it-ubu',      name: 'เทคโนโลยีสารสนเทศ',                              uni: 'ubu',    detail: 'เทคโนโลยีเว็บ และการจัดการฐานข้อมูลองค์กร',                        round: 'TCAS รอบ 2 Quota',       careers: ['fullstack-dev', 'cloud-ops'],         masteries: ['sql', 'react-nextjs'] },
  { id: 'da-nida',     name: 'การจัดการวิเคราะห์ข้อมูลและเทคโนโลยี',           uni: 'nida',   detail: 'Business Intelligence และ Data Strategy',                          round: 'Direct Admission',       careers: ['data-scientist', 'business-analyst'], masteries: ['sql', 'strategic-thinking'] },
  { id: 'cs-ru',       name: 'วิทยาการคอมพิวเตอร์',                            uni: 'ru',     detail: 'เรียนรู้ด้วยตนเอง เน้นวินัย อัลกอริทึมและการเขียนโปรแกรม',         round: 'Direct Admission',       careers: ['fullstack-dev'],                      masteries: ['python', 'sql'] },
  { id: 'biomed-rsu',  name: 'วิศวกรรมชีวการแพทย์',                            uni: 'rsu',    detail: 'ผสานวิศวกรรมเข้ากับวงการแพทย์ สร้างอุปกรณ์ IoT Health',           round: 'Direct Admission',       careers: ['iot-engineer', 'wellness-coach'],     masteries: ['iot-embedded', 'python'] },
  { id: 'is-rmuti',    name: 'ระบบสารสนเทศคอมพิวเตอร์',                        uni: 'rmuti',  detail: 'สายปฏิบัติการ Enterprise Software และ IT Support',                 round: 'TCAS รอบ 3 Admission',   careers: ['cloud-ops', 'compliance-officer'],    masteries: ['cloud-computing', 'agile-scrum'] },
  { id: 'game-bu',     name: 'เกมและสื่ออินเทอร์แอคทีฟ',                       uni: 'bu',     detail: 'Game Design, Unity, Unreal Engine ครบวงจร',                        round: 'Direct Admission',       careers: ['game-developer', 'digital-artist'],  masteries: ['game-design', '3d-modeling'] },
  { id: 'fineng-utcc', name: 'วิศวกรรมการเงิน',                                uni: 'utcc',   detail: 'สร้างระบบเทรดอัตโนมัติ (Bot) และ Fintech Application',             round: 'Direct Admission',       careers: ['fintech-developer', 'data-scientist'],masteries: ['python', 'blockchain'] },
  { id: 'digicom-sdu', name: 'การสื่อสารดิจิทัล',                              uni: 'sdu',    detail: 'การจัดการโซเชียลมีเดีย และ Digital Marketing',                     round: 'TCAS รอบ 1 Portfolio',   careers: ['growth-hacker', 'content-strategist'],masteries: ['growth-marketing', 'storytelling'] },
  { id: 'cs-au',       name: 'Computer Science',                               uni: 'au',     detail: 'หลักสูตรนานาชาติ มุ่งเน้น Global Tech Company',                    round: 'Direct Admission',       careers: ['fullstack-dev', 'ai-architect'],      masteries: ['python', 'react-nextjs'] },
  { id: 'se-npru',     name: 'วิศวกรรมซอฟต์แวร์',                              uni: 'npru',   detail: 'เน้นทักษะ Coding เพื่อตอบโจทย์ตลาดแรงงานระดับภูมิภาค',           round: 'TCAS รอบ 2 Quota',       careers: ['fullstack-dev'],                      masteries: ['react-nextjs', 'agile-scrum'] },
  { id: 'ds-up',       name: 'วิทยาการข้อมูลและการประยุกต์',                    uni: 'up',     detail: 'การนำข้อมูลไปใช้กับธุรกิจระดับท้องถิ่นและ SME',                    round: 'TCAS รอบ 2 Quota',       careers: ['data-scientist', 'business-analyst'], masteries: ['sql', 'strategic-thinking'] },
  { id: 'it-tsu',      name: 'เทคโนโลยีสารสนเทศ',                              uni: 'tsu',    detail: 'พัฒนาแอปพลิเคชันมือถือ และเว็บไซต์ E-Commerce',                   round: 'TCAS รอบ 2 Quota',       careers: ['fullstack-dev', 'growth-hacker'],     masteries: ['react-nextjs', 'growth-marketing'] },
  { id: 'ai-mut',      name: 'วิศวกรรมปัญญาประดิษฐ์',                          uni: 'mut',    detail: 'เน้น Deep Tech, Robotics และการประมวลผลขั้นสูง',                   round: 'Direct Admission',       careers: ['ai-architect', 'iot-engineer'],       masteries: ['machine-learning', 'iot-embedded'] },
]
