#!/usr/bin/env npx ts-node --esm
/**
 * generate-scores.ts
 * Regenerates scores.json from cases.json using the canonical scoring algorithm.
 * Run with:  npm run generate-scores
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')
const dataDir = join(root, 'src/data')
const cases = JSON.parse(readFileSync(join(dataDir, 'cases.json'), 'utf-8'))

const WEIGHT: Record<string, number> = { high: 1.0, medium: 0.5, low: 0.0 }
const ALL_SEATS = ['seat_1','seat_2','seat_3','seat_4','seat_5','seat_6','seat_7','seat_8','seat_9']

function scoreVote(pa: string, da: string, w: number): [number, number] {
  if (pa === 'yes'     && da === 'no')      return [1.0 * w, 0]
  if (da === 'yes'     && pa === 'no')      return [0, 1.0 * w]
  if (pa === 'partial' && da === 'no')      return [0.5 * w, 0]
  if (pa === 'no'      && da === 'partial') return [0, 0.5 * w]
  if (pa === 'yes'     && da === 'partial') return [0.5 * w, 0]
  if (pa === 'partial' && da === 'yes')     return [0, 0.5 * w]
  if (pa === 'partial' && da === 'partial') return [0.5 * w, 0.5 * w]
  return [0, 0]  // yes/yes or no/no — non-diagnostic
}

const result = ALL_SEATS.map(seat => {
  let totalP = 0, totalD = 0
  let pv = 0, dv = 0, mv = 0, tc = 0
  const perDoc: Record<string, { p: number; d: number; tc: number }> = {}

  for (const c of cases as any[]) {
    const w = WEIGHT[c.signal_level] ?? 0
    if (w === 0) continue
    const vote = c.votes?.[seat]
    if (!vote) continue

    const pa = vote.vote_aligns_with_appointer_party
    const da = vote.vote_aligns_with_doctrine
    const [cp, cd] = scoreVote(pa, da, w)

    totalP += cp; totalD += cd; tc++
    if (cp > 0 && cd === 0)      pv++
    else if (cd > 0 && cp === 0) dv++
    else if (cp > 0 && cd > 0)  mv++

    for (const docId of (c.doctrine_ids as string[])) {
      if (!perDoc[docId]) perDoc[docId] = { p: 0, d: 0, tc: 0 }
      perDoc[docId].p += cp
      perDoc[docId].d += cd
      perDoc[docId].tc++
    }
  }

  const total = totalP + totalD
  const partisan_index = total > 0 ? totalP / total : 0.5
  const confidence = tc >= 4 ? 'high' : tc >= 2 ? 'medium' : 'low'

  const per_doctrine: Record<string, { partisan_index: number; cases_evaluated: number }> = {}
  for (const [docId, acc] of Object.entries(perDoc)) {
    const t = acc.p + acc.d
    per_doctrine[docId] = {
      partisan_index: t > 0 ? acc.p / t : 0.5,
      cases_evaluated: acc.tc,
    }
  }

  return {
    seat_id: seat,
    partisan_index,
    total_diagnostic_cases: tc,
    partisan_votes: pv,
    doctrine_votes: dv,
    mixed_votes: mv,
    per_doctrine,
    confidence,
  }
})

writeFileSync(join(dataDir, 'scores.json'), JSON.stringify(result, null, 2) + '\n')
console.log('scores.json regenerated from cases.json')
console.log()
for (const s of result) {
  console.log(`  ${s.seat_id}: ${(s.partisan_index * 100).toFixed(1)}%  (${s.confidence}, ${s.total_diagnostic_cases} diag cases)`)
}
