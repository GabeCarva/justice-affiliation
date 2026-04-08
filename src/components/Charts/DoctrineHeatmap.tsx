import type { NamedJusticeScore } from '../../lib/types'
import type { Doctrine } from '../../lib/types'
import { getLastName, THRESHOLDS } from '../../lib/utils'

interface Props {
  scores: NamedJusticeScore[]
  doctrines: Doctrine[]
}

function cellColor(index: number | undefined, party: 'R' | 'D'): string {
  if (index === undefined) return '#f3f4f6'
  const isR = party === 'R'
  if (index >= THRESHOLDS.STRONGLY_PARTISAN)    return isR ? '#dc2626' : '#2563eb'  // deep party color
  if (index >= THRESHOLDS.MODERATELY_PARTISAN)  return isR ? '#f87171' : '#93c5fd'  // light party color
  if (index >= THRESHOLDS.MODERATELY_DOCTRINAL) return '#9ca3af'                     // medium gray (doctrinal)
  return '#374151'                                                                    // dark gray  (strongly doctrinal)
}

function cellTextColor(index: number | undefined): string {
  if (index === undefined) return '#9ca3af'
  if (index >= THRESHOLDS.STRONGLY_PARTISAN) return '#ffffff'    // deep party color → white text
  if (index >= THRESHOLDS.MODERATELY_PARTISAN) return '#374151'  // light party color → dark text
  if (index >= THRESHOLDS.MODERATELY_DOCTRINAL) return '#374151' // medium gray → dark text
  return '#ffffff'                                                 // dark gray → white text
}

export function DoctrineHeatmap({ scores, doctrines }: Props) {
  const sortedScores = [...scores].sort((a, b) => b.partisan_index - a.partisan_index)

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Each cell shows a justice's partisan index for a specific doctrine. Party-colored cells (red for R-appointed,
        blue for D-appointed) indicate votes that followed the appointing party over doctrine; gray cells indicate
        doctrinal adherence. Light gray = no data.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 font-medium text-gray-600 min-w-[140px]">Justice</th>
              {doctrines.map(d => (
                <th key={d.id} className="p-2 font-medium text-gray-600 text-center min-w-[90px] max-w-[90px]">
                  <span title={d.name} className="block truncate" style={{ maxWidth: 86 }}>
                    {d.short_name || d.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedScores.map(score => (
              <tr key={score.seat_id} className="border-t border-gray-100">
                <td className="p-2">
                  <span className="font-medium">{getLastName(score.justice.name)}</span>
                  <span className="text-gray-400 ml-1">
                    ({score.justice.appointing_party})
                  </span>
                </td>
                {doctrines.map(d => {
                  const pd = score.per_doctrine[d.id]
                  const idx = pd?.partisan_index
                  const n = pd?.cases_evaluated
                  return (
                    <td
                      key={d.id}
                      className="p-0 text-center"
                      title={
                        idx !== undefined
                          ? `${score.justice.name}: ${(idx * 100).toFixed(0)}% partisan on ${d.name} (${n} cases)`
                          : `${score.justice.name}: no data for ${d.name}`
                      }
                    >
                      <div
                        className="m-0.5 rounded py-2 px-1 text-center"
                        style={{
                          backgroundColor: cellColor(idx, score.justice.appointing_party),
                          color: cellTextColor(idx),
                        }}
                      >
                        {idx !== undefined ? `${(idx * 100).toFixed(0)}%` : '—'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 justify-end text-xs text-gray-500 mt-3">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#dc2626' }} />
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#2563eb' }} />
          Strongly partisan ≥75% (R / D)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#f87171' }} />
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#93c5fd' }} />
          Mod. partisan 45–75% (R / D)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#9ca3af' }} />
          Mod. doctrinal (25–45%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#374151' }} />
          Strongly doctrinal (&lt;25%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }} />
          No data
        </span>
      </div>
    </div>
  )
}
