import { useState } from 'react'
import {
  computeSurpriseScores,
  getPriorForSeat,
  DOCTRINE_LABELS,
  JusticeSurpriseScore,
  DoctrineSurpriseStats,
  PriorPosition,
} from '../lib/priors'
import priorsData from '../data/justice-doctrine-priors.json'
import { getLastName } from '../lib/utils'

// ─── Static configuration ────────────────────────────────────────────────────

const SEATS = [
  'seat_1',
  'seat_2',
  'seat_3',
  'seat_4',
  'seat_5',
  'seat_6',
  'seat_7',
  'seat_8',
  'seat_9',
] as const

const DOCTRINE_IDS = [
  'agency-deference',
  'congressional-spending-authority',
  'executive-restraint',
  'federalism-states-rights',
  'nationwide-injunctions',
  'presidential-immunity',
  'standing-justiciability',
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function badgeConfig(position: PriorPosition, strength: string): { label: string; classes: string } {
  if (position === 'supports' && strength === 'strong') {
    return { label: 'Supports', classes: 'bg-blue-100 text-blue-800' }
  }
  if (position === 'supports' && strength === 'moderate') {
    return { label: 'Supports~', classes: 'bg-blue-100 text-blue-800' }
  }
  if (position === 'opposed' && strength === 'strong') {
    return { label: 'Opposed', classes: 'bg-red-100 text-red-800' }
  }
  if (position === 'opposed' && strength === 'moderate') {
    return { label: 'Opposed~', classes: 'bg-red-100 text-red-800' }
  }
  if (position === 'neutral') {
    return { label: 'Neutral', classes: 'bg-gray-100 text-gray-600' }
  }
  return { label: '—', classes: 'bg-white text-gray-400 border border-gray-200' }
}

function partyCorrelationColor(rate: number): string {
  if (rate > 0.5) return 'text-red-600'
  if (rate >= 0.25) return 'text-amber-500'
  return 'text-green-600'
}

function pct(value: number): string {
  return (value * 100).toFixed(0) + '%'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface PriorCellProps {
  seatId: string
  doctrineId: string
}

function PriorCell({ seatId, doctrineId }: PriorCellProps) {
  const prior = getPriorForSeat(seatId, doctrineId)

  if (!prior) {
    return (
      <td className="py-1 px-2 text-center">
        <span className="inline-block rounded px-1.5 py-0.5 text-xs bg-white text-gray-300 border border-gray-100">
          —
        </span>
      </td>
    )
  }

  const { label, classes } = badgeConfig(prior.position, prior.strength)

  return (
    <td className="py-1 px-2 text-center">
      <div className="relative inline-block group">
        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium cursor-default ${classes}`}>
          {label}
        </span>
        {/* Tooltip */}
        <div className="hidden group-hover:block absolute z-50 w-64 p-3 bg-white border border-gray-200 rounded shadow-lg text-xs text-left top-6 left-1/2 -translate-x-1/2">
          <p className="font-semibold text-gray-700 mb-1">{prior.source}</p>
          <p className="text-gray-600 leading-snug">{prior.summary}</p>
        </div>
      </div>
    </td>
  )
}

// ─── Leaderboard card ─────────────────────────────────────────────────────────

interface LeaderboardCardProps {
  score: JusticeSurpriseScore
  isSelected: boolean
  onClick: () => void
}

function LeaderboardCard({ score, isSelected, onClick }: LeaderboardCardProps) {
  const lastName = getLastName(score.justice_name)
  const rate = score.overall_party_correlation_rate
  const rateColor = partyCorrelationColor(rate)
  const barWidth = score.total_cases_with_prior > 0
    ? (score.total_violations / score.total_cases_with_prior) * 100
    : 0
  const redFill = score.total_cases_with_prior > 0
    ? (score.total_party_correlated / score.total_cases_with_prior) * 100
    : 0

  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-lg border p-3 text-left w-36 shrink-0 transition-colors ${
        isSelected
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <span className="text-sm font-bold text-gray-800 truncate">{lastName}</span>
      <span className={`text-lg font-semibold leading-none ${rateColor}`}>
        {pct(rate)}
      </span>
      <span className="text-xs text-gray-500 leading-tight">
        {score.total_party_correlated} of {score.total_violations} departures party-correlated
      </span>
      {/* Mini bar */}
      <div className="mt-1 h-1.5 w-full rounded bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded bg-gray-400 relative"
          style={{ width: `${barWidth}%` }}
        >
          <div
            className="absolute inset-y-0 left-0 bg-red-500 rounded"
            style={{ width: redFill > 0 && barWidth > 0 ? `${(redFill / barWidth) * 100}%` : '0%' }}
          />
        </div>
      </div>
    </button>
  )
}

// ─── Justice detail section ───────────────────────────────────────────────────

interface JusticeDetailProps {
  score: JusticeSurpriseScore
}

function JusticeDetail({ score }: JusticeDetailProps) {
  const doctrineEntries = Object.values(score.per_doctrine)
  const allViolations = doctrineEntries.flatMap(d => d.violation_details)

  if (allViolations.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No departures from stated prior detected in our case database.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Doctrine-level summary table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border border-gray-200 rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-2 px-3 font-semibold text-gray-600">Doctrine</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-600">Prior</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-600">Cases</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-600">Departures</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-600">Party-Corr. Dep.</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-600">Party Corr. %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {doctrineEntries.map((d: DoctrineSurpriseStats) => {
              const corrRate = d.violations > 0 ? d.party_correlated_violations / d.violations : 0
              return (
                <tr key={d.doctrine_id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-700">
                    {DOCTRINE_LABELS[d.doctrine_id] ?? d.doctrine_id}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 font-medium ${
                        badgeConfig(d.prior_position, d.prior_strength).classes
                      }`}
                    >
                      {badgeConfig(d.prior_position, d.prior_strength).label}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center text-gray-600">{d.cases_evaluated}</td>
                  <td className="py-2 px-3 text-center text-gray-600">{d.violations}</td>
                  <td className="py-2 px-3 text-center text-gray-600">
                    {d.party_correlated_violations}
                  </td>
                  <td className={`py-2 px-3 text-center font-semibold ${partyCorrelationColor(corrRate)}`}>
                    {d.violations > 0 ? pct(corrRate) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Violation case list */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Departure Cases</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border border-gray-200 rounded">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Case</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-600">Doctrine</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-600">Expected</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-600">Actual</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-600">Party-Correlated?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allViolations.map((v, idx) => (
                <tr key={`${v.case_id}-${v.doctrine_id}-${idx}`} className="hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-700">
                    <span className="font-medium">{v.case_title}</span>{' '}
                    <span className="text-gray-400">({v.year})</span>
                  </td>
                  <td className="py-2 px-3 text-center text-gray-600">
                    {DOCTRINE_LABELS[v.doctrine_id] ?? v.doctrine_id}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-block rounded px-1.5 py-0.5 bg-gray-100 text-gray-600 capitalize">
                      {v.expected_doctrine_alignment === 'yes' ? 'Aligned' : 'Opposed'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 capitalize ${
                        v.actual_doctrine_alignment === 'yes'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {v.actual_doctrine_alignment === 'yes' ? 'Aligned' : 'Opposed'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {v.is_party_correlated ? (
                      <span className="inline-block rounded px-1.5 py-0.5 bg-red-100 text-red-700 font-medium">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-block rounded px-1.5 py-0.5 bg-gray-100 text-gray-500">
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PriorsPage() {
  const priors = priorsData as Record<string, Record<string, unknown>>

  // Build justice names for column headers
  const justiceNames: Record<string, string> = {}
  for (const seatId of SEATS) {
    const seat = priors[seatId]
    if (seat) {
      justiceNames[seatId] = seat.justice_name as string
    }
  }

  // Compute surprise scores once
  const surpriseScores: JusticeSurpriseScore[] = computeSurpriseScores()

  // Sort leaderboard by party correlation rate descending
  const sortedScores = [...surpriseScores].sort(
    (a, b) => b.overall_party_correlation_rate - a.overall_party_correlation_rate
  )

  // Justices with at least one violation
  const scoresWithViolations = sortedScores.filter(s => s.total_violations > 0)

  // Default selected = first justice with violations
  const defaultSelected = scoresWithViolations[0]?.seat_id ?? null
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(defaultSelected)

  const selectedScore = surpriseScores.find(s => s.seat_id === selectedSeatId) ?? null

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Stated Positions vs. Actual Votes
        </h1>
        <p className="text-gray-500 text-base max-w-3xl">
          Each justice&apos;s documented position on each doctrine — sourced from written
          opinions, concurrences, and confirmation testimony — compared against their actual
          votes in our case database.
        </p>
      </div>

      {/* ── Section 1: Prior Assumptions grid ──────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Prior Assumptions</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 whitespace-nowrap sticky left-0 bg-gray-50 z-10">
                  Doctrine
                </th>
                {SEATS.map(seatId => (
                  <th
                    key={seatId}
                    className="py-2 px-2 font-semibold text-gray-600 whitespace-nowrap text-center"
                  >
                    {justiceNames[seatId] ? getLastName(justiceNames[seatId]) : seatId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {DOCTRINE_IDS.map(doctrineId => (
                <tr key={doctrineId} className="hover:bg-gray-50/50">
                  <td className="py-1 px-3 font-medium text-gray-700 whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50/50 z-10">
                    {DOCTRINE_LABELS[doctrineId] ?? doctrineId}
                  </td>
                  {SEATS.map(seatId => (
                    <PriorCell key={seatId} seatId={seatId} doctrineId={doctrineId} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          ~ = moderate-strength prior. Hover any badge for source and summary.
        </p>
      </section>

      {/* ── Section 2: Surprise Analysis ────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-1">Surprise Analysis</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-3xl">
          Cases where a justice voted against their stated prior. &ldquo;Party-correlated&rdquo; means the
          departure aligned with their appointing party&apos;s interest.
        </p>

        {/* Leaderboard */}
        <div className="flex flex-wrap gap-3 mb-8">
          {sortedScores.map(score => (
            <LeaderboardCard
              key={score.seat_id}
              score={score}
              isSelected={selectedSeatId === score.seat_id}
              onClick={() => setSelectedSeatId(score.seat_id)}
            />
          ))}
        </div>

        {/* Per-justice detail */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* Tab row — justices with violations */}
          {scoresWithViolations.length > 0 ? (
            <>
              <div className="flex overflow-x-auto border-b border-gray-200">
                {scoresWithViolations.map(score => (
                  <button
                    key={score.seat_id}
                    onClick={() => setSelectedSeatId(score.seat_id)}
                    className={`shrink-0 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                      selectedSeatId === score.seat_id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {getLastName(score.justice_name)}
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      ({score.total_violations})
                    </span>
                  </button>
                ))}
              </div>
              <div className="p-5">
                {selectedScore ? (
                  <>
                    <div className="flex items-baseline gap-3 mb-4">
                      <span className="text-base font-bold text-gray-800">
                        {selectedScore.justice_name}
                      </span>
                      <span className={`text-sm font-semibold ${partyCorrelationColor(selectedScore.overall_party_correlation_rate)}`}>
                        {pct(selectedScore.overall_party_correlation_rate)} overall party-correlation rate
                      </span>
                      <span className="text-xs text-gray-400">
                        {selectedScore.total_violations} departure{selectedScore.total_violations !== 1 ? 's' : ''} across{' '}
                        {selectedScore.total_cases_with_prior} evaluated cases
                      </span>
                    </div>
                    <JusticeDetail score={selectedScore} />
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Select a justice above.</p>
                )}
              </div>
            </>
          ) : (
            <div className="p-5">
              <p className="text-sm text-gray-500 italic">
                No departures from stated prior detected in our case database.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 3: Methodology note ──────────────────────────────────────── */}
      <section>
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-5 py-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-600">Methodology: </span>
            Prior positions are drawn from written judicial opinions, dissents, concurrences, and
            confirmation hearing testimony — not inferred from voting patterns. Only priors rated
            &ldquo;strong&rdquo; or &ldquo;moderate&rdquo; generate predictions. A departure is
            &ldquo;party-correlated&rdquo; when a justice voted against their stated prior and that
            vote aligned with the interest of their appointing party.
          </p>
        </div>
      </section>
    </div>
  )
}
