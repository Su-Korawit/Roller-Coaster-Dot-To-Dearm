// MBTI personality-type accent colours — single source of truth.
// Grouped by temperament: NT=violet, NF=emerald, SJ=blue, SP=amber.
export const MBTI_COLORS = {
  INTJ: '#7c3aed', INTP: '#7c3aed', ENTJ: '#7c3aed', ENTP: '#7c3aed',
  INFJ: '#059669', INFP: '#059669', ENFJ: '#059669', ENFP: '#059669',
  ISTJ: '#2563eb', ISFJ: '#2563eb', ESTJ: '#2563eb', ESFJ: '#2563eb',
  ISTP: '#d97706', ISFP: '#d97706', ESTP: '#d97706', ESFP: '#d97706',
}

// Falls back to the brand purple when the type is unknown/unset.
export function mbtiColor(mbti) {
  return MBTI_COLORS[mbti] ?? '#a78bda'
}
