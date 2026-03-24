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

function getWeight(signal_level: string): number {
  if (signal_level === 'high') return 1.0
  if (signal_level === 'medium') return 0.5
  return 0.0
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
