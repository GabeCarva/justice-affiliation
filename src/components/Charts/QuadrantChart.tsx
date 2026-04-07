import { useState } from 'react'
import type { NamedJusticeScore } from '../../lib/types'
import { computeFinalRates } from '../../lib/trajectory'
import { computePriorAdjustedPoints } from '../../lib/priors'
import { getLastName } from '../../lib/utils'

interface Props { data: NamedJusticeScore[] }

interface TooltipState {
  x: number; y: number; svgX: number; svgY: number
  seat_id: string; name: string; party: 'R' | 'D'
  partyRate: number; doctrineRate: number
  partisan_index: number; total_diagnostic_cases: number
}

const W = 580, H = 460
const PAD = { top: 44, right: 44, bottom: 58, left: 64 }
const iW = W - PAD.left - PAD.right
const iH = H - PAD.top - PAD.bottom

const toX = (v: number) => PAD.left + v * iW
const toY = (v: number) => PAD.top + (1 - v) * iH

export function QuadrantChart({ data }: Props) {
  const [tip, setTip] = useState<TooltipState | null>(null)
  const [showAdjusted, setShowAdjusted] = useState(false)

  const adjustedMap = Object.fromEntries(
    computePriorAdjustedPoints().map(p => [p.seat_id, p])
  )

  const points = data.map(s => ({
    ...s,
    ...computeFinalRates(s.seat_id),
  }))

  // Compute axis bounds from actual data with padding (updates automatically as scores change)
  const allParty = points.map(p => p.party_rate)
  const allDoc   = points.map(p => p.doctrine_rate)
  const snap = (v: number, dir: 'floor' | 'ceil') =>
    (dir === 'floor' ? Math.floor : Math.ceil)(v * 20) / 20  // snap to nearest 0.05
  const X_MIN = Math.max(0,   snap(Math.min(...allParty) - 0.05, 'floor'))
  const X_MAX = Math.min(1,   snap(Math.max(...allParty) + 0.03, 'ceil'))
  const Y_MIN = Math.max(0,   snap(Math.min(...allDoc)   - 0.05, 'floor'))
  const Y_MAX = Math.min(1,   snap(Math.max(...allDoc)   + 0.05, 'ceil'))

  const scaleX = (v: number) => toX((v - X_MIN) / (X_MAX - X_MIN))
  const scaleY = (v: number) => toY((v - Y_MIN) / (Y_MAX - Y_MIN))

  // Compute group means from data
  const MX = allParty.reduce((s, v) => s + v, 0) / allParty.length
  const MY = allDoc.reduce((s, v) => s + v, 0)   / allDoc.length

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
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#6b7280" />
            </marker>
          </defs>
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

          {/* Prior-adjusted ghost circles and arrows */}
          {showAdjusted && points.map(s => {
            const adj = adjustedMap[s.seat_id]
            if (!adj || adj.adjustment_count === 0) return null
            const cx = scaleX(s.party_rate)
            const cy = scaleY(s.doctrine_rate)
            const gx = scaleX(adj.adjusted_party_rate)
            const gy = scaleY(adj.adjusted_doctrine_rate)
            // Arrow from ghost → actual (shows how actual departs from prior-consistent position)
            const dx = cx - gx, dy = cy - gy
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len < 2) return null
            const ux = dx / len, uy = dy / len
            // Shorten arrow endpoints so they don't overlap the circles
            const x1 = gx + ux * 10, y1 = gy + uy * 10
            const x2 = cx - ux * 10, y2 = cy - uy * 10
            return (
              <g key={`adj-${s.seat_id}`} style={{ pointerEvents: 'none' }}>
                <circle cx={gx} cy={gy} r={9} fill="none" stroke="#6b7280" strokeWidth={2} strokeDasharray="3 2" />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6b7280" strokeWidth={1.5}
                  markerEnd="url(#arrowhead)" />
              </g>
            )
          })}

          {/* Justice dots */}
          {points.map(s => {
            const cx = scaleX(s.party_rate)
            const cy = scaleY(s.doctrine_rate)
            const color = s.justice.appointing_party === 'R' ? '#dc2626' : '#2563eb'
            const lastName = getLastName(s.justice.name)
            const adj = adjustedMap[s.seat_id]
            return (
              <g key={s.seat_id} style={{ cursor: 'default' }}
                onMouseEnter={e => {
                  const rect = (e.currentTarget.closest('svg')!).getBoundingClientRect()
                  setTip({
                    x: e.clientX - rect.left, y: e.clientY - rect.top,
                    svgX: cx, svgY: cy,
                    seat_id: s.seat_id,
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
                {showAdjusted && adj && adj.adjustment_count > 0 && (
                  <text x={cx} y={cy + 22} textAnchor="middle" fontSize={9} fill="#6b7280">
                    {adj.adjustment_count}adj
                  </text>
                )}
              </g>
            )
          })}

          {/* Tooltip */}
          {tip && (() => {
            const tx = tip.svgX > W * 0.65 ? tip.svgX - 178 : tip.svgX + 14
            const ty = tip.svgY > H * 0.6  ? tip.svgY - 106 : tip.svgY + 8
            return (
              <g>
                <rect x={tx} y={ty} width={196} height={110} rx={6}
                  fill="white" stroke="#e5e7eb" strokeWidth={1}
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }} />
                <text x={tx + 10} y={ty + 18} fontSize={12} fontWeight={700} fill="#111827">{tip.name}</text>
                <text x={tx + 10} y={ty + 35} fontSize={10} fill="#9ca3af">All high/med cases, signal-weighted</text>
                <text x={tx + 10} y={ty + 51} fontSize={11} fill="#6b7280">
                  {(() => {
                    const adj = showAdjusted ? adjustedMap[tip.seat_id] : null
                    const base = `Party rate: ${(tip.partyRate * 100).toFixed(1)}%`
                    if (!adj || adj.adjustment_count === 0) return base
                    return `${base} → ${(adj.adjusted_party_rate * 100).toFixed(1)}% (prior-adj)`
                  })()}
                </text>
                <text x={tx + 10} y={ty + 66} fontSize={11} fill="#6b7280">
                  Doctrine rate: {(tip.doctrineRate * 100).toFixed(1)}%
                </text>
                <text x={tx + 10} y={ty + 81} fontSize={11} fill="#6b7280">
                  Partisan index: {(tip.partisan_index * 100).toFixed(1)}% (diagnostic only)
                </text>
                <text x={tx + 10} y={ty + 96} fontSize={11}
                  fill={tip.party === 'R' ? '#dc2626' : '#2563eb'}>
                  {tip.party === 'R' ? 'Republican' : 'Democrat'}-appointed
                </text>
              </g>
            )
          })()}
        </svg>

        {/* Toggle + Legend */}
        <div className="flex flex-wrap gap-4 justify-center items-center text-xs text-gray-500 mt-2">
          <span><span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-1" />Republican-appointed</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-1" />Democrat-appointed</span>
          <span className="text-gray-400">— dashed lines = group mean</span>
          <button
            onClick={() => setShowAdjusted(v => !v)}
            className={`ml-2 px-3 py-1 rounded border text-xs font-medium transition-colors ${
              showAdjusted
                ? 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
            }`}
          >
            {showAdjusted ? '◎ Prior-adjusted on' : '◎ Show prior-adjusted'}
          </button>
        </div>
        {showAdjusted && (
          <p className="text-xs text-gray-400 text-center mt-1 max-w-lg mx-auto">
            Dashed circle = where each justice would plot if they had voted consistently with their stated prior.
            Arrow points toward actual position. Larger gap = more departure from stated philosophy.
            Count below name = cases adjusted.
          </p>
        )}
      </div>
    </div>
  )
}
