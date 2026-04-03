import type { NamedJusticeScore } from '../../lib/types'
import type { Doctrine } from '../../lib/types'
import { getLastName } from '../../lib/utils'

interface Props {
  scores: NamedJusticeScore[]
  doctrines: Doctrine[]
}

function cellColor(index: number | undefined): string {
  if (index === undefined) return '#f3f4f6'
  if (index >= 0.75) return '#dc2626'
  if (index >= 0.6) return '#f87171'
  if (index >= 0.45) return '#d1d5db'
  if (index >= 0.3) return '#93c5fd'
  return '#2563eb'
}

function cellTextColor(index: number | undefined): string {
  if (index === undefined) return '#9ca3af'
  if (index >= 0.75 || index <= 0.3) return '#ffffff'
  return '#374151'
}

export function DoctrineHeatmap({ scores, doctrines }: Props) {
  const sortedScores = [...scores].sort((a, b) => b.partisan_index - a.partisan_index)

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Each cell shows a justice's partisan index for a specific doctrine. Red cells indicate votes that
        followed the appointing party over doctrine; blue cells indicate the reverse. Gray cells indicate
        insufficient data. Cells without data are shown in light gray.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 font-medium text-gray-600 min-w-[140px]">Justice</th>
              {doctrines.map(d => (
                <th key={d.id} className="p-2 font-medium text-gray-600 text-center min-w-[90px] max-w-[90px]">
                  <span title={d.name} className="block truncate" style={{ maxWidth: 86 }}>
                    {d.name.replace('Congressional Spending Authority', 'Spending').replace('Federalism / States Rights', 'Federalism').replace('Standing and Justiciability', 'Standing').replace('Executive Restraint', 'Exec. Restraint').replace('Agency Deference', 'Agency Def.').replace('Nationwide Injunctions', 'Nationwide Inj.')}
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
                          backgroundColor: cellColor(idx),
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
      <div className="flex gap-3 justify-end text-xs text-gray-500 mt-3">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#dc2626' }} />
          Strongly partisan (&ge;75%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#d1d5db' }} />
          Mixed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#2563eb' }} />
          Strongly doctrinal (&le;30%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }} />
          No data
        </span>
      </div>
    </div>
  )
}
