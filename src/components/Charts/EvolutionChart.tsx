import { useState, useCallback } from 'react'
import type { NamedJusticeScore } from '../../lib/types'
import { computeTrajectory } from '../../lib/trajectory'
import type { TrajectoryPoint } from '../../lib/trajectory'

interface Props { data: NamedJusticeScore[] }

interface TipState {
  mouseX: number; mouseY: number
  pt: TrajectoryPoint
  justiceName: string
  party: 'R' | 'D'
}

// Mini-chart dimensions
const W = 260, H = 210
const PAD = { top: 24, right: 16, bottom: 28, left: 32 }
const iW = W - PAD.left - PAD.right
const iH = H - PAD.top - PAD.bottom

// Fixed axis domain across all charts for comparability
const X_MIN = 0.55, X_MAX = 1.0
const Y_MIN = 0.45, Y_MAX = 0.85
const sx = (v: number) => PAD.left + ((v - X_MIN) / (X_MAX - X_MIN)) * iW
const sy = (v: number) => PAD.top  + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * iH

const CATEGORY_COLOR: Record<string, string> = {
  partisan: '#dc2626',  // red
  doctrine: '#2563eb',  // blue
  nondiag:  '#9ca3af',  // gray
  mixed:    '#7c3aed',  // purple
}

// Draw an arrowhead at point (x2,y2) pointing from (x1,y1)
function ArrowHead({ x1, y1, x2, y2, color }: { x1:number; y1:number; x2:number; y2:number; color:string }) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx*dx + dy*dy)
  if (len < 1) return null
  const ux = dx/len, uy = dy/len
  const sz = 5
  const lx = x2 - ux*sz, ly = y2 - uy*sz
  const perp = { x: -uy, y: ux }
  return (
    <polygon
      points={`${x2},${y2} ${lx + perp.x*sz*0.5},${ly + perp.y*sz*0.5} ${lx - perp.x*sz*0.5},${ly - perp.y*sz*0.5}`}
      fill={color} opacity={0.85}
    />
  )
}

interface MiniChartProps {
  score: NamedJusticeScore
  onHover: (tip: TipState | null) => void
}

function MiniChart({ score, onHover }: MiniChartProps) {
  const traj = computeTrajectory(score.seat_id)
  if (!traj.length) return null

  const partyColor = score.justice.appointing_party === 'R' ? '#dc2626' : '#2563eb'
  const lastName = score.justice.name.split(' ').slice(-1)[0]
  const final = traj[traj.length - 1]

  // Group mean reference lines
  const mx = sx(0.79), my = sy(0.64)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <marker id={`arr-${score.seat_id}`} markerWidth="6" markerHeight="6"
          refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#6b7280" opacity={0.6} />
        </marker>
      </defs>

      {/* Background quadrant shading */}
      <rect x={PAD.left} y={PAD.top} width={mx - PAD.left} height={my - PAD.top} fill="#f0fdf4" opacity={0.6} />
      <rect x={mx} y={PAD.top} width={W - PAD.right - mx} height={my - PAD.top}   fill="#fefce8" opacity={0.6} />
      <rect x={PAD.left} y={my} width={mx - PAD.left} height={H - PAD.bottom - my} fill="#f9fafb" opacity={0.6} />
      <rect x={mx} y={my} width={W - PAD.right - mx} height={H - PAD.bottom - my}  fill="#fef2f2" opacity={0.6} />

      {/* Border */}
      <rect x={PAD.left} y={PAD.top} width={iW} height={iH}
        fill="none" stroke="#e5e7eb" strokeWidth={1} />

      {/* Mean lines */}
      <line x1={mx} y1={PAD.top} x2={mx} y2={H - PAD.bottom}
        stroke="#d1d5db" strokeDasharray="3 2" strokeWidth={1} />
      <line x1={PAD.left} y1={my} x2={W - PAD.right} y2={my}
        stroke="#d1d5db" strokeDasharray="3 2" strokeWidth={1} />

      {/* Axis ticks (minimal) */}
      {[0.6, 0.7, 0.8, 0.9].map(v => (
        <g key={v}>
          <line x1={sx(v)} y1={H - PAD.bottom} x2={sx(v)} y2={H - PAD.bottom + 3} stroke="#9ca3af" />
          <text x={sx(v)} y={H - PAD.bottom + 11} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {Math.round(v * 100)}
          </text>
        </g>
      ))}
      {[0.5, 0.6, 0.7, 0.8].map(v => (
        <g key={v}>
          <line x1={PAD.left - 3} y1={sy(v)} x2={PAD.left} y2={sy(v)} stroke="#9ca3af" />
          <text x={PAD.left - 5} y={sy(v) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
            {Math.round(v * 100)}
          </text>
        </g>
      ))}

      {/* Trajectory segments */}
      {traj.map((pt, i) => {
        if (i === 0) return null
        const prev = traj[i - 1]
        const x1 = sx(prev.party_rate), y1 = sy(prev.doctrine_rate)
        const x2 = sx(pt.party_rate),   y2 = sy(pt.doctrine_rate)
        const color = CATEGORY_COLOR[pt.signal_category]
        const dx = x2 - x1, dy = y2 - y1
        const len = Math.sqrt(dx*dx + dy*dy)

        return (
          <g key={pt.case_id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color} strokeWidth={1.2} opacity={0.65} />
            {len > 3 && <ArrowHead x1={x1} y1={y1} x2={x2} y2={y2} color={color} />}
            {/* Invisible wide hit target */}
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="transparent" strokeWidth={8}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => {
                const svg = e.currentTarget.closest('svg')!.getBoundingClientRect()
                onHover({
                  mouseX: e.clientX - svg.left,
                  mouseY: e.clientY - svg.top,
                  pt,
                  justiceName: score.justice.name,
                  party: score.justice.appointing_party,
                })
              }}
              onMouseMove={e => {
                const svg = e.currentTarget.closest('svg')!.getBoundingClientRect()
                onHover({
                  mouseX: e.clientX - svg.left,
                  mouseY: e.clientY - svg.top,
                  pt,
                  justiceName: score.justice.name,
                  party: score.justice.appointing_party,
                })
              }}
              onMouseLeave={() => onHover(null)}
            />
          </g>
        )
      })}

      {/* Start dot (first point) */}
      {traj.length > 0 && (
        <circle
          cx={sx(traj[0].party_rate)} cy={sy(traj[0].doctrine_rate)}
          r={3} fill={partyColor} opacity={0.4}
        />
      )}

      {/* End dot (current position) */}
      <circle
        cx={sx(final.party_rate)} cy={sy(final.doctrine_rate)}
        r={6} fill={partyColor} stroke="white" strokeWidth={2}
      />
      <text
        x={sx(final.party_rate)} y={sy(final.doctrine_rate) - 10}
        textAnchor="middle" fontSize={10} fontWeight={700} fill={partyColor}
      >
        {lastName}
      </text>

      {/* Justice name header */}
      <text x={W / 2} y={14} textAnchor="middle" fontSize={11} fontWeight={700} fill="#111827">
        {score.justice.name}
      </text>
    </svg>
  )
}

function CaseTooltip({ tip, containerRef }: { tip: TipState; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const signalColors: Record<string,string> = {
    partisan: 'text-red-600', doctrine: 'text-blue-600', nondiag: 'text-gray-500', mixed: 'text-purple-600'
  }
  const signalLabels: Record<string,string> = {
    partisan: 'Partisan signal', doctrine: 'Doctrine signal',
    nondiag: 'Non-diagnostic', mixed: 'Mixed signal'
  }
  const dLabel = tip.pt.vote_aligns_with_doctrine === 'yes' ? '✓ doctrine' :
                 tip.pt.vote_aligns_with_doctrine === 'no'  ? '✗ doctrine' : '~ doctrine'
  const pLabel = tip.pt.vote_aligns_with_appointer_party === 'yes' ? '✓ party' :
                 tip.pt.vote_aligns_with_appointer_party === 'no'  ? '✗ party' : '~ party'

  // Determine tooltip placement relative to SVG container
  const container = containerRef.current
  const cw = container?.clientWidth ?? 900
  const left = tip.mouseX > cw * 0.55 ? undefined : tip.mouseX + 16
  const right = tip.mouseX > cw * 0.55 ? cw - tip.mouseX + 16 : undefined

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-xs"
      style={{
        top: Math.max(8, tip.mouseY - 20),
        left: left,
        right: right,
        width: 280,
        pointerEvents: 'none',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-semibold text-sm text-gray-900 leading-tight">{tip.pt.case_title}</span>
        <span className="ml-2 shrink-0 text-gray-400">{tip.pt.year}</span>
      </div>
      <div className={`text-xs font-semibold mb-1 ${signalColors[tip.pt.signal_category]}`}>
        {signalLabels[tip.pt.signal_category]}
        <span className="text-gray-400 font-normal ml-1">({tip.pt.signal_level} weight)</span>
      </div>
      <div className="flex gap-2 mb-2 text-gray-600">
        <span className={tip.pt.vote_aligns_with_doctrine === 'yes' ? 'text-blue-600' : tip.pt.vote_aligns_with_doctrine === 'no' ? 'text-red-500' : 'text-purple-500'}>
          {dLabel}
        </span>
        <span className="text-gray-300">·</span>
        <span className={tip.pt.vote_aligns_with_appointer_party === 'yes' ? 'text-green-600' : tip.pt.vote_aligns_with_appointer_party === 'no' ? 'text-orange-500' : 'text-purple-500'}>
          {pLabel}
        </span>
      </div>
      <p className="text-gray-600 mb-2 leading-relaxed">{tip.pt.vote_description}</p>
      <div className="border-t border-gray-100 pt-2 flex gap-3 text-gray-500">
        <span>Party → {(tip.pt.party_rate * 100).toFixed(1)}%
          {tip.pt.delta_party !== 0 && (
            <span className={tip.pt.delta_party > 0 ? 'text-red-500' : 'text-blue-500'}>
              {' '}{tip.pt.delta_party > 0 ? '+' : ''}{(tip.pt.delta_party * 100).toFixed(1)}%
            </span>
          )}
        </span>
        <span>Doctrine → {(tip.pt.doctrine_rate * 100).toFixed(1)}%
          {tip.pt.delta_doctrine !== 0 && (
            <span className={tip.pt.delta_doctrine > 0 ? 'text-blue-500' : 'text-red-500'}>
              {' '}{tip.pt.delta_doctrine > 0 ? '+' : ''}{(tip.pt.delta_doctrine * 100).toFixed(1)}%
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

export function EvolutionChart({ data }: Props) {
  const [tip, setTip] = useState<TipState | null>(null)
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) _containerRef.current = node
  }, [])
  const _containerRef = { current: null as HTMLDivElement | null }

  const handleHover = (t: TipState | null) => setTip(t)

  // Sort: R-appointed first (left to right as in the header bar), then D
  const sorted = [...data].sort((a, b) => {
    const pa = a.justice.appointing_party, pb = b.justice.appointing_party
    if (pa !== pb) return pa === 'R' ? -1 : 1
    return b.partisan_index - a.partisan_index
  })

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Each chart shows a justice's trajectory through the party/doctrine space as cases accumulate
        (chronological order left→right). Arrows are colored by vote type.
        <strong className="text-red-600"> Red</strong> = partisan signal,{' '}
        <strong className="text-blue-600"> blue</strong> = doctrine signal,{' '}
        <strong className="text-gray-500"> gray</strong> = non-diagnostic,{' '}
        <strong className="text-purple-600"> purple</strong> = mixed.
        Hover any arrow for case details.
      </p>
      <div
        ref={containerRef}
        className="relative"
        onMouseLeave={() => setTip(null)}
      >
        <div className="grid grid-cols-3 gap-3">
          {sorted.map(s => (
            <div key={s.seat_id}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-900">
              <MiniChart score={s} onHover={handleHover} />
            </div>
          ))}
        </div>

        {tip && <CaseTooltip tip={tip} containerRef={_containerRef} />}
      </div>
    </div>
  )
}
