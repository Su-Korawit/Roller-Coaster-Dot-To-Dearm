// Notebook export schema — mirrors ADR-0001's Roadmap export approach
// (docs/adr/0001-roadmap-export-schema.md, src/utils/roadmapExport.js): a
// versioned, store-independent serialisation. Ids and timestamps are NOT
// included — import regenerates them via upsertNote's merge logic, so
// re-importing a file can never collide with existing note ids.

const SCHEMA_VERSION = 1

export function toNotebookSchema(notes) {
  return {
    version: SCHEMA_VERSION,
    notes: notes.map((n) => ({ date: n.date, subjectId: n.subjectId ?? null, text: n.text })),
  }
}

export function fromNotebookSchema(schema) {
  if (!schema || schema.version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported notebook schema version: ${schema?.version}`)
  }
  return schema.notes.map((n) => ({
    date: n.date,
    subjectId: n.subjectId ?? null,
    text: n.text,
  }))
}
