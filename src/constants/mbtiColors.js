// MBTI personality-type accent colours — single source of truth.
// Grouped by temperament: NT=violet, NF=emerald, SJ=blue, SP=amber.
export const MBTI_COLORS = {
  INTJ: '#8a4a70', INTP: '#8a4a70', ENTJ: '#8a4a70', ENTP: '#8a4a70',
  INFJ: '#5d7a2c', INFP: '#5d7a2c', ENFJ: '#5d7a2c', ENFP: '#5d7a2c',
  ISTJ: '#4a6f8a', ISFJ: '#4a6f8a', ESTJ: '#4a6f8a', ESFJ: '#4a6f8a',
  ISTP: '#c0822e', ISFP: '#c0822e', ESTP: '#c0822e', ESFP: '#c0822e',
}

// Falls back to the brand purple when the type is unknown/unset.
export function mbtiColor(mbti) {
  return MBTI_COLORS[mbti] ?? '#8a4a70'
}
