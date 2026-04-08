import { Link } from 'react-router-dom'
import { namedScores } from '../lib/data'
import type { NamedJusticeScore } from '../lib/types'
import rawData from '../data/pending-cases.json'

// ── Types ────────────────────────────────────────────────────────────────────

interface PendingCase {
  id: string
  title: string
  docket: string
  status: 'argued' | 'pending_argument'
  argued_date?: string
  description: string
  relevant_doctrines: string[]
  r_interest: string
  d_interest: string
  doctrine_alignment: 'r' | 'd' | 'contested'
  doctrine_rationale: string
  signal_caveat: string | null
}

interface PendingCasesFile {
  generated_at: string
  source_note: string
  cases: PendingCase[]
}

interface VotePrediction {
  predictedFor: 'r' | 'd'
  confidence: number
  basis: 'aligned' | 'diagnostic' | 'contested'
}

// ── Prediction logic ─────────────────────────────────────────────────────────

/**
 * Predict how a single justice will vote on a pending case.
 *
 * Aligned:    doctrine and party agree → predict that direction, confidence 88%
 * Diagnostic: doctrine and party conflict → partisan_index = P(votes with party)
 * Contested:  doctrine is internally ambiguous → default to party, low confidence
 *             Exception: for contested executive-restraint cases, D-justices have
 *             both doctrine interpretations aligning with their party, so they get
 *             higher confidence.
 */
function predictVote(
  appointingParty: 'R' | 'D',
  partisanIndex: number,
  doctrineAlignment: 'r' | 'd' | 'contested'
): VotePrediction {
  if (doctrineAlignment === 'contested') {
    const predictedFor = appointingParty === 'R' ? 'r' : 'd'
    // D-justices benefit from BOTH doctrine interpretations aligning with party interest
    const confidence = appointingParty === 'D' ? 0.82 : 0.58
    return { predictedFor, confidence, basis: 'contested' }
  }

  const doctrineFavorsParty =
    (doctrineAlignment === 'r' && appointingParty === 'R') ||
    (doctrineAlignment === 'd' && appointingParty === 'D')

  if (doctrineFavorsParty) {
    return { predictedFor: doctrineAlignment, confidence: 0.88, basis: 'aligned' }
  }

  // Diagnostic zone: doctrine and party point in opposite directions.
  // partisan_index = estimated probability justice votes with appointing party.
  const pParty = partisanIndex
  const pDoctrine = 1 - partisanIndex
  const partyOutcome = appointingParty.toLowerCase() as 'r' | 'd'

  if (pParty >= pDoctrine) {
    return { predictedFor: partyOutcome, confidence: pParty, basis: 'diagnostic' }
  } else {
    return { predictedFor: doctrineAlignment, confidence: pDoctrine, basis: 'diagnostic' }
  }
}

function computeOutcome(
  predictions: VotePrediction[],
  hasCaveat: boolean
): { predictedWinner: 'r' | 'd'; rVotes: number; dVotes: number; overallConfidence: number } {
  const rVotes = predictions.filter(p => p.predictedFor === 'r').length
  const dVotes = predictions.filter(p => p.predictedFor === 'd').length
  const predictedWinner: 'r' | 'd' = rVotes >= 5 ? 'r' : 'd'

  const winningSide = predictions.filter(p => p.predictedFor === predictedWinner)
  const avgConf = winningSide.reduce((s, p) => s + p.confidence, 0) / winningSide.length

  // Wider margins raise confidence slightly; signal caveats lower it.
  const marginBonus = (Math.abs(rVotes - dVotes) - 1) * 0.04
  const caveatPenalty = hasCaveat ? 0.15 : 0
  const overallConfidence = Math.min(0.92, avgConf + marginBonus - caveatPenalty)

  return { predictedWinner, rVotes, dVotes, overallConfidence }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(0) + '%'
}

function confLabel(c: number): string {
  if (c >= 0.82) return 'High'
  if (c >= 0.65) return 'Medium'
  return 'Low'
}

function confColor(c: number): string {
  if (c >= 0.82) return 'text-green-700 dark:text-green-400'
  if (c >= 0.65) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ pendingCase }: { pendingCase: PendingCase }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 font-medium">
        {pendingCase.status === 'argued' && pendingCase.argued_date
          ? `Argued ${fmtDate(pendingCase.argued_date)}`
          : 'Pending Argument'}
      </span>
      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        Decision Pending
      </span>
    </div>
  )
}

function AlignmentTag({ alignment }: { alignment: 'r' | 'd' | 'contested' }) {
  if (alignment === 'contested') {
    return (
      <span className="font-medium text-yellow-700 dark:text-yellow-400">
        Contested — doctrine is internally ambiguous (see note below)
      </span>
    )
  }
  return (
    <span className={`font-medium ${alignment === 'r'
      ? 'text-red-700 dark:text-red-400'
      : 'text-blue-700 dark:text-blue-400'}`}>
      {alignment === 'r' ? 'Doctrine favors R-position' : 'Doctrine favors D-position'}
    </span>
  )
}

function CasePrediction({
  pendingCase,
  scores,
}: {
  pendingCase: PendingCase
  scores: NamedJusticeScore[]
}) {
  // Sort by seat number for a consistent left-to-right display
  const sorted = [...scores].sort((a, b) => {
    return parseInt(a.seat_id.replace('seat_', '')) - parseInt(b.seat_id.replace('seat_', ''))
  })

  const predictions = sorted.map(s => ({
    score: s,
    vote: predictVote(s.justice.appointing_party, s.partisan_index, pendingCase.doctrine_alignment),
  }))

  const outcome = computeOutcome(
    predictions.map(p => p.vote),
    !!pendingCase.signal_caveat
  )

  const outcomeIsR = outcome.predictedWinner === 'r'

  return (
    <section className="border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">{pendingCase.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Docket No. {pendingCase.docket}</p>
          <StatusBadge pendingCase={pendingCase} />
        </div>
        {/* Outcome summary badge */}
        <div className={`rounded-lg px-4 py-2 text-center min-w-[120px] border ${
          outcomeIsR
            ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700'
            : 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700'
        }`}>
          <p className={`text-xs font-medium mb-0.5 ${outcomeIsR ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
            Predicted
          </p>
          <p className={`font-mono font-bold text-2xl ${outcomeIsR ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}`}>
            {outcome.rVotes}–{outcome.dVotes}
          </p>
          <p className={`text-xs ${outcomeIsR ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
            {outcomeIsR ? 'R-favored' : 'D-favored'}
          </p>
          <p className={`text-xs font-mono font-semibold mt-1 ${confColor(outcome.overallConfidence)}`}>
            {fmtPct(outcome.overallConfidence)} conf. ({confLabel(outcome.overallConfidence)})
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{pendingCase.description}</p>

      {/* Party interests */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="font-semibold text-red-900 dark:text-red-300 mb-1 text-xs uppercase tracking-wide">R-party interest</p>
          <p className="text-red-800 dark:text-red-200">{pendingCase.r_interest}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1 text-xs uppercase tracking-wide">D-party interest</p>
          <p className="text-blue-800 dark:text-blue-200">{pendingCase.d_interest}</p>
        </div>
      </div>

      {/* Doctrine alignment */}
      <div className="text-sm bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
        <p className="mb-1">
          <span className="font-medium text-gray-700 dark:text-gray-300">Doctrine alignment: </span>
          <AlignmentTag alignment={pendingCase.doctrine_alignment} />
        </p>
        <p className="text-gray-600 dark:text-gray-400">{pendingCase.doctrine_rationale}</p>
      </div>

      {/* Signal caveat */}
      {pendingCase.signal_caveat && (
        <div className="border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950 rounded-lg p-3 mb-4 text-sm">
          <p className="font-semibold text-orange-900 dark:text-orange-300 mb-1">Methodological Note</p>
          <p className="text-orange-800 dark:text-orange-200">{pendingCase.signal_caveat}</p>
        </div>
      )}

      {/* Vote prediction table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left py-2 pr-3 font-medium">Justice</th>
              <th className="text-left py-2 pr-3 font-medium">Appt.</th>
              <th className="text-right py-2 pr-3 font-medium">Index</th>
              <th className="text-left py-2 pr-3 font-medium">Predicted</th>
              <th className="text-right py-2 pr-3 font-medium">Conf.</th>
              <th className="text-left py-2 font-medium">Basis</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map(({ score, vote }) => (
              <tr key={score.seat_id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-3 font-medium">{score.justice.name}</td>
                <td className="py-2 pr-3">
                  <span className={`text-xs font-bold ${
                    score.justice.appointing_party === 'R'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {score.justice.appointing_party}
                  </span>
                </td>
                <td className="py-2 pr-3 text-right font-mono text-gray-500 text-xs">
                  {fmtPct(score.partisan_index)}
                </td>
                <td className="py-2 pr-3">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    vote.predictedFor === 'r'
                      ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  }`}>
                    {vote.predictedFor === 'r' ? 'R-favored' : 'D-favored'}
                  </span>
                </td>
                <td className={`py-2 pr-3 text-right font-mono text-xs ${confColor(vote.confidence)}`}>
                  {fmtPct(vote.confidence)}
                </td>
                <td className="py-2 text-xs text-gray-400">
                  {vote.basis === 'aligned' ? 'Aligned' :
                   vote.basis === 'diagnostic' ? 'Diagnostic' :
                   'Contested'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Outcome summary */}
      <div className={`rounded-lg p-4 border ${
        outcomeIsR
          ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700'
          : 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700'
      }`}>
        <p className={`font-semibold ${outcomeIsR
          ? 'text-red-900 dark:text-red-300'
          : 'text-blue-900 dark:text-blue-300'}`}>
          Predicted outcome: {outcomeIsR ? pendingCase.r_interest : pendingCase.d_interest}
        </p>
        <p className={`text-sm mt-1 ${outcomeIsR
          ? 'text-red-800 dark:text-red-200'
          : 'text-blue-800 dark:text-blue-200'}`}>
          Model vote: {outcome.rVotes}–{outcome.dVotes} · Overall confidence:{' '}
          <span className={`font-mono font-semibold ${confColor(outcome.overallConfidence)}`}>
            {fmtPct(outcome.overallConfidence)} ({confLabel(outcome.overallConfidence)})
          </span>
        </p>
      </div>
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function PredictivePage() {
  const scores = namedScores()
  const data = rawData as unknown as PendingCasesFile
  const compiledDate = fmtDate(data.generated_at)

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-serif font-semibold mb-3 leading-tight">
        Predictive Analysis
      </h1>
      <p className="text-sm text-gray-500 mb-3">
        Applying the partisan index scores to pending 2025–26 term cases to estimate how
        each justice will vote and the probable outcome.
      </p>

      {/* Timestamp block */}
      <div className="font-mono text-xs text-gray-400 bg-gray-50 dark:bg-gray-900 rounded px-3 py-2 mb-8 flex flex-wrap gap-x-4 gap-y-1">
        <span>Analysis compiled: <span className="text-gray-600 dark:text-gray-300">{compiledDate}</span></span>
        <span>·</span>
        <span>Term: <span className="text-gray-600 dark:text-gray-300">2025–26 (October 2025 – June 2026)</span></span>
        <span>·</span>
        <span>Source: <span className="text-gray-600 dark:text-gray-300">{data.source_note}</span></span>
      </div>

      {/* How predictions work */}
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg p-4 mb-10 text-sm">
        <p className="font-semibold text-amber-900 dark:text-amber-300 mb-2">How predictions work</p>
        <p className="text-amber-800 dark:text-amber-200 mb-2">
          For each case we identify which constitutional doctrine applies and whether that
          doctrine's principled conclusion aligns with the R-party or D-party interest.
        </p>
        <ul className="text-amber-800 dark:text-amber-200 space-y-1 list-disc pl-5">
          <li>
            <strong>Aligned:</strong> doctrine and appointing party both point the same direction.
            These justices are predicted to vote that direction with ~88% confidence.
          </li>
          <li>
            <strong>Diagnostic:</strong> doctrine and appointing party conflict. The justice's
            partisan index directly estimates the probability they vote with party over doctrine.
            A 70% index = 70% chance of following party.
          </li>
          <li>
            <strong>Contested:</strong> the doctrine itself is internally ambiguous. Predictions
            default to party alignment but carry low confidence (~58%).
          </li>
        </ul>
      </div>

      {/* Cases */}
      <div className="space-y-10">
        {data.cases.map(c => (
          <CasePrediction key={c.id} pendingCase={c} scores={scores} />
        ))}
      </div>

      {/* Caveats */}
      <div className="mt-14 border-t border-gray-200 dark:border-gray-800 pt-8">
        <h2 className="font-serif text-xl font-semibold mb-3">Caveats</h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-5">
          <li>
            These are probabilistic estimates, not forecasts. The model applies a statistical
            pattern from past cases to a new situation. Justices may behave differently on
            high-salience or politically unusual cases.
          </li>
          <li>
            Doctrine alignment is a judgment call made by this project. A different classification
            would produce different predictions. Treat the reasoning, not just the number, as the
            output.
          </li>
          <li>
            Cases with a Methodological Note carry reduced confidence. The relevant doctrine may
            not cleanly apply, or a known scoring-reliability issue affects the predictions.
          </li>
          <li>
            The model does not account for strategic voting, coalition formation, or case-specific
            legal reasoning. A justice who votes unexpectedly is not necessarily being partisan —
            they may have identified a genuine doctrinal distinction the model missed.
          </li>
          <li>
            "Confident" in the Basis column means doctrine and party agree for that justice, not
            that the prediction is certain. All predictions carry meaningful uncertainty.
          </li>
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link to="/blog" className="underline text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Analysis</Link>
        <Link to="/methodology" className="underline text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Methodology</Link>
        <Link to="/verify" className="underline text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Verify scores</Link>
        <Link to="/" className="underline text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Dashboard</Link>
      </div>
    </div>
  )
}
