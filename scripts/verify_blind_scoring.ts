#!/usr/bin/env npx ts-node --esm
/**
 * Re-runs the blind scoring algorithm from cases.json and diffs the result
 * against the stored scores.json. Confirms that scores.json was computed
 * correctly and has not been modified.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')
const dataDir = join(root, 'src/data')

function load(file: string) {
  return JSON.parse(readFileSync(join(dataDir, file), 'utf-8'))
}

const cases = load('cases.json')
const storedScores = load('scores.json')

const WEIGHT: Record<string, number> = { high: 1.0, medium: 0.5, low: 0.0 }

interface Accum {
  partisan: number
  doctrine: number
  total_cases: number
  partisan_votes: number
  doctrine_votes: number
  mixed_votes: number
}

const allSeats = ['seat_1', 'seat_2', 'seat_3', 'seat_4', 'seat_5', 'seat_6', 'seat_7', 'seat_8', 'seat_9']
const seatData: Record<string, { overall: Accum; per_doctrine: Record<string, Accum> }> = {}
for (const seat of allSeats) {
  seatData[seat] = {
    overall: { partisan: 0, doctrine: 0, total_cases: 0, partisan_votes: 0, doctrine_votes: 0, mixed_votes: 0 },
    per_doctrine: {},
  }
}

function scoreVote(pa: string, da: string, weight: number, acc: Accum): void {
  if (pa === 'yes' && da === 'no') {
    acc.partisan += 1.0 * weight; acc.partisan_votes++
  } else if (da === 'yes' && pa === 'no') {
    acc.doctrine += 1.0 * weight; acc.doctrine_votes++
  } else if (pa === 'partial' && da === 'no') {
    acc.partisan += 0.5 * weight; acc.mixed_votes++
  } else if (pa === 'no' && da === 'partial') {
    acc.doctrine += 0.5 * weight; acc.mixed_votes++
  } else if (pa === 'yes' && da === 'partial') {
    acc.partisan += 0.5 * weight; acc.mixed_votes++
  } else if (pa === 'partial' && da === 'yes') {
    acc.doctrine += 0.5 * weight; acc.mixed_votes++
  } else if (pa === 'partial' && da === 'partial') {
    acc.partisan += 0.5 * weight; acc.doctrine += 0.5 * weight; acc.mixed_votes++
  }
  // "yes/yes", "no/no" → non-diagnostic, no contribution
}

for (const c of cases) {
  const weight = WEIGHT[c.signal_level] ?? 0
  if (weight === 0) continue
  for (const [seat, vote] of Object.entries(c.votes as any)) {
    if (!seatData[seat]) continue
    const pa = (vote as any).vote_aligns_with_appointer_party
    const da = (vote as any).vote_aligns_with_doctrine
    const d = seatData[seat]
    d.overall.total_cases++
    scoreVote(pa, da, weight, d.overall)
    for (const docId of c.doctrine_ids) {
      if (!d.per_doctrine[docId]) {
        d.per_doctrine[docId] = { partisan: 0, doctrine: 0, total_cases: 0, partisan_votes: 0, doctrine_votes: 0, mixed_votes: 0 }
      }
      d.per_doctrine[docId].total_cases++
      scoreVote(pa, da, weight, d.per_doctrine[docId])
    }
  }
}

let mismatches = 0
console.log('\n=== Blind Scoring Verification ===\n')
console.log('seat_id  | stored | recomputed | match? | confidence')
console.log('-'.repeat(60))

for (const seat of allSeats) {
  const d = seatData[seat].overall
  const total = d.partisan + d.doctrine
  const recomputed = total > 0 ? d.partisan / total : 0.5
  const stored = storedScores.find((s: any) => s.seat_id === seat)
  if (!stored) {
    console.error(`No stored score for ${seat}`)
    mismatches++
    continue
  }
  const match = Math.abs(stored.partisan_index - recomputed) < 0.001
  if (!match) mismatches++
  console.log(
    `${seat.padEnd(8)} | ${stored.partisan_index.toFixed(3).padStart(6)} | ${recomputed.toFixed(3).padStart(10)} | ${match ? 'YES   ' : 'NO !!!'}| ${stored.confidence}`
  )
}

console.log('\n=== Per-Doctrine Verification ===')
for (const seat of allSeats) {
  const perDoc = seatData[seat].per_doctrine
  const stored = storedScores.find((s: any) => s.seat_id === seat)
  if (!stored) continue
  for (const [docId, acc] of Object.entries(perDoc) as any) {
    const t = acc.partisan + acc.doctrine
    const recomputed = t > 0 ? acc.partisan / t : 0.5
    const storedPd = stored.per_doctrine?.[docId]
    if (!storedPd) {
      console.warn(`${seat}/${docId}: no stored per-doctrine entry`)
      continue
    }
    const match = Math.abs(storedPd.partisan_index - recomputed) < 0.001
    if (!match) {
      console.error(`MISMATCH ${seat}/${docId}: stored=${storedPd.partisan_index} recomputed=${recomputed}`)
      mismatches++
    }
  }
}

if (mismatches === 0) {
  console.log('\nAll scores verified. scores.json is consistent with cases.json.')
} else {
  console.error(`\n${mismatches} mismatches found. scores.json may have been modified.`)
  process.exit(1)
}
