import { useState } from 'react'
import type { NamedJusticeScore } from '../../lib/types'
import { computeRunningPartisanIndex } from '../../lib/trajectory'
import type { DiagnosticStep } from '../../lib/trajectory'
import { getLastName, THRESHOLDS } from '../../lib/utils'

interface Props { data: NamedJusticeScore[] }

interface TipState {
  mouseX: number; mouseY: number
  step: DiagnosticStep
  justiceName: string
  party: 'R' | 'D'
}

// Shared chart dimensions
const W = 260, H = 190
const PAD = { top: 22, right: 14, bottom: 28, left: 34 }
const iW = W - PAD.left - PAD.right
const iH = H - PAD.top - PAD.bottom

// Fixed year axis — same scale on all 9 charts for direct comparability
const YEAR_MIN = 2012, YEAR_MAX = 2025

const sx = (year: number) =>
  PAD.left + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * iW
const sy = (v: number) =>
  PAD.top + (1 - v) * iH

function voteColor(voteType: DiagnosticStep['vote_type'], party: 'R' | 'D'): string {
  if (voteType === 'partisan') return party === 'R' ? '#dc2626' : '#2563eb'  // party color
  if (voteType === 'doctrine') return '#6b7280'                               // neutral gray
  return '#7c3aed'                                                             // mixed: purple
}

interface MiniChartProps {
  score: NamedJusticeScore
  onHover: (tip: TipState | null) => void
}

function MiniChart({ score, onHover }: MiniChartProps) {
  const steps = computeRunningPartisanIndex(score.seat_id)
  const partyColor = score.justice.appointing_party === 'R' ? '#dc2626' : '#2563eb'
  const lastName = getLastName(score.justice.name)

  // Threshold pixel positions
  const yStrong  = sy(THRESHOLDS.STRONGLY_PARTISAN)
  const yModPart = sy(THRESHOLDS.MODERATELY_PARTISAN)
  const yModDoc  = sy(THRESHOLDS.MODERATELY_DOCTRINAL)
  const yBottom  = H - PAD.bottom
  const yTop     = PAD.top

  // Year tick marks at every 2 years
  const yearTicks: number[] = []
  for (let y = 2012; y <= YEAR_MAX; y += 2) yearTicks.push(y)

  if (!steps.length) return null

  const finalIndex = steps[steps.length - 1].running_index

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <clipPath id={`rp-clip-${score.seat_id}`}>
        <rect x={PAD.left} y={PAD.top} width={iW} height={iH} />
      </clipPath>

      {/* Threshold bands */}
      <rect x={PAD.left} y={yTop}     width={iW} height={yStrong  - yTop}       fill="#fee2e2" opacity={0.3} />
      <rect x={PAD.left} y={yStrong}  width={iW} height={yModPart - yStrong}    fill="#fef9c3" opacity={0.3} />
      <rect x={PAD.left} y={yModPart} width={iW} height={yModDoc  - yModPart}   fill="#f3f4f6" opacity={0.5} />
      <rect x={PAD.left} y={yModDoc}  width={iW} height={yBottom  - yModDoc}    fill="#e5e7eb" opacity={0.5} />

      {/* Threshold lines */}
      {[THRESHOLDS.STRONGLY_PARTISAN, THRESHOLDS.MODERATELY_PARTISAN, THRESHOLDS.MODERATELY_DOCTRINAL].map(t => (
        <line key={t}
          x1={PAD.left} y1={sy(t)} x2={W - PAD.right} y2={sy(t)}
          stroke="#d1d5db" strokeWidth={0.75} strokeDasharray="3 2" />
      ))}

      {/* Border */}
      <rect x={PAD.left} y={PAD.top} width={iW} height={iH}
        fill="none" stroke="#e5e7eb" strokeWidth={1} />

      {/* Year ticks */}
      {yearTicks.map(y => (
        <g key={y}>
          <line x1={sx(y)} y1={H - PAD.bottom} x2={sx(y)} y2={H - PAD.bottom + 3} stroke="#9ca3af" strokeWidth={0.75} />
          <text x={sx(y)} y={H - PAD.bottom + 10} textAnchor="middle" fontSize={7} fill="#9ca3af">
            {y === 2012 || y % 4 === 0 ? String(y).slice(2) : ''}
          </text>
        </g>
      ))}

      {/* Y ticks at threshold values */}
      {[0, 0.25, 0.45, 0.75, 1.0].map(v => (
        <g key={v}>
          <line x1={PAD.left - 3} y1={sy(v)} x2={PAD.left} y2={sy(v)} stroke="#9ca3af" strokeWidth={0.75} />
          <text x={PAD.left - 5} y={sy(v) + 3} textAnchor="end" fontSize={7} fill="#9ca3af">
            {Math.round(v * 100)}
          </text>
        </g>
      ))}

      {/* Step chart (clipped to inner area) */}
      <g clipPath={`url(#rp-clip-${score.seat_id})`}>
        {steps.map((step, i) => {
          const cx = sx(step.year)
          const cy = sy(step.running_index)
          const prev = i > 0 ? steps[i - 1] : null
          const color = voteColor(step.vote_type, score.justice.appointing_party)

          return (
            <g key={step.case_id}>
              {/* Horizontal carry line from previous step to this year */}
              {prev && (
                <line
                  x1={sx(prev.year)} y1={sy(prev.running_index)}
                  x2={cx}           y2={sy(prev.running_index)}
                  stroke="#d1d5db" strokeWidth={1.2}
                />
              )}
              {/* Vertical step to new index */}
              {prev && (
                <line
                  x1={cx} y1={sy(prev.running_index)}
                  x2={cx} y2={cy}
                  stroke={color} strokeWidth={1.5}
                />
              )}
              {/* Case dot — colored by vote type, wider invisible hit target */}
              <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="white" strokeWidth={1} />
              <circle cx={cx} cy={cy} r={8} fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => {
                  const svg = e.currentTarget.closest('svg')!.getBoundingClientRect()
                  onHover({
                    mouseX: e.clientX - svg.left,
                    mouseY: e.clientY - svg.top,
                    step,
                    justiceName: score.justice.name,
                    party: score.justice.appointing_party,
                  })
                }}
                onMouseMove={e => {
                  const svg = e.currentTarget.closest('svg')!.getBoundingClientRect()
                  onHover({
                    mouseX: e.clientX - svg.left,
                    mouseY: e.clientY - svg.top,
                    step,
                    justiceName: score.justice.name,
                    party: score.justice.appointing_party,
                  })
                }}
                onMouseLeave={() => onHover(null)}
              />
            </g>
          )
        })}

        {/* Trailing carry line from last case to end of chart */}
        {steps.length > 0 && (
          <line
            x1={sx(steps[steps.length - 1].year)} y1={sy(finalIndex)}
            x2={W - PAD.right}                    y2={sy(finalIndex)}
            stroke="#d1d5db" strokeWidth={1.2}
          />
        )}
      </g>

      {/* Final index label at right edge */}
      <text
        x={W - PAD.right + 3} y={sy(finalIndex) + 4}
        fontSize={9} fontWeight={700} fill={partyColor}
      >
        {Math.round(finalIndex * 100)}%
      </text>

      {/* Justice name header */}
      <text x={W / 2} y={13} textAnchor="middle" fontSize={10} fontWeight={700} fill={partyColor}>
        {lastName}
      </text>
    </svg>
  )
}

function CaseTooltip({ tip, containerWidth }: { tip: TipState; containerWidth: number }) {
  const voteLabel =
    tip.step.vote_type === 'partisan' ? 'Voted with party (against doctrine)' :
    tip.step.vote_type === 'doctrine' ? 'Voted with doctrine (against party)' :
    'Mixed / partial'
  const tipVoteColor =
    tip.step.vote_type === 'doctrine' ? 'text-gray-600' :
    tip.step.vote_type === 'mixed'    ? 'text-purple-600' :
    tip.party === 'R' ? 'text-red-600' : 'text-blue-600'

  const left  = tip.mouseX > containerWidth * 0.55 ? undefined : tip.mouseX + 16
  const right = tip.mouseX > containerWidth * 0.55 ? containerWidth - tip.mouseX + 16 : undefined

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs"
      style={{ top: Math.max(8, tip.mouseY - 16), left, right, width: 260, pointerEvents: 'none' }}
    >
      <div className="flex justify-between mb-1">
        <span className="font-semibold text-gray-900 text-sm">{tip.step.case_title}</span>
        <span className="text-gray-400 ml-2 shrink-0">{tip.step.year}</span>
      </div>
      <div className={`font-semibold mb-1 ${tipVoteColor}`}>{voteLabel}</div>
      <div className="text-gray-500">
        Running partisan index after this case:{' '}
        <span className="font-semibold text-gray-800">
          {(tip.step.running_index * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

export function RunningPartisanChart({ data }: Props) {
  const [tip, setTip] = useState<TipState | null>(null)
  const [containerWidth, setContainerWidth] = useState(900)

  const sorted = [...data].sort((a, b) => {
    const pa = a.justice.appointing_party, pb = b.justice.appointing_party
    if (pa !== pb) return pa === 'R' ? -1 : 1
    return b.partisan_index - a.partisan_index
  })

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Running partisan index computed only from diagnostic cases — cases where party alignment and
        doctrine alignment pointed in opposite directions. Each dot is a case vote; a dot in the justice's party
        color (red = R-appointed, blue = D-appointed) means they voted with party over doctrine.{' '}
        <span className="text-gray-500 font-medium">Gray</span> = voted with doctrine over party.{' '}
        <span className="text-purple-600 font-medium">Purple</span> = mixed/partial.
        The line shows how the index accumulates as cases arrive. Non-diagnostic cases are excluded entirely.
        Hover any dot for case details.
      </p>

      {/* Shared band legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3 justify-center">
        <span className="flex items-center gap-1">
          <span className="inline-block w-8 h-3 rounded" style={{ backgroundColor: '#fee2e2', opacity: 0.8 }} />
          Strongly partisan (&ge;75%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-8 h-3 rounded" style={{ backgroundColor: '#fef9c3', opacity: 0.8 }} />
          Mod. partisan (45–75%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-8 h-3 rounded" style={{ backgroundColor: '#d1d5db', opacity: 0.8 }} />
          Mod. doctrinal (25–45%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-8 h-3 rounded" style={{ backgroundColor: '#9ca3af', opacity: 0.8 }} />
          Strongly doctrinal (&lt;25%)
        </span>
      </div>

      <div
        className="relative"
        ref={el => { if (el) setContainerWidth(el.clientWidth) }}
        onMouseLeave={() => setTip(null)}
      >
        <div className="grid grid-cols-3 gap-3">
          {sorted.map(s => (
            <div key={s.seat_id}
              className="border border-gray-200 rounded-xl p-2 bg-white">
              <MiniChart score={s} onHover={setTip} />
            </div>
          ))}
        </div>
        {tip && <CaseTooltip tip={tip} containerWidth={containerWidth} />}
      </div>
    </div>
  )
}
