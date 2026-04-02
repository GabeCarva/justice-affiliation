#!/usr/bin/env npx ts-node --esm
/**
 * Validates all data files for schema compliance and cross-references.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')
const dataDir = join(root, 'src/data')

function load(file: string) {
  return JSON.parse(readFileSync(join(dataDir, file), 'utf-8'))
}

let errors = 0
let warnings = 0

function error(msg: string) { console.error(`[ERROR] ${msg}`); errors++ }
function warn(msg: string)  { console.warn(`[WARN]  ${msg}`);  warnings++ }
function ok(msg: string)    { console.log(`[OK]    ${msg}`) }

// --- Load files ---
const doctrines = load('doctrines.json')
const doctrinePartyMap = load('doctrine-party-map.json')
const cases = load('cases.json')
const justices = load('justices.json')
const seatMap = load('justice-seat-map.json')
const scores = load('scores.json')

const DOCTRINE_IDS = new Set(doctrines.map((d: any) => d.id))
const JUSTICE_IDS = new Set(justices.map((j: any) => j.id))
const SEAT_IDS = new Set(Object.keys(seatMap))
const PARTIES = new Set(['R', 'D'])
const SIGNAL_LEVELS = new Set(['high', 'medium', 'low'])
const ALIGNMENTS = new Set(['yes', 'no', 'partial'])

// --- Validate doctrines.json ---
console.log('\n=== Validating doctrines.json ===')
const requiredDoctrineFields = ['id', 'name', 'description', 'constitutional_basis', 'key_question',
  'principled_conservative_position', 'principled_liberal_position', 'contested_aspects']
for (const d of doctrines) {
  for (const f of requiredDoctrineFields) {
    if (!d[f]) error(`Doctrine ${d.id}: missing field '${f}'`)
  }
}
ok(`${doctrines.length} doctrines validated`)

// --- Validate doctrine-party-map.json ---
console.log('\n=== Validating doctrine-party-map.json ===')
for (const m of doctrinePartyMap) {
  if (!DOCTRINE_IDS.has(m.doctrine_id)) error(`DPM entry: unknown doctrine_id '${m.doctrine_id}'`)
  if (!PARTIES.has(m.party)) error(`DPM entry: invalid party '${m.party}'`)
  if (!Array.isArray(m.periods) || m.periods.length === 0) error(`DPM ${m.doctrine_id}/${m.party}: no periods`)
  for (const p of m.periods ?? []) {
    if (typeof p.start_year !== 'number') error(`DPM ${m.doctrine_id}/${m.party}: period missing start_year`)
    if (!p.practical_position) error(`DPM ${m.doctrine_id}/${m.party}: period missing practical_position`)
    if (!['aligned', 'opposed', 'mixed'].includes(p.alignment_with_doctrine)) {
      error(`DPM ${m.doctrine_id}/${m.party}: invalid alignment_with_doctrine '${p.alignment_with_doctrine}'`)
    }
  }
}
// Check coverage: every doctrine × both parties should be present
for (const doctrine of doctrines) {
  for (const party of ['R', 'D']) {
    const found = doctrinePartyMap.find((m: any) => m.doctrine_id === doctrine.id && m.party === party)
    if (!found) error(`Missing DPM entry: doctrine '${doctrine.id}' × party '${party}'`)
  }
}
ok(`${doctrinePartyMap.length} doctrine-party mappings validated`)

// --- Validate cases.json ---
console.log('\n=== Validating cases.json ===')
const caseIds = new Set<string>()
for (const c of cases) {
  if (!c.id) { error('Case missing id'); continue }
  if (caseIds.has(c.id)) error(`Duplicate case id: ${c.id}`)
  caseIds.add(c.id)

  const required = ['title', 'year', 'doctrine_ids', 'signal_level', 'votes',
    'doctrine_prediction', 'r_party_prediction', 'd_party_prediction']
  for (const f of required) {
    if (c[f] === undefined || c[f] === null) error(`Case ${c.id}: missing field '${f}'`)
  }

  if (!SIGNAL_LEVELS.has(c.signal_level)) error(`Case ${c.id}: invalid signal_level '${c.signal_level}'`)

  for (const did of c.doctrine_ids ?? []) {
    if (!DOCTRINE_IDS.has(did)) error(`Case ${c.id}: unknown doctrine_id '${did}'`)
  }

  if (!c.votes || typeof c.votes !== 'object') { error(`Case ${c.id}: votes must be an object`); continue }
  for (const [seatId, vote] of Object.entries(c.votes as any)) {
    if (!SEAT_IDS.has(seatId)) error(`Case ${c.id}: unknown seat_id '${seatId}' in votes`)
    if (!ALIGNMENTS.has((vote as any).vote_aligns_with_doctrine)) {
      error(`Case ${c.id} / ${seatId}: invalid vote_aligns_with_doctrine '${(vote as any).vote_aligns_with_doctrine}'`)
    }
    if (!ALIGNMENTS.has((vote as any).vote_aligns_with_appointer_party)) {
      error(`Case ${c.id} / ${seatId}: invalid vote_aligns_with_appointer_party '${(vote as any).vote_aligns_with_appointer_party}'`)
    }
  }

  if (Object.keys(c.votes).length === 0) warn(`Case ${c.id}: no votes recorded`)
}
ok(`${cases.length} cases validated`)

// --- Validate justice-seat-map.json ---
console.log('\n=== Validating justice-seat-map.json ===')
for (const [seatId, entry] of Object.entries(seatMap as any)) {
  if (!JUSTICE_IDS.has((entry as any).justice_id)) {
    error(`Seat map ${seatId}: unknown justice_id '${(entry as any).justice_id}'`)
  }
}
ok(`${Object.keys(seatMap).length} seat-map entries validated`)

// --- Validate scores.json ---
console.log('\n=== Validating scores.json ===')
for (const s of scores) {
  if (!SEAT_IDS.has(s.seat_id)) error(`Score: unknown seat_id '${s.seat_id}'`)
  if (typeof s.partisan_index !== 'number' || s.partisan_index < 0 || s.partisan_index > 1) {
    error(`Score ${s.seat_id}: partisan_index out of range: ${s.partisan_index}`)
  }
  if (!['high', 'medium', 'low'].includes(s.confidence)) {
    error(`Score ${s.seat_id}: invalid confidence '${s.confidence}'`)
  }
  for (const [docId, pd] of Object.entries(s.per_doctrine ?? {})) {
    if (!DOCTRINE_IDS.has(docId)) error(`Score ${s.seat_id}: unknown doctrine '${docId}' in per_doctrine`)
  }
}
ok(`${scores.length} score entries validated`)

// --- Summary ---
console.log(`\n=== Summary ===`)
console.log(`Errors: ${errors}`)
console.log(`Warnings: ${warnings}`)
if (errors > 0) {
  console.error('\nValidation FAILED')
  process.exit(1)
} else {
  console.log('\nValidation PASSED')
}
