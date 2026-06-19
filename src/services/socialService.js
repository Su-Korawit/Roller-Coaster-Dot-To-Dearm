import { shapes } from '../lib/db'

// Groups career ids into families so "similar program" scoring works.
// Handles both id (e.g. 'data-scientist') and display name (e.g. 'Data Scientist').
export const CAREER_FAMILY_MAP = {
  'data-scientist': 'analyst',    'Data Scientist': 'analyst',
  'ml-engineer': 'analyst',       'AI / ML Specialist': 'analyst',
  'ai-architect': 'analyst',      'AI Solutions Architect': 'analyst',
  'prompt-engineer': 'analyst',   'Prompt Engineer': 'analyst',
  'product-manager': 'analyst',   'Product Manager': 'analyst',
  'fintech-developer': 'analyst', 'Fintech Developer': 'analyst',
  'ui-ux': 'diplomat',            'UI/UX Designer': 'diplomat',
  'content-strategist': 'diplomat','Content Strategist': 'diplomat',
  'learning-designer': 'diplomat','Learning Experience Designer': 'diplomat',
  'wellness-coach': 'diplomat',   'Digital Wellness Coach': 'diplomat',
  'hr-tech': 'diplomat',          'HR Tech Specialist': 'diplomat',
  'cybersecurity': 'sentinel',    'Cybersecurity Analyst': 'sentinel',
  'compliance-officer': 'sentinel','Digital Compliance Officer': 'sentinel',
  'project-manager': 'sentinel',  'Project Manager (Agile)': 'sentinel',
  'cloud-ops': 'sentinel',        'Cloud Operations Engineer': 'sentinel',
  'business-analyst': 'sentinel', 'Business Analyst': 'sentinel',
  'fullstack-dev': 'explorer',    'Full-Stack Developer': 'explorer',
  'digital-artist': 'explorer',   'Digital Artist / 3D Creator': 'explorer',
  'game-developer': 'explorer',   'Game Developer': 'explorer',
  'growth-hacker': 'explorer',    'Growth Hacker': 'explorer',
  'iot-engineer': 'explorer',     'IoT / Hardware Engineer': 'explorer',
}

// Computes a 0–100 compatibility score between two user documents.
// Reads each user's Profile through shapes.readProfile (the canonical shape seam).
// Points: program 40 (exact) / 20 (same family), mastery 25, MBTI 15, university 10, school 10.
export function calculateMatchScore(a, b) {
  if (!a || !b) return 0
  let score = 0

  const pa = shapes.readProfile(a)
  const pb = shapes.readProfile(b)

  if (pa.program && pb.program) {
    if (pa.program === pb.program) {
      score += 40
    } else {
      const fa = CAREER_FAMILY_MAP[pa.program]
      const fb = CAREER_FAMILY_MAP[pb.program]
      if (fa && fb && fa === fb) score += 20
    }
  }

  if (pa.masteryTrack && pb.masteryTrack && pa.masteryTrack === pb.masteryTrack) score += 25
  if (pa.mbti && pb.mbti && pa.mbti === pb.mbti) score += 15
  if (pa.university && pb.university && pa.university === pb.university) score += 10
  if (a.schoolId && b.schoolId && a.schoolId === b.schoolId) score += 10

  return Math.min(score, 100)
}
