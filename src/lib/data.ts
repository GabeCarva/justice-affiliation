import type { Doctrine, DoctrinePartyMapping, DiagnosticCase, Justice, SeatMap, JusticeScore, NamedJusticeScore } from './types'

import doctrinasRaw from '../data/doctrines.json'
import doctrinePartyMapRaw from '../data/doctrine-party-map.json'
import casesRaw from '../data/cases.json'
import justicesRaw from '../data/justices.json'
import seatMapRaw from '../data/justice-seat-map.json'
import scoresRaw from '../data/scores.json'

export const doctrines: Doctrine[] = doctrinasRaw as Doctrine[]
export const doctrinePartyMap: DoctrinePartyMapping[] = doctrinePartyMapRaw as DoctrinePartyMapping[]
export const cases: DiagnosticCase[] = casesRaw as DiagnosticCase[]
export const justices: Justice[] = justicesRaw as Justice[]
export const seatMap: SeatMap = seatMapRaw as SeatMap
export const scores: JusticeScore[] = scoresRaw as JusticeScore[]

export function getDoctrineById(id: string): Doctrine | undefined {
  return doctrines.find(d => d.id === id)
}

export function getJusticeById(id: string): Justice | undefined {
  return justices.find(j => j.id === id)
}

export function getJusticeForSeat(seatId: string): Justice | undefined {
  const entry = seatMap[seatId]
  if (!entry) return undefined
  return getJusticeById(entry.justice_id)
}

export function namedScores(): NamedJusticeScore[] {
  return scores
    .map(score => {
      const justice = getJusticeForSeat(score.seat_id)
      if (!justice) return null
      return { ...score, justice } as NamedJusticeScore
    })
    .filter((s): s is NamedJusticeScore => s !== null)
    .sort((a, b) => b.partisan_index - a.partisan_index)
}

export function casesBySeatId(seatId: string): DiagnosticCase[] {
  return cases.filter(c => c.votes[seatId] !== undefined)
}
