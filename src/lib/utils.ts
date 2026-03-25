export function formatPartisanIndex(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

export function classifyPartisanIndex(value: number): {
  label: string;
  description: string;
} {
  if (value >= 0.75) return { label: 'Strongly Partisan', description: 'Votes align with appointing party over doctrine in the majority of diagnostic cases' };
  if (value >= 0.55) return { label: 'Moderately Partisan', description: 'Somewhat more likely to follow party than doctrine in diagnostic cases' };
  if (value >= 0.45) return { label: 'Mixed / Indeterminate', description: 'Roughly balanced between doctrine and party alignment in diagnostic cases' };
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

export function getPartisanIndexColor(index: number): string {
  // Red = partisan, blue = doctrinal, gray = mixed
  if (index >= 0.6) return '#c0392b';
  if (index <= 0.4) return '#2980b9';
  return '#7f8c8d';
}
