import { cases } from './data'
import type { DiagnosticCase } from './types'

export type SignalCategory = 'partisan' | 'doctrine' | 'nondiag' | 'mixed'

export interface TrajectoryPoint {
  case_id: string
  case_title: string
  year: number
  party_rate: number
  doctrine_rate: number
  delta_party: number
  delta_doctrine: number
  vote_description: string
  vote_aligns_with_doctrine: string
  vote_aligns_with_appointer_party: string
  signal_level: string
  doctrine_ids: string[]
  signal_category: SignalCategory
}

// A single diagnostic case contributing to the running partisan index
export interface DiagnosticStep {
  case_id: string
  case_title: string
  year: number
  vote_type: 'partisan' | 'doctrine' | 'mixed'
  running_index: number   // partisan / (partisan + doctrine) after this case
}

function getWeight(signal_level: string): number {
  if (signal_level === 'high') return 1.0
  if (signal_level === 'medium') return 0.5
  return 0.0
}

// Returns the weighted partisan/doctrine contribution of a single vote,
// or null if the vote is non-diagnostic (both align the same way).
function scoreDiagnostic(pa: string, da: string): { pw: number; dw: number } | null {
  if (pa === 'yes'     && da === 'no')      return { pw: 1.0, dw: 0.0 }
  if (da === 'yes'     && pa === 'no')      return { pw: 0.0, dw: 1.0 }
  if (pa === 'partial' && da === 'no')      return { pw: 0.5, dw: 0.0 }
  if (pa === 'no'      && da === 'partial') return { pw: 0.0, dw: 0.5 }
  if (pa === 'yes'     && da === 'partial') return { pw: 0.5, dw: 0.0 }
  if (pa === 'partial' && da === 'yes')     return { pw: 0.0, dw: 0.5 }
  if (pa === 'partial' && da === 'partial') return { pw: 0.5, dw: 0.5 }
  return null
}

export function computeTrajectory(seatId: string): TrajectoryPoint[] {
  const eligible = (cases as DiagnosticCase[])
    .filter(c => c.votes[seatId] !== undefined && getWeight(c.signal_level) > 0)
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title))

  let partyYes = 0, partyTotal = 0
  let docYes = 0, docTotal = 0
  const points: TrajectoryPoint[] = []

  for (const c of eligible) {
    const vote = c.votes[seatId]
    const weight = getWeight(c.signal_level)
    const d = vote.vote_aligns_with_doctrine
    const p = vote.vote_aligns_with_appointer_party

    const prevParty = partyTotal > 0 ? partyYes / partyTotal : NaN
    const prevDoc   = docTotal > 0   ? docYes   / docTotal   : NaN

    let signal_category: SignalCategory
    if      (p === 'yes' && d === 'no')  signal_category = 'partisan'
    else if (d === 'yes' && p === 'no')  signal_category = 'doctrine'
    else if (p === 'yes' && d === 'yes') signal_category = 'nondiag'
    else                                 signal_category = 'mixed'

    if (p === 'yes')     partyYes += weight
    else if (p === 'partial') partyYes += 0.5 * weight
    partyTotal += weight

    if (d === 'yes')     docYes += weight
    else if (d === 'partial') docYes += 0.5 * weight
    docTotal += weight

    const partyRate = partyYes / partyTotal
    const docRate   = docYes   / docTotal

    points.push({
      case_id: c.id,
      case_title: c.title,
      year: c.year,
      party_rate: partyRate,
      doctrine_rate: docRate,
      delta_party:   isNaN(prevParty) ? 0 : partyRate - prevParty,
      delta_doctrine: isNaN(prevDoc)  ? 0 : docRate   - prevDoc,
      vote_description: vote.vote,
      vote_aligns_with_doctrine: d,
      vote_aligns_with_appointer_party: p,
      signal_level: c.signal_level,
      doctrine_ids: c.doctrine_ids,
      signal_category,
    })
  }
  return points
}

export function computeFinalRates(seatId: string) {
  const t = computeTrajectory(seatId)
  if (!t.length) return { party_rate: 0.5, doctrine_rate: 0.5 }
  return { party_rate: t[t.length - 1].party_rate, doctrine_rate: t[t.length - 1].doctrine_rate }
}

// Running partisan index — only diagnostic cases, in chronological order.
// Each step shows how the index shifts as a new case with revealed preference arrives.
export function computeRunningPartisanIndex(seatId: string): DiagnosticStep[] {
  const eligible = (cases as DiagnosticCase[])
    .filter(c => c.votes[seatId] !== undefined && getWeight(c.signal_level) > 0)
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title))

  let runP = 0, runD = 0
  const steps: DiagnosticStep[] = []

  for (const c of eligible) {
    const vote = c.votes[seatId]
    const w    = getWeight(c.signal_level)
    const pa   = vote.vote_aligns_with_appointer_party
    const da   = vote.vote_aligns_with_doctrine
    const diag = scoreDiagnostic(pa, da)
    if (!diag) continue  // non-diagnostic — skip entirely

    runP += diag.pw * w
    runD += diag.dw * w

    const vote_type: DiagnosticStep['vote_type'] =
      diag.pw > 0 && diag.dw === 0 ? 'partisan' :
      diag.dw > 0 && diag.pw === 0 ? 'doctrine' : 'mixed'

    steps.push({
      case_id:       c.id,
      case_title:    c.title,
      year:          c.year,
      vote_type,
      running_index: runP / (runP + runD),
    })
  }
  return steps
}

// Fraction of high/medium signal cases (by count) that were diagnostic.
// Used by TensionScatter for the X axis.
export function computeDiagnosticStats(seatId: string): {
  total_signal_cases: number
  total_diagnostic_cases: number
  diagnostic_rate: number
} {
  const eligible = (cases as DiagnosticCase[])
    .filter(c => c.votes[seatId] !== undefined && getWeight(c.signal_level) > 0)

  let diagnostic = 0
  for (const c of eligible) {
    const v = c.votes[seatId]
    if (scoreDiagnostic(v.vote_aligns_with_appointer_party, v.vote_aligns_with_doctrine)) {
      diagnostic++
    }
  }
  return {
    total_signal_cases:    eligible.length,
    total_diagnostic_cases: diagnostic,
    diagnostic_rate:        eligible.length > 0 ? diagnostic / eligible.length : 0,
  }
}
