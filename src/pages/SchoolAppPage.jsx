import { useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import SchoolPanel from '../components/school/SchoolPanel'
import SubjectDetailPanel from '../components/school/SubjectDetailPanel'

const TaskPanel = lazy(() => import('../components/TaskPanel'))

export default function SchoolAppPage() {
  const navigate = useNavigate()
  const [openSubjectId, setOpenSubjectId] = useState(null)
  const [tab, setTab] = useState('school')

  return (
    <div data-testid="school-app" className="relative h-full w-full bg-[#F4F7FC] overflow-hidden flex flex-col">
      <div className="shrink-0 flex border-b-2 border-ink bg-surface">
        {[
          { key: 'school', label: 'โรงเรียน' },
          { key: 'tasks', label: 'To-do' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 thai-font text-sm font-semibold relative ${
              tab === t.key ? 'text-brand-strong' : 'text-ink-soft'
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-strong" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 relative">
        {tab === 'school' ? (
          <SchoolPanel
            onClose={() => navigate('/')}
            onOpenSubject={setOpenSubjectId}
          />
        ) : (
          <Suspense fallback={null}>
            <TaskPanel onClose={() => setTab('school')} />
          </Suspense>
        )}
        {openSubjectId && tab === 'school' && (
          <SubjectDetailPanel
            subjectId={openSubjectId}
            onClose={() => setOpenSubjectId(null)}
          />
        )}
      </div>
    </div>
  )
}
