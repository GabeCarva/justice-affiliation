import type { DiagnosticCase, NamedJusticeScore } from '../../lib/types'
import { getLastName } from '../../lib/utils'

interface Props {
  cases: DiagnosticCase[]
  scores: NamedJusticeScore[]
}

function cellBg(voteAlignsDoctrine: string, voteAlignsParty: string, party: 'R' | 'D'): string {
  if (voteAlignsDoctrine === 'yes' && voteAlignsParty === 'no') return '#e5e7eb' // doctrine — neutral gray
  if (voteAlignsParty === 'yes' && voteAlignsDoctrine === 'no') return party === 'R' ? '#fecaca' : '#bfdbfe' // partisan — party color
  if (voteAlignsDoctrine === 'yes' && voteAlignsParty === 'yes') return '#d1fae5' // both (non-diagnostic)
  if (voteAlignsDoctrine === 'partial' || voteAlignsParty === 'partial') return '#fef3c7' // mixed
  return '#f3f4f6' // neither / missing
}

function cellLabel(voteAlignsDoctrine: string, voteAlignsParty: string): string {
  if (voteAlignsDoctrine === 'yes' && voteAlignsParty === 'no') return 'D'
  if (voteAlignsParty === 'yes' && voteAlignsDoctrine === 'no') return 'P'
  if (voteAlignsDoctrine === 'yes' && voteAlignsParty === 'yes') return '='
  if (voteAlignsDoctrine === 'partial' || voteAlignsParty === 'partial') return '~'
  return '?'
}

export function VoteMatrix({ cases, scores }: Props) {
  const sortedCases = [...cases].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.signal_level] - order[b.signal_level]
  })
  const sortedScores = [...scores].sort((a, b) => b.partisan_index - a.partisan_index)

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Each cell shows how a justice voted relative to doctrine and appointing-party interest in that case.
        Gray (D) = voted with doctrine over party. Party-colored (P) = voted with party over doctrine (red = R-appointed, blue = D-appointed).
        Green (=) = both aligned (non-diagnostic). Yellow (~) = partial. Cases sorted by signal level (high first).
      </p>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: '100%' }}>
          <thead>
            <tr>
              <th className="text-left p-2 font-medium text-gray-600 sticky left-0 bg-white dark:bg-gray-900 min-w-[180px]">
                Case
              </th>
              <th className="p-1 font-medium text-gray-500 text-center min-w-[40px]">Sig</th>
              {sortedScores.map(s => (
                <th key={s.seat_id} className="p-1 font-medium text-gray-600 text-center min-w-[50px]"
                  title={s.justice.name}>
                  {getLastName(s.justice.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedCases.map(c => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="p-2 sticky left-0 bg-white dark:bg-gray-900">
                  <span className="font-medium" title={c.title}>
                    {c.title.length > 28 ? c.title.slice(0, 26) + '…' : c.title}
                  </span>
                  <span className="text-gray-400 ml-1">({c.year})</span>
                </td>
                <td className="p-1 text-center">
                  <span className={`uppercase font-semibold ${
                    c.signal_level === 'high' ? 'text-red-600' :
                    c.signal_level === 'medium' ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    {c.signal_level[0].toUpperCase()}
                  </span>
                </td>
                {sortedScores.map(s => {
                  const vote = c.votes[s.seat_id]
                  if (!vote) {
                    return (
                      <td key={s.seat_id} className="p-0 text-center">
                        <div className="m-0.5 rounded py-1 bg-gray-100 text-gray-300 text-center">n/a</div>
                      </td>
                    )
                  }
                  const bg = cellBg(vote.vote_aligns_with_doctrine, vote.vote_aligns_with_appointer_party, s.justice.appointing_party)
                  const label = cellLabel(vote.vote_aligns_with_doctrine, vote.vote_aligns_with_appointer_party)
                  return (
                    <td key={s.seat_id} className="p-0 text-center"
                      title={`${s.justice.name}: ${vote.vote}`}>
                      <div
                        className="m-0.5 rounded py-1 font-semibold"
                        style={{ backgroundColor: bg, color: '#374151' }}
                      >
                        {label}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 justify-start text-xs text-gray-500 mt-3">
        <span className="flex items-center gap-1">
          <span className="inline-block w-5 h-4 rounded text-center font-semibold text-gray-600" style={{ backgroundColor: '#e5e7eb' }}>D</span>
          Doctrine over party
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-5 h-4 rounded text-center font-semibold text-gray-700" style={{ backgroundColor: '#fecaca' }}>P</span>
          R-party over doctrine
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-5 h-4 rounded text-center font-semibold text-gray-700" style={{ backgroundColor: '#bfdbfe' }}>P</span>
          D-party over doctrine
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-5 h-4 rounded text-center font-semibold text-gray-700" style={{ backgroundColor: '#d1fae5' }}>=</span>
          Both aligned (non-diagnostic)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-5 h-4 rounded text-center font-semibold text-gray-700" style={{ backgroundColor: '#fef3c7' }}>~</span>
          Partial
        </span>
        <span className="flex items-center gap-1">n/a = not on court</span>
      </div>
    </div>
  )
}
