import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, Label
} from 'recharts'
import type { NamedJusticeScore } from '../../lib/types'
import { getPartyColor, getLastName, THRESHOLDS } from '../../lib/utils'

interface Props {
  data: NamedJusticeScore[]
}

interface ChartPoint {
  x: number
  y: number
  name: string
  party: 'R' | 'D'
  confidence: string
  partisan_index: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  const color = getPartyColor(payload.party)
  const opacity = payload.confidence === 'low' ? 0.4 : 1
  return (
    <g>
      <circle
        cx={cx} cy={cy} r={payload.confidence === 'low' ? 6 : 8}
        fill={color} fillOpacity={opacity}
        stroke="white" strokeWidth={2}
      />
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={11} fill="#374151">
        {getLastName(payload.name)}
      </text>
    </g>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as ChartPoint
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 shadow-lg text-sm">
      <p className="font-semibold">{d.name}</p>
      <p>Partisan index: {(d.partisan_index * 100).toFixed(1)}%</p>
      <p>Appointing party: {d.party === 'R' ? 'Republican' : 'Democrat'}</p>
      {d.confidence === 'low' && (
        <p className="text-amber-600 dark:text-amber-400 mt-1">* Low confidence (fewer cases)</p>
      )}
    </div>
  )
}

export function PartisanIndexChart({ data }: Props) {
  const chartData: ChartPoint[] = data.map((s, i) => ({
    x: i + 1,
    y: s.partisan_index,
    name: s.justice.name,
    party: s.justice.appointing_party,
    confidence: s.confidence,
    partisan_index: s.partisan_index,
  }))

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Each dot is a justice. Position on the vertical axis reflects the partisan index: higher means more votes
        aligned with appointing party over judicial doctrine in diagnostic cases. Color indicates appointing
        party (red = Republican, blue = Democrat). Faded dots have low confidence due to fewer qualifying cases.
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 30, right: 30, bottom: 40, left: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, data.length + 1]}
            tick={false}
            axisLine={false}
          >
            <Label value="Justices" offset={-10} position="insideBottom" />
          </XAxis>
          <YAxis
            dataKey="y"
            type="number"
            domain={[0, 1]}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
          >
            <Label value="Partisan Index" angle={-90} position="insideLeft" offset={-10} />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0.5} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: '50% (no votes = Mod. Partisan)', position: 'right', fontSize: 10 }} />
          <ReferenceLine y={THRESHOLDS.STRONGLY_PARTISAN}    stroke="#fca5a5" strokeDasharray="2 4" />
          <ReferenceLine y={THRESHOLDS.MODERATELY_DOCTRINAL} stroke="#9ca3af" strokeDasharray="2 4" />
          <Scatter data={chartData} shape={<CustomDot />}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getPartyColor(entry.party)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center text-xs text-gray-500 mt-2">
        <span><span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-1" />Republican-appointed</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-1" />Democrat-appointed</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-gray-400 mr-1 opacity-50" />Low confidence</span>
      </div>
    </div>
  )
}
