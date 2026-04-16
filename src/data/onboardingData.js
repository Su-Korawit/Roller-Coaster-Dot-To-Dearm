export const registerAssets = {
  bg: new URL('../../assets/eachPageAssets/register/01_Register_Background.png', import.meta.url).href,
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
  { id: 'data-scientist', name: 'Data Scientist', detail: 'วิเคราะห์ข้อมูลและสร้าง insight ด้วย AI/ML', image: cardImage, mbti: ['INTJ', 'INTP', 'ENTJ'] },
  { id: 'ml-engineer', name: 'AI / ML Specialist', detail: 'พัฒนาโมเดล Machine Learning และระบบอัจฉริยะ', image: cardImage, mbti: ['INTJ', 'ENTP', 'INFJ'] },
  { id: 'ui-ux', name: 'UI/UX Designer', detail: 'ออกแบบประสบการณ์ใช้งานที่ใช้ง่ายและสวยงาม', image: cardImage, mbti: ['INFP', 'ENFP', 'ISFP'] },
  { id: 'product-manager', name: 'Product Manager', detail: 'ขับเคลื่อนทีมและวางกลยุทธ์ผลิตภัณฑ์', image: cardImage, mbti: ['ENTJ', 'ENFJ', 'ESTJ'] },
]

export const masteries = [
  { id: 'python', name: 'Python', detail: 'ภาษาหลักสำหรับ Data และ Automation', image: cardImage2, careers: ['data-scientist', 'ml-engineer'] },
  { id: 'strategic-thinking', name: 'Strategic Thinking', detail: 'คิดเชิงระบบและตัดสินใจด้วยข้อมูล', image: cardImage2, careers: ['product-manager', 'data-scientist'] },
  { id: 'figma', name: 'Figma', detail: 'ออกแบบ UI และ Prototype แบบมืออาชีพ', image: cardImage2, careers: ['ui-ux'] },
  { id: 'sql', name: 'SQL', detail: 'วิเคราะห์และจัดการฐานข้อมูลเชิงโครงสร้าง', image: cardImage2, careers: ['data-scientist', 'ml-engineer'] },
]

export const universities = [
  {
    id: 'chula',
    name: 'จุฬาลงกรณ์มหาวิทยาลัย',
    image: new URL('../../assets/eachPageAssets/page4/University/จุฬาลงกรณ์มหาวิทยาลัย.png', import.meta.url).href,
  },
  {
    id: 'ku',
    name: 'มหาวิทยาลัยเกษตรศาสตร์',
    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยเกษตรศาสตร์.png', import.meta.url).href,
  },
  {
    id: 'kku',
    name: 'มหาวิทยาลัยขอนแก่น',
    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยขอนแก่น.png', import.meta.url).href,
  },
  {
    id: 'cmu',
    name: 'มหาวิทยาลัยเชียงใหม่',
    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยเชียงใหม่.png', import.meta.url).href,
  },
  {
    id: 'tu',
    name: 'มหาวิทยาลัยธรรมศาสตร์',
    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยธรรมศาสตร์.png', import.meta.url).href,
  },
  {
    id: 'mahidol',
    name: 'มหาวิทยาลัยมหิดล',
    image: new URL('../../assets/eachPageAssets/page4/University/มหาวิทยาลัยมหิดล.png', import.meta.url).href,
  },
]

export const programs = [
  {
    id: 'ce-chula',
    name: 'วิศวกรรมคอมพิวเตอร์',
    uni: 'chula',
    detail: 'เน้นการพัฒนา software, AI และระบบขนาดใหญ่',
    round: 'TCAS รอบ Portfolio',
  },
  {
    id: 'ds-ku',
    name: 'Data Science',
    uni: 'ku',
    detail: 'เรียนรู้สถิติ การวิเคราะห์ข้อมูล และ machine learning',
    round: 'TCAS รอบ 3 Admission',
  },
  {
    id: 'ai-kku',
    name: 'AI Engineering',
    uni: 'kku',
    detail: 'ออกแบบโมเดล AI และประยุกต์ใช้กับงานจริง',
    round: 'TCAS รอบ 2 Quota',
  },
  {
    id: 'it-cmu',
    name: 'Information Technology',
    uni: 'cmu',
    detail: 'สร้างผลิตภัณฑ์ดิจิทัลแบบครบวงจร',
    round: 'TCAS รอบ 3 Admission',
  },
]
