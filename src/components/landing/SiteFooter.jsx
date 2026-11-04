import { SITES } from '../../constants/sites'
import { siteHref } from './siteHref'
import { LEGAL_PATHS } from '../../constants/legal'

const TOOL_KEYS = ['roadmap', 'tcas', 'news', 'school']

const LINK_ITEMS = [
  { key: 'app', label: 'เข้าแอป' },
  { key: 'news', label: 'ข่าว + ปฏิทิน' },
  { key: 'hub', label: 'หน้าแรก' },
]

export default function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t-2 border-ink bg-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 md:px-6">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <img
              src="/brand/logo-96.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded border-2 border-ink"
            />
            <p className="wordmark-font pixel-title text-xs">I LOVE TCAS</p>
          </div>
          <p className="thai-font text-sm leading-relaxed text-ink-soft">
            เครื่องมือวางแผนสอบติดมหาลัยสำหรับนักเรียนไทย
          </p>
          <a
            href="mailto:o.korawitt@gmail.com"
            className="thai-font mt-3 inline-block text-sm text-brand-strong hover:underline"
          >
            o.korawitt@gmail.com
          </a>
        </div>

        <div>
          <h2 className="pixel-font mb-3 text-xs text-ink">เครื่องมือ</h2>
          <ul className="space-y-2">
            {TOOL_KEYS.map((key) => (
              <li key={key}>
                <a
                  href={siteHref(key)}
                  className="thai-font text-sm text-ink-soft hover:text-brand-strong hover:underline"
                >
                  {SITES[key].shortName}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="pixel-font mb-3 text-xs text-ink">ลิงก์</h2>
          <ul className="space-y-2">
            {LINK_ITEMS.map(({ key, label }) => (
              <li key={key}>
                <a
                  href={siteHref(key)}
                  className="thai-font text-sm text-ink-soft hover:text-brand-strong hover:underline"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="pixel-font mb-3 text-xs text-ink">ติดต่อ</h2>
          <a
            href="mailto:o.korawitt@gmail.com"
            className="thai-font text-sm text-ink-soft hover:text-brand-strong hover:underline"
          >
            o.korawitt@gmail.com
          </a>
        </div>
      </div>

      <div className="border-t-2 border-ink">
        <p className="thai-font mx-auto max-w-6xl px-4 py-4 text-center text-xs text-ink/50 md:px-6">
          © {year} I LOVE TCAS
          {' · '}
          <a href={LEGAL_PATHS.privacy} className="underline hover:text-brand-strong">นโยบายความเป็นส่วนตัว</a>
          {' · '}
          <a href={LEGAL_PATHS.terms} className="underline hover:text-brand-strong">ข้อกำหนดการใช้งาน</a>
        </p>
      </div>
    </footer>
  )
}
