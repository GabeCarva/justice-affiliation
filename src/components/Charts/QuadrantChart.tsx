import { useState } from 'react'
import type { NamedJusticeScore } from '../../lib/types'
import { computeFinalRates } from '../../lib/trajectory'

interface Props { data: NamedJusticeScore[] }

interface TooltipState {
  x: number; y: number; svgX: number; svgY: number
  name: string; party: 'R' | 'D'
  partyRate: number; doctrineRate: number
  partisan_index: number; total_diagnostic_cases: number
}

const W = 580, H = 460
const PAD = { top: 44, right: 44, bottom: 58, left: 64 }
const iW = W - PAD.left - PAD.right
const iH = H - PAD.top - PAD.bottom

const toX = (v: number) => PAD.left + v * iW
const toY = (v: number) => PAD.top + (1 - v) * iH

// Axis domain: zoom in to the interesting range
const X_MIN = 0.55, X_MAX = 1.0
const Y_MIN = 0.45, Y_MAX = 0.85
const scaleX = (v: number) => toX((v - X_MIN) / (X_MAX - X_MIN))
const scaleY = (v: number) => toY((v - Y_MIN) / (Y_MAX - Y_MIN))

// Group means (computed from data): party≈0.79, doctrine≈0.64
const MX = 0.79, MY = 0.64

export function QuadrantChart({ data }: Props) {
  const [tip, setTip] = useState<TooltipState | null>(null)

  const points = data.map(s => ({
    ...s,
    ...computeFinalRates(s.seat_id),
  }))

  const ticks = (min: number, max: number, n: number) =>
    Array.from({ length: n }, (_, i) => min + (i / (n - 1)) * (max - min))

  const mx = scaleX(MX), my = scaleY(MY)

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        X axis: how often each justice votes with their appointing party (across all high/medium cases).
        Y axis: how often they vote aligned with the stated judicial doctrine.
        Reference lines at group mean. Dashed border shows axis domain.
      </p>
      <div className="relative" style={{ maxWidth: W }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible select-none">
          {/* Quadrant shading */}
          <rect x={PAD.left} y={PAD.top} width={mx - PAD.left} height={my - PAD.top}  fill="#f0fdf4" opacity={0.7} />
          <rect x={mx} y={PAD.top} width={W - PAD.right - mx} height={my - PAD.top}   fill="#fefce8" opacity={0.7} />
          <rect x={PAD.left} y={my} width={mx - PAD.left} height={H - PAD.bottom - my} fill="#f8fafc" opacity={0.7} />
          <rect x={mx} y={my} width={W - PAD.right - mx} height={H - PAD.bottom - my}  fill="#fef2f2" opacity={0.7} />

          {/* Quadrant labels */}
          <text x={PAD.left + 8} y={PAD.top + 16} fontSize={11} fill="#15803d" fontWeight={600}>↑ Doctrinal</text>
          <text x={W - PAD.right - 8} y={PAD.top + 16} textAnchor="end" fontSize={11} fill="#a16207" fontWeight={600}>Aligned ↑</text>
          <text x={PAD.left + 8} y={H - PAD.bottom - 8} fontSize={11} fill="#6b7280" fontWeight={600}>↓ Independent</text>
          <text x={W - PAD.right - 8} y={H - PAD.bottom - 8} textAnchor="end" fontSize={11} fill="#b91c1c" fontWeight={600}>Partisan ↓</text>

          {/* Outer border */}
          <rect x={PAD.left} y={PAD.top} width={iW} height={iH}
            fill="none" stroke="#d1d5db" strokeWidth={1} strokeDasharray="3 3" />

          {/* Reference lines (mean) */}
          <line x1={mx} y1={PAD.top} x2={mx} y2={H - PAD.bottom}
            stroke="#9ca3af" strokeDasharray="5 3" strokeWidth={1.5} />
          <line x1={PAD.left} y1={my} x2={W - PAD.right} y2={my}
            stroke="#9ca3af" strokeDasharray="5 3" strokeWidth={1.5} />
          <text x={mx + 3} y={PAD.top - 4} fontSize={10} fill="#9ca3af">mean</text>
          <text x={PAD.left - 3} y={my - 4} textAnchor="end" fontSize={10} fill="#9ca3af">mean</text>

          {/* X ticks */}
          {ticks(X_MIN, X_MAX, 6).map(v => (
            <g key={v}>
              <line x1={scaleX(v)} y1={H - PAD.bottom} x2={scaleX(v)} y2={H - PAD.bottom + 4} stroke="#6b7280" />
              <text x={scaleX(v)} y={H - PAD.bottom + 15} textAnchor="middle" fontSize={10} fill="#6b7280">
                {Math.round(v * 100)}%
              </text>
            </g>
          ))}
          {/* Y ticks */}
          {ticks(Y_MIN, Y_MAX, 6).map(v => (
            <g key={v}>
              <line x1={PAD.left - 4} y1={scaleY(v)} x2={PAD.left} y2={scaleY(v)} stroke="#6b7280" />
              <text x={PAD.left - 7} y={scaleY(v) + 4} textAnchor="end" fontSize={10} fill="#6b7280">
                {Math.round(v * 100)}%
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={12} fill="#374151" fontWeight={500}>
            Party Alignment Rate →
          </text>
          <text x={14} y={H / 2} textAnchor="middle" fontSize={12} fill="#374151" fontWeight={500}
            transform={`rotate(-90, 14, ${H / 2})`}>
            Doctrine Alignment Rate →
          </text>

          {/* Justice dots */}
          {points.map(s => {
            const cx = scaleX(s.party_rate)
            const cy = scaleY(s.doctrine_rate)
            const color = s.justice.appointing_party === 'R' ? '#dc2626' : '#2563eb'
            const lastName = s.justice.name.split(' ').slice(-1)[0]
            return (
              <g key={s.seat_id} style={{ cursor: 'default' }}
                onMouseEnter={e => {
                  const rect = (e.currentTarget.closest('svg')!).getBoundingClientRect()
                  setTip({
                    x: e.clientX - rect.left, y: e.clientY - rect.top,
                    svgX: cx, svgY: cy,
                    name: s.justice.name,
                    party: s.justice.appointing_party,
                    partyRate: s.party_rate,
                    doctrineRate: s.doctrine_rate,
                    partisan_index: s.partisan_index,
                    total_diagnostic_cases: s.total_diagnostic_cases,
                  })
                }}
                onMouseLeave={() => setTip(null)}
              >
                <circle cx={cx} cy={cy} r={18} fill={color} fillOpacity={0.1} />
                <circle cx={cx} cy={cy} r={9} fill={color} stroke="white" strokeWidth={2.5} />
                <text x={cx} y={cy - 15} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1f2937">
                  {lastName}
                </text>
              </g>
            )
          })}

          {/* Tooltip */}
          {tip && (() => {
            const tx = tip.svgX > W * 0.65 ? tip.svgX - 178 : tip.svgX + 14
            const ty = tip.svgY > H * 0.6  ? tip.svgY - 106 : tip.svgY + 8
            return (
              <g>
                <rect x={tx} y={ty} width={164} height={96} rx={6}
                  fill="white" stroke="#e5e7eb" strokeWidth={1}
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }} />
                <text x={tx + 10} y={ty + 18} fontSize={12} fontWeight={700} fill="#111827">{tip.name}</text>
                <text x={tx + 10} y={ty + 35} fontSize={11} fill="#6b7280">
                  Party align: {(tip.partyRate * 100).toFixed(1)}%
                </text>
                <text x={tx + 10} y={ty + 50} fontSize={11} fill="#6b7280">
                  Doctrine align: {(tip.doctrineRate * 100).toFixed(1)}%
                </text>
                <text x={tx + 10} y={ty + 65} fontSize={11} fill="#6b7280">
                  Partisan index: {(tip.partisan_index * 100).toFixed(1)}%
                </text>
                <text x={tx + 10} y={ty + 80} fontSize={11}
                  fill={tip.party === 'R' ? '#dc2626' : '#2563eb'}>
                  {tip.party === 'R' ? 'Republican' : 'Democrat'}-appointed
                </text>
              </g>
            )
          })()}
        </svg>

        {/* Legend */}
        <div className="flex gap-4 justify-center text-xs text-gray-500 mt-1">
          <span><span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-1" />Republican-appointed</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-1" />Democrat-appointed</span>
          <span className="text-gray-400">— dashed lines = group mean</span>
        </div>
      </div>
    </div>
  )
}
