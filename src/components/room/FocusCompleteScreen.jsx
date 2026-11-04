import Popup from '../ui/Popup'
import Button from '../ui/Button'
import TreeSprite from './TreeSprite'
import { useFocusStore } from '../../stores/useFocusStore'
import { TREE_LABELS } from '../../room/messages'
import { Z_MODAL } from '../../constants/zIndex'

const WITHER_TEXT = {
  hidden: 'ออกจากหน้านี้นานเกินไป ต้นไม้เลยเหี่ยว',
  away: 'พักนานเกิน 2 นาที ต้นไม้เลยเหี่ยว',
}
const LAPSE_TEXT = 'ขาดการเชื่อมต่อเกินกำหนด ต้นไม้เลยเหี่ยว'

// Shown when a session has ended: the tree, the Leaves earned and, if it withered, why.
export default function FocusCompleteScreen() {
  const status = useFocusStore((s) => s.status)
  const result = useFocusStore((s) => s.result)
  const witherReason = useFocusStore((s) => s.witherReason)
  const reset = useFocusStore((s) => s.reset)

  if ((status !== 'done' && status !== 'withered') || !result) return null
  const withered = status === 'withered'

  return (
    <Popup variant="center" size="sm" zIndex={Z_MODAL} onClose={reset}>
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <h2 className="pixel-font text-lg text-ink">{withered ? 'ต้นไม้เหี่ยวแล้ว' : result.practice ? 'ลองโฟกัสเสร็จแล้ว!' : 'โฟกัสสำเร็จ!'}</h2>
        <TreeSprite species={withered ? 'withered' : result.tree} stage={3} scale={3} />
        <p className="text-sm text-ink-soft">{TREE_LABELS[withered ? 'withered' : result.tree]}</p>
        {withered && <p className="text-sm text-ink">{WITHER_TEXT[witherReason] ?? LAPSE_TEXT}</p>}
        <p className="pixel-font text-base text-ink">{`+${result.leaves} ใบไม้`}</p>
        {result.practice && (
          <p className="text-sm text-ink-soft">
            {result.leaves > 0 ? 'ของขวัญต้อนรับ ได้ครั้งเดียวเท่านั้น' : 'ต้องครบ 1 นาทีถึงจะได้ของขวัญ ลองใหม่ได้เลย'}
          </p>
        )}
        <Button onClick={reset}>ปิด</Button>
      </div>
    </Popup>
  )
}
