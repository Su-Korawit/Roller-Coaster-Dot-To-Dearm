export const IR_SHEET_ID = 'admin-idea-board'

export const IDEA_STATUSES = ['idea', 'planned', 'in-progress', 'done']

export function isIdeaStatus(value) {
  return IDEA_STATUSES.includes(value)
}

export function defaultIdeaRootData() {
  return { title: '', status: 'idea' }
}

export function defaultReportData(summary = '') {
  return { summary, timestamp: new Date().toISOString() }
}
