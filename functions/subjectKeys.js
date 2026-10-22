/* global module */
// Exam-subject keys a focus session may be tagged with (TCAS Plan, ADR-0025). Mirrors
// isSubjectKey in src/utils/planDerive.js; both run src/utils/subjectKeyFixtures.json.
const SUBJECT_KEY = /^(tgat[1-3]?|tpat(1|11|13|2|21|3|4|5)|a_lv_(6[1-6]|70|8[1-9]))$/

const isSubjectKey = (key) => typeof key === 'string' && SUBJECT_KEY.test(key)

module.exports = { isSubjectKey }
