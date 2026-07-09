import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SchoolPanel from '../components/school/SchoolPanel'
import SubjectDetailPanel from '../components/school/SubjectDetailPanel'

export default function SchoolAppPage() {
  const navigate = useNavigate()
  const [openSubjectId, setOpenSubjectId] = useState(null)

  return (
    <div data-testid="school-app" className="relative h-dvh w-full bg-[#F4F7FC] overflow-hidden">
      <SchoolPanel
        onClose={() => navigate('/')}
        onOpenSubject={setOpenSubjectId}
      />
      {openSubjectId && (
        <SubjectDetailPanel
          subjectId={openSubjectId}
          onClose={() => setOpenSubjectId(null)}
        />
      )}
    </div>
  )
}
