// News Panel — shows CAMPHUB news feed
const camphubLogo = new URL('../../assets/eachPageAssets/news/camphub_logo.png', import.meta.url).href
const camphubPoster = new URL('../../assets/eachPageAssets/news/camphub_poster.jpg', import.meta.url).href

const NEWS_ITEMS = [
  {
    id: 'n1',
    source: 'CAMPHUB',
    title: 'Hackathon Thailand 2026 — เปิดรับสมัครแล้ว!',
    desc: 'ประกวดไอเดีย AI & Tech Solutions ชิงทุนกว่า 500,000 บาท',
    poster: camphubPoster,
    url: 'https://camphub.in.th',
    date: '14 เม.ย. 2026',
  },
  {
    id: 'n2',
    source: 'CAMPHUB',
    title: 'Data Science Bootcamp รุ่น 12',
    desc: 'เรียนเข้มข้น 3 เดือน พร้อมหางานหลังจบ — สมัครได้ถึง 30 เม.ย.',
    poster: camphubPoster,
    url: 'https://camphub.in.th',
    date: '10 เม.ย. 2026',
  },
]

export default function NewsPanel({ onClose }) {
  function openLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-white/95 backdrop-blur-sm rounded-t-4xl overflow-hidden"
      style={{ top: '8%' }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <img src={camphubLogo} alt="CAMPHUB" className="w-7 h-7 rounded-lg object-contain" />
          <h2 className="pixel-font text-[12px] text-gray-800">News</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {NEWS_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => openLink(item.url)}
            className="w-full text-left rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white active:scale-[0.98] transition-transform"
          >
            <img
              src={item.poster}
              alt={item.title}
              className="w-full h-36 object-cover"
            />
            <div className="px-4 py-3">
              <div className="flex items-center gap-1 mb-1">
                <img src={camphubLogo} alt="" className="w-4 h-4 rounded object-contain" />
                <span className="text-[10px] text-purple-500 font-semibold">{item.source}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{item.date}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 leading-snug">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
