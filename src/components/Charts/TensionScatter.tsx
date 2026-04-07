import { useState } from 'react'
import type { NamedJusticeScore } from '../../lib/types'
import { computeDiagnosticStats } from '../../lib/trajectory'
import { getLastName, THRESHOLDS } from '../../lib/utils'

interface Props { data: NamedJusticeScore[] }

interface TooltipState {
  x: number; y: number
  name: string; party: 'R' | 'D'
  partisan_index: number
  total_diagnostic_cases: number
  total_signal_cases: number
  diagnostic_rate: number
}

const W = 580, H = 420
const PAD = { top: 44, right: 44, bottom: 64, left: 68 }
const iW = W - PAD.left - PAD.right
const iH = H - PAD.top - PAD.bottom

const toX = (v: number, min: number, max: number) =>
  PAD.left + ((v - min) / (max - min)) * iW
const toY = (v: number) =>
  PAD.top + (1 - v) * iH

export function TensionScatter({ data }: Props) {
  const [tip, setTip] = useState<TooltipState | null>(null)

  const points = data.map(s => {
    const stats = computeDiagnosticStats(s.seat_id)
    return { ...s, ...stats }
  })

  // X axis: diagnostic rate — pad to nearest 0.05
  const snap = (v: number, dir: 'floor' | 'ceil') =>
    (dir === 'floor' ? Math.floor : Math.ceil)(v * 20) / 20
  const rates = points.map(p => p.diagnostic_rate)
  const X_MIN = Math.max(0, snap(Math.min(...rates) - 0.05, 'floor'))
  const X_MAX = Math.min(1, snap(Math.max(...rates) + 0.05, 'ceil'))

  const sx = (v: number) => toX(v, X_MIN, X_MAX)
  const sy = (v: number) => toY(v)

  // X-axis ticks
  const xTicks: number[] = []
  for (let v = 0; v <= 1.001; v = Math.round((v + 0.05) * 100) / 100) {
    if (v >= X_MIN - 0.001 && v <= X_MAX + 0.001) xTicks.push(v)
  }

  // Y-axis ticks at every 10%
  const yTicks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

  // Threshold band y-pixel positions
  const yStrong   = sy(THRESHOLDS.STRONGLY_PARTISAN)
  const yModPart  = sy(THRESHOLDS.MODERATELY_PARTISAN)
  const yModDoc   = sy(THRESHOLDS.MODERATELY_DOCTRINAL)
  const yBottom   = H - PAD.bottom
  const yTop      = PAD.top

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        X axis: what fraction of each justice's cases presented a genuine choice between party and doctrine
        (diagnostic rate). Y axis: partisan index — among those hard choices, how often did they side with
        their appointing party. Dot size scales with number of diagnostic cases (confidence in the index).
      </p>
      <div className="relative" style={{ maxWidth: W }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible select-none">

          {/* Threshold bands */}
          <rect x={PAD.left} y={yTop}      width={iW} height={yStrong - yTop}        fill="#fee2e2" opacity={0.35} />
          <rect x={PAD.left} y={yStrong}   width={iW} height={yModPart - yStrong}    fill="#fef9c3" opacity={0.35} />
          <rect x={PAD.left} y={yModPart}  width={iW} height={yModDoc  - yModPart}   fill="#eff6ff" opacity={0.35} />
          <rect x={PAD.left} y={yModDoc}   width={iW} height={yBottom  - yModDoc}    fill="#dbeafe" opacity={0.35} />

          {/* Threshold lines */}
          {[THRESHOLDS.STRONGLY_PARTISAN, THRESHOLDS.MODERATELY_PARTISAN, THRESHOLDS.MODERATELY_DOCTRINAL].map(t => (
            <line key={t}
              x1={PAD.left} y1={sy(t)} x2={W - PAD.right} y2={sy(t)}
              stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 3" />
          ))}

          {/* Threshold labels (right edge) */}
          <text x={W - PAD.right + 4} y={yStrong + 4}  fontSize={9} fill="#9ca3af">75%</text>
          <text x={W - PAD.right + 4} y={yModPart + 4} fontSize={9} fill="#9ca3af">45%</text>
          <text x={W - PAD.right + 4} y={yModDoc + 4}  fontSize={9} fill="#9ca3af">25%</text>

          {/* Band labels (left of Y axis) */}
          <text x={PAD.left - 4} y={(yTop + yStrong) / 2 + 4}      textAnchor="end" fontSize={9} fill="#dc2626">Strongly partisan</text>
          <text x={PAD.left - 4} y={(yStrong + yModPart) / 2 + 4}  textAnchor="end" fontSize={9} fill="#f87171">Mod. partisan</text>
          <text x={PAD.left - 4} y={(yModPart + yModDoc) / 2 + 4}  textAnchor="end" fontSize={9} fill="#93c5fd">Mod. doctrinal</text>
          <text x={PAD.left - 4} y={(yModDoc + yBottom) / 2 + 4}   textAnchor="end" fontSize={9} fill="#2563eb">Strongly doctrinal</text>

          {/* Chart border */}
          <rect x={PAD.left} y={PAD.top} width={iW} height={iH}
            fill="none" stroke="#d1d5db" strokeWidth={1} />

          {/* X ticks */}
          {xTicks.map(v => (
            <g key={v}>
              <line x1={sx(v)} y1={H - PAD.bottom} x2={sx(v)} y2={H - PAD.bottom + 4} stroke="#6b7280" />
              <text x={sx(v)} y={H - PAD.bottom + 15} textAnchor="middle" fontSize={10} fill="#6b7280">
                {Math.round(v * 100)}%
              </text>
            </g>
          ))}

          {/* Y ticks */}
          {yTicks.filter(v => v >= 0 && v <= 1).map(v => (
            <g key={v}>
              <line x1={PAD.left - 4} y1={sy(v)} x2={PAD.left} y2={sy(v)} stroke="#6b7280" />
              <text x={PAD.left - 7} y={sy(v) + 4} textAnchor="end" fontSize={10} fill="#6b7280">
                {Math.round(v * 100)}%
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="#374151" fontWeight={500}>
            Diagnostic Rate (fraction of cases with genuine party vs. doctrine tension) →
          </text>
          <text x={14} y={H / 2} textAnchor="middle" fontSize={12} fill="#374151" fontWeight={500}
            transform={`rotate(-90, 14, ${H / 2})`}>
            Partisan Index (among those cases) →
          </text>

          {/* Justice dots */}
          {points.map(s => {
            const cx = sx(s.diagnostic_rate)
            const cy = sy(s.partisan_index)
            const r  = Math.max(7, Math.min(16, 4 + Math.sqrt(s.total_diagnostic_cases) * 1.4))
            const color = s.justice.appointing_party === 'R' ? '#dc2626' : '#2563eb'
            const lastName = getLastName(s.justice.name)
            // Place label above unless near top
            const labelY = cy < PAD.top + 24 ? cy + r + 13 : cy - r - 5
            return (
              <g key={s.seat_id} style={{ cursor: 'default' }}
                onMouseEnter={e => {
                  const rect = e.currentTarget.closest('svg')!.getBoundingClientRect()
                  setTip({
                    x: e.clientX - rect.left, y: e.clientY - rect.top,
                    name: s.justice.name,
                    party: s.justice.appointing_party,
                    partisan_index: s.partisan_index,
                    total_diagnostic_cases: s.total_diagnostic_cases,
                    total_signal_cases: s.total_signal_cases,
                    diagnostic_rate: s.diagnostic_rate,
                  })
                }}
                onMouseLeave={() => setTip(null)}
              >
                <circle cx={cx} cy={cy} r={r + 8} fill={color} fillOpacity={0.08} />
                <circle cx={cx} cy={cy} r={r} fill={color} stroke="white" strokeWidth={2.5} />
                <text x={cx} y={labelY} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1f2937">
                  {lastName}
                </text>
              </g>
            )
          })}

          {/* Tooltip */}
          {tip && (() => {
            const tx = tip.x > W * 0.65 ? tip.x - 200 : tip.x + 14
            const ty = Math.min(tip.y, H - 130)
            return (
              <g>
                <rect x={tx} y={ty} width={192} height={118} rx={6}
                  fill="white" stroke="#e5e7eb" strokeWidth={1}
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }} />
                <text x={tx + 10} y={ty + 18} fontSize={12} fontWeight={700} fill="#111827">{tip.name}</text>
                <text x={tx + 10} y={ty + 35} fontSize={10} fill="#9ca3af">{tip.party === 'R' ? 'Republican' : 'Democrat'}-appointed</text>
                <text x={tx + 10} y={ty + 53} fontSize={11} fill="#374151">
                  Partisan index: {(tip.partisan_index * 100).toFixed(1)}%
                </text>
                <text x={tx + 10} y={ty + 69} fontSize={11} fill="#374151">
                  Diagnostic cases: {tip.total_diagnostic_cases} / {tip.total_signal_cases}
                </text>
                <text x={tx + 10} y={ty + 85} fontSize={11} fill="#374151">
                  Diagnostic rate: {(tip.diagnostic_rate * 100).toFixed(1)}%
                </text>
                <text x={tx + 10} y={ty + 105} fontSize={10} fill="#9ca3af">
                  {tip.total_diagnostic_cases} cases forced a party vs. doctrine choice
                </text>
              </g>
            )
          })()}
        </svg>

        {/* Legend */}
        <div className="flex gap-6 justify-center text-xs text-gray-500 mt-2">
          <span><span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-1" />Republican-appointed</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-1" />Democrat-appointed</span>
          <span className="text-gray-400">Dot size = number of diagnostic cases</span>
        </div>
      </div>
    </div>
  )
}
