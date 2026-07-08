// Timetable template schema — mirrors notebookExport.js / ADR-0001: a
// versioned, store-independent serialisation. Ids are NOT included — import
// regenerates them through useSchoolStore's normal add actions.

const SCHEMA_VERSION = 1

export function toTimetableTemplate(subjects, scheduleSlots) {
  return {
    version: SCHEMA_VERSION,
    subjects: subjects.map((s) => ({
      name: s.name,
      color: s.color,
      slots: scheduleSlots
        .filter((sl) => sl.subjectId === s.id)
        .map(({ day, startTime, endTime }) => ({ day, startTime, endTime })),
    })),
  }
}

export function fromTimetableTemplate(template) {
  if (!template || template.version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported timetable template version: ${template?.version}`)
  }
  return template.subjects.map((s) => ({
    name: s.name,
    color: s.color,
    slots: (s.slots ?? []).map(({ day, startTime, endTime }) => ({ day, startTime, endTime })),
  }))
}
