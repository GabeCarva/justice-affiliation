export function formatPartisanIndex(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

export function classifyPartisanIndex(value: number): {
  label: string;
  description: string;
} {
  if (value >= 0.75) return { label: 'Strongly Partisan', description: 'Votes align with appointing party over doctrine in the majority of diagnostic cases' };
  if (value >= 0.45) return { label: 'Moderately Partisan', description: 'Departs from judicial doctrine in favor of party alignment in a meaningful share of diagnostic cases — since ideal adherence is 100% doctrinal, any consistent pattern of party-favoring departures is partisan' };
  if (value >= 0.25) return { label: 'Moderately Doctrinal', description: 'Somewhat more likely to follow doctrine than party in diagnostic cases' };
  return { label: 'Strongly Doctrinal', description: 'Votes align with judicial doctrine over party in the majority of diagnostic cases' };
}

export function confidenceLabel(confidence: string): string {
  if (confidence === 'high') return 'High confidence (4+ weighted diagnostic cases)';
  if (confidence === 'medium') return 'Medium confidence (2-3 weighted diagnostic cases)';
  return 'Low confidence (fewer than 2 weighted diagnostic cases)';
}

export function getPartyColor(party: 'R' | 'D'): string {
  return party === 'R' ? '#c0392b' : '#2980b9';
}

const NAME_SUFFIXES = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV'])

export function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  while (parts.length > 1 && NAME_SUFFIXES.has(parts[parts.length - 1])) {
    parts.pop()
  }
  return parts[parts.length - 1]
}

// Canonical classification thresholds — every color decision in the app
// must use these constants (or the functions below) so they stay in sync.
export const THRESHOLDS = {
  STRONGLY_PARTISAN:    0.75,
  MODERATELY_PARTISAN:  0.45,
  MODERATELY_DOCTRINAL: 0.25,
} as const

// Party-aware: partisan votes use the appointing-party color (R=red, D=blue);
// doctrinal votes use neutral dark gray so "blue" can't be confused with
// Democrat-party coloring.
export function getPartisanIndexColor(index: number, party: 'R' | 'D'): string {
  const isR = party === 'R'
  if (index >= THRESHOLDS.STRONGLY_PARTISAN)    return isR ? '#dc2626' : '#2563eb'  // deep party color
  if (index >= THRESHOLDS.MODERATELY_PARTISAN)  return isR ? '#f87171' : '#93c5fd'  // light party color
  if (index >= THRESHOLDS.MODERATELY_DOCTRINAL) return '#9ca3af'                     // medium gray (doctrinal)
  return '#374151'                                                                    // dark gray  (strongly doctrinal)
}
