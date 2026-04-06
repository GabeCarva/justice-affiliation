import type { NamedJusticeScore } from '../lib/types'
import { classifyPartisanIndex, confidenceLabel, getPartisanIndexColor } from '../lib/utils'

interface Props {
  score: NamedJusticeScore
  onClick?: () => void
  selected?: boolean
}

export function JusticeCard({ score, onClick, selected }: Props) {
  const { label } = classifyPartisanIndex(score.partisan_index)
  const pct = (score.partisan_index * 100).toFixed(1)
  const isR = score.justice.appointing_party === 'R'

  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border p-4 transition-all w-full ${
        selected
          ? 'border-gray-900 dark:border-white shadow-md'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-sm">{score.justice.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Appointed {score.justice.year_appointed} by {score.justice.appointed_by}
          </p>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: isR ? '#fee2e2' : '#dbeafe',
            color: isR ? '#991b1b' : '#1e40af',
          }}
        >
          {isR ? 'R' : 'D'}
        </span>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">{label}</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: getPartisanIndexColor(score.partisan_index),
            }}
          />
        </div>
      </div>
      {score.confidence === 'low' && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
          Low confidence — fewer qualifying cases
        </p>
      )}
      <p className="text-xs text-gray-400 mt-1">{confidenceLabel(score.confidence)}</p>
    </button>
  )
}
