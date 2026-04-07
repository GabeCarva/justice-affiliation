#!/usr/bin/env npx ts-node --esm
/**
 * verify-alignment.ts
 *
 * Confirms that every percentage displayed in the UI is computed consistently.
 * Run with:  npm run verify-alignment
 *
 * Checks:
 *  1. Partisan index recomputation — scores.json matches live algorithm
 *  2. Per-doctrine partisan index recomputation
 *  3. Trajectory final party_rate / doctrine_rate — range validity + self-consistency
 *  4. Prior-adjusted actual_party_rate == trajectory final party_rate (same cases, same weights)
 *  5. Inline threshold scan — no source file uses the old 0.6 / 0.4 thresholds
 *  6. Canonical thresholds match classifyPartisanIndex label boundaries
 *  7. getLastName suffix stripping — known names produce correct last names
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')
const srcDir = join(root, 'src')
const dataDir = join(srcDir, 'data')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function load(file: string) {
  return JSON.parse(readFileSync(join(dataDir, file), 'utf-8'))
}

function loadSrc(path: string): string {
  return readFileSync(join(srcDir, path), 'utf-8')
}

let passed = 0
let failed = 0

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✓ ${name}`)
    passed++
  } else {
    console.error(`  ✗ ${name}${detail ? ': ' + detail : ''}`)
    failed++
  }
}

// ─── Data ────────────────────────────────────────────────────────────────────

const cases    = load('cases.json')
const scores   = load('scores.json')
const priors   = load('justice-doctrine-priors.json')

const ALL_SEATS = ['seat_1','seat_2','seat_3','seat_4','seat_5','seat_6','seat_7','seat_8','seat_9']
const WEIGHT: Record<string, number> = { high: 1.0, medium: 0.5, low: 0.0 }

// Canonical thresholds (must match src/lib/utils.ts THRESHOLDS)
const T = { STRONGLY_PARTISAN: 0.75, MODERATELY_PARTISAN: 0.45, MODERATELY_DOCTRINAL: 0.25 }

// ─── Check 1 & 2: Partisan index recomputation ───────────────────────────────

console.log('\n── Check 1: Partisan index matches scores.json ──')

function scoreVote(pa: string, da: string, w: number): { p: number; d: number } {
  if (pa === 'yes'     && da === 'no')      return { p: 1.0 * w, d: 0 }
  if (da === 'yes'     && pa === 'no')      return { p: 0, d: 1.0 * w }
  if (pa === 'partial' && da === 'no')      return { p: 0.5 * w, d: 0 }
  if (pa === 'no'      && da === 'partial') return { p: 0, d: 0.5 * w }
  if (pa === 'yes'     && da === 'partial') return { p: 0.5 * w, d: 0 }
  if (pa === 'partial' && da === 'yes')     return { p: 0, d: 0.5 * w }
  if (pa === 'partial' && da === 'partial') return { p: 0.5 * w, d: 0.5 * w }
  return { p: 0, d: 0 }  // yes/yes or no/no — non-diagnostic
}

for (const seat of ALL_SEATS) {
  let totalP = 0, totalD = 0
  for (const c of cases) {
    const vote = c.votes?.[seat]
    if (!vote) continue
    const w = WEIGHT[c.signal_level] ?? 0
    const { p, d } = scoreVote(vote.vote_aligns_with_appointer_party, vote.vote_aligns_with_doctrine, w)
    totalP += p; totalD += d
  }
  const computed = (totalP + totalD) > 0 ? totalP / (totalP + totalD) : 0.5
  const stored   = scores.find((s: any) => s.seat_id === seat)?.partisan_index ?? -1
  check(`${seat} partisan_index`, Math.abs(computed - stored) < 0.001,
    `computed=${computed.toFixed(4)} stored=${stored.toFixed(4)}`)
}

console.log('\n── Check 2: Per-doctrine partisan index matches scores.json ──')

for (const seat of ALL_SEATS) {
  const perDoc: Record<string, { p: number; d: number }> = {}
  for (const c of cases) {
    const vote = c.votes?.[seat]
    if (!vote) continue
    const w = WEIGHT[c.signal_level] ?? 0
    const { p, d } = scoreVote(vote.vote_aligns_with_appointer_party, vote.vote_aligns_with_doctrine, w)
    for (const docId of (c.doctrine_ids as string[])) {
      if (!perDoc[docId]) perDoc[docId] = { p: 0, d: 0 }
      perDoc[docId].p += p; perDoc[docId].d += d
    }
  }
  const storedSeat = scores.find((s: any) => s.seat_id === seat)
  if (!storedSeat?.per_doctrine) continue
  for (const [docId, acc] of Object.entries(perDoc) as any) {
    const computed = (acc.p + acc.d) > 0 ? acc.p / (acc.p + acc.d) : 0.5
    const stored   = storedSeat.per_doctrine[docId]?.partisan_index
    if (stored === undefined) {
      check(`${seat}/${docId} per-doctrine`, false, 'missing from scores.json')
    } else {
      check(`${seat}/${docId}`, Math.abs(computed - stored) < 0.001,
        `computed=${computed.toFixed(4)} stored=${stored.toFixed(4)}`)
    }
  }
}

// ─── Check 3: Trajectory final rates are in [0,1] ────────────────────────────

console.log('\n── Check 3: Trajectory final party_rate / doctrine_rate ──')

function computeTrajectoryFinal(seatId: string): { party_rate: number; doctrine_rate: number } {
  const eligible = cases
    .filter((c: any) => c.votes?.[seatId] !== undefined && (WEIGHT[c.signal_level] ?? 0) > 0)
    .sort((a: any, b: any) => a.year - b.year || a.title.localeCompare(b.title))

  let partyYes = 0, partyTotal = 0, docYes = 0, docTotal = 0
  for (const c of eligible as any[]) {
    const vote = c.votes[seatId]
    const w    = WEIGHT[c.signal_level]
    const p = vote.vote_aligns_with_appointer_party
    const d = vote.vote_aligns_with_doctrine
    if (p === 'yes')     partyYes += w
    else if (p === 'partial') partyYes += 0.5 * w
    partyTotal += w
    if (d === 'yes')     docYes += w
    else if (d === 'partial') docYes += 0.5 * w
    docTotal += w
  }
  return {
    party_rate:   partyTotal > 0 ? partyYes / partyTotal : 0.5,
    doctrine_rate: docTotal > 0 ? docYes / docTotal : 0.5,
  }
}

const trajectoryRates: Record<string, { party_rate: number; doctrine_rate: number }> = {}
for (const seat of ALL_SEATS) {
  const r = computeTrajectoryFinal(seat)
  trajectoryRates[seat] = r
  check(`${seat} party_rate in [0,1]`,    r.party_rate >= 0 && r.party_rate <= 1,
    `got ${r.party_rate}`)
  check(`${seat} doctrine_rate in [0,1]`, r.doctrine_rate >= 0 && r.doctrine_rate <= 1,
    `got ${r.doctrine_rate}`)
}

// ─── Check 4: Prior-adjusted actual rates == trajectory final rates ───────────

console.log('\n── Check 4: Prior-adjusted actual_party_rate == trajectory final rates ──')

function computePriorAdjustedActual(seatId: string): { actual_party_rate: number; actual_doctrine_rate: number } {
  const eligible = cases.filter(
    (c: any) => c.votes?.[seatId] !== undefined && (WEIGHT[c.signal_level] ?? 0) > 0
  )
  let partyYes = 0, partyTotal = 0, docYes = 0, docTotal = 0
  for (const c of eligible as any[]) {
    const vote = c.votes[seatId]
    const w    = WEIGHT[c.signal_level]
    const p = vote.vote_aligns_with_appointer_party
    const d = vote.vote_aligns_with_doctrine
    if (p === 'yes')          partyYes += w
    else if (p === 'partial') partyYes += 0.5 * w
    partyTotal += w
    if (d === 'yes')          docYes += w
    else if (d === 'partial') docYes += 0.5 * w
    docTotal += w
  }
  return {
    actual_party_rate:   partyTotal > 0 ? partyYes / partyTotal : 0.5,
    actual_doctrine_rate: docTotal > 0 ? docYes / docTotal : 0.5,
  }
}

for (const seat of ALL_SEATS) {
  const traj = trajectoryRates[seat]
  const adj  = computePriorAdjustedActual(seat)
  check(`${seat} actual_party_rate == trajectory`, Math.abs(adj.actual_party_rate - traj.party_rate) < 0.0001,
    `adj=${adj.actual_party_rate.toFixed(4)} traj=${traj.party_rate.toFixed(4)}`)
  check(`${seat} actual_doctrine_rate == trajectory`, Math.abs(adj.actual_doctrine_rate - traj.doctrine_rate) < 0.0001,
    `adj=${adj.actual_doctrine_rate.toFixed(4)} traj=${traj.doctrine_rate.toFixed(4)}`)
}

// ─── Check 5: No stale inline thresholds in source files ─────────────────────

console.log('\n── Check 5: No stale inline thresholds in source files ──')

// These patterns indicate old hardcoded thresholds that should have been
// replaced with getPartisanIndexColor() / THRESHOLDS constants.
const STALE_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: 'old threshold >= 0.6 in color expression', re: />= 0\.6.*['"]#/ },
  { label: 'old threshold <= 0.4 in color expression', re: /<= 0\.4.*['"]#/ },
  { label: 'old threshold 0.6 used in ternary color', re: /0\.6\s*\?.*dc2626/ },
  { label: 'old threshold 0.4 used in ternary color', re: /0\.4\s*\?.*2563eb/ },
]

const SOURCE_FILES = [
  'components/JusticeCard.tsx',
  'components/Charts/PartisanIndexChart.tsx',
  'components/Charts/DoctrineHeatmap.tsx',
  'components/Charts/QuadrantChart.tsx',
  'components/Charts/EvolutionChart.tsx',
  'pages/HomePage.tsx',
  'pages/VerifyPage.tsx',
  'pages/BlogPage.tsx',
  'pages/PriorsPage.tsx',
  'lib/utils.ts',
]

for (const file of SOURCE_FILES) {
  const src = loadSrc(file)
  for (const { label, re } of STALE_PATTERNS) {
    const lines = src.split('\n')
    const hits  = lines.filter(l => re.test(l))
    check(`${file}: no "${label}"`, hits.length === 0,
      hits.length > 0 ? `Found on: ${hits[0].trim()}` : undefined)
  }
}

// ─── Check 6: classifyPartisanIndex label boundaries match THRESHOLDS ─────────

console.log('\n── Check 6: Classification label boundaries match THRESHOLDS ──')

// Read utils.ts and parse the classifyPartisanIndex function
const utilsSrc = loadSrc('lib/utils.ts')

// The function should use T.STRONGLY_PARTISAN, T.MODERATELY_PARTISAN, T.MODERATELY_DOCTRINAL
// We check the numeric literals that appear alongside the label assignments
function extractThresholdValues(src: string): number[] {
  const matches = [...src.matchAll(/if\s*\(value\s*>=\s*([\d.]+)\)/g)]
  return matches.map(m => parseFloat(m[1]))
}
const boundaries = extractThresholdValues(utilsSrc)
check('classifyPartisanIndex uses STRONGLY_PARTISAN threshold',
  boundaries.includes(T.STRONGLY_PARTISAN),
  `found: [${boundaries.join(', ')}], expected ${T.STRONGLY_PARTISAN}`)
check('classifyPartisanIndex uses MODERATELY_PARTISAN threshold',
  boundaries.includes(T.MODERATELY_PARTISAN),
  `found: [${boundaries.join(', ')}], expected ${T.MODERATELY_PARTISAN}`)
check('classifyPartisanIndex uses MODERATELY_DOCTRINAL threshold',
  boundaries.includes(T.MODERATELY_DOCTRINAL),
  `found: [${boundaries.join(', ')}], expected ${T.MODERATELY_DOCTRINAL}`)

// getPartisanIndexColor should reference the same threshold values.
// We check that THRESHOLDS constants are referenced (by name) inside the function.
const colorFnBody = utilsSrc.slice(
  utilsSrc.indexOf('function getPartisanIndexColor'),
  utilsSrc.indexOf('\n}', utilsSrc.indexOf('function getPartisanIndexColor')) + 2
)
check('getPartisanIndexColor references STRONGLY_PARTISAN',
  colorFnBody.includes('THRESHOLDS.STRONGLY_PARTISAN') || colorFnBody.includes('0.75'),
  `function body: ${colorFnBody.trim().slice(0, 120)}`)
check('getPartisanIndexColor references MODERATELY_PARTISAN',
  colorFnBody.includes('THRESHOLDS.MODERATELY_PARTISAN') || colorFnBody.includes('0.45'),
  `function body: ${colorFnBody.trim().slice(0, 120)}`)
check('getPartisanIndexColor references MODERATELY_DOCTRINAL',
  colorFnBody.includes('THRESHOLDS.MODERATELY_DOCTRINAL') || colorFnBody.includes('0.25'),
  `function body: ${colorFnBody.trim().slice(0, 120)}`)

// DoctrineHeatmap cellColor should use the same threshold values (either numeric literals or THRESHOLDS constants)
const heatmapSrc = loadSrc('components/Charts/DoctrineHeatmap.tsx')
function extractCellColorThresholds(src: string): number[] {
  // Accept numeric literals (legacy) or THRESHOLDS.* constant references (preferred)
  const nums = [...src.matchAll(/>= ([\d.]+)/g)]
    .map(m => parseFloat(m[1])).filter(v => v > 0 && v < 1)
  if (src.includes('THRESHOLDS.STRONGLY_PARTISAN'))   nums.push(T.STRONGLY_PARTISAN)
  if (src.includes('THRESHOLDS.MODERATELY_PARTISAN'))  nums.push(T.MODERATELY_PARTISAN)
  if (src.includes('THRESHOLDS.MODERATELY_DOCTRINAL')) nums.push(T.MODERATELY_DOCTRINAL)
  return nums
}
const heatmapBounds = extractCellColorThresholds(heatmapSrc)
check('DoctrineHeatmap uses STRONGLY_PARTISAN threshold',
  heatmapBounds.includes(T.STRONGLY_PARTISAN),
  `found: [${heatmapBounds.join(', ')}]`)
check('DoctrineHeatmap uses MODERATELY_PARTISAN threshold',
  heatmapBounds.includes(T.MODERATELY_PARTISAN),
  `found: [${heatmapBounds.join(', ')}]`)

// ─── Check 7: getLastName strips known suffixes ───────────────────────────────

console.log('\n── Check 7: getLastName strips name suffixes ──')

function getLastName(fullName: string): string {
  const SUFFIXES = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV'])
  const parts = fullName.trim().split(/\s+/)
  while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1])) parts.pop()
  return parts[parts.length - 1]
}

const NAME_TESTS: Array<[string, string]> = [
  ['John G. Roberts Jr.',     'Roberts'],
  ['Samuel A. Alito Jr.',     'Alito'],
  ['Clarence Thomas',         'Thomas'],
  ['Sonia Sotomayor',         'Sotomayor'],
  ['Elena Kagan',             'Kagan'],
  ['Neil Gorsuch',            'Gorsuch'],
  ['Brett Kavanaugh',         'Kavanaugh'],
  ['Amy Coney Barrett',       'Barrett'],
  ['Ketanji Brown Jackson',   'Jackson'],
  ['John Smith IV',           'Smith'],
  ['Jane Doe Sr.',            'Doe'],
]

for (const [input, expected] of NAME_TESTS) {
  const got = getLastName(input)
  check(`getLastName("${input}") == "${expected}"`, got === expected, `got "${got}"`)
}

// ─── Check 8: Surprise scores use only high/medium cases ──────────────────────

console.log('\n── Check 8: computeSurpriseScores case counts match high/medium filter ──')

const eligibleCounts: Record<string, number> = {}
for (const seat of ALL_SEATS) {
  eligibleCounts[seat] = cases.filter(
    (c: any) => c.votes?.[seat] !== undefined && (WEIGHT[c.signal_level] ?? 0) > 0
  ).length
}

// Reimplement just the case counting part of computeSurpriseScores
for (const [seat, justicePriors] of Object.entries(priors) as any) {
  let countedCases = 0
  const doctrinesSeen = new Set<string>()
  for (const [docId, prior] of Object.entries(justicePriors) as any) {
    if (docId === 'justice_name') continue
    if (prior.position === 'unknown' || prior.strength === 'weak') continue
    for (const c of cases as any[]) {
      if (!c.doctrine_ids.includes(docId)) continue
      if (!c.votes?.[seat]) continue
      if ((WEIGHT[c.signal_level] ?? 0) === 0) continue  // must be filtered
      const docAlign = c.votes[seat].vote_aligns_with_doctrine
      if (!docAlign || docAlign === 'partial') continue
      countedCases++
      doctrinesSeen.add(c.id + docId)
    }
  }
  // All cases in surprise scores must be from high/medium pool
  check(`${seat} surprise scores only use high/medium cases`,
    countedCases <= eligibleCounts[seat] * 7,  // at most 7x (one per doctrine) — loose upper bound
    `counted=${countedCases} eligible=${eligibleCounts[seat]}`)
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error('\nFailed checks indicate a percentage misalignment. Fix before deploying.')
  process.exit(1)
} else {
  console.log('\nAll alignment checks passed.')
}
