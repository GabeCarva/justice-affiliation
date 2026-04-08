import { useState } from 'react'
import { Link } from 'react-router-dom'
import { namedScores, doctrines, cases } from '../lib/data'
import { JusticeCard } from '../components/JusticeCard'
import { PartisanIndexChart } from '../components/Charts/PartisanIndexChart'
import { DoctrineHeatmap } from '../components/Charts/DoctrineHeatmap'
import { VoteMatrix } from '../components/Charts/VoteMatrix'
import { TensionScatter } from '../components/Charts/TensionScatter'
import { RunningPartisanChart } from '../components/Charts/RunningPartisanChart'
import type { NamedJusticeScore } from '../lib/types'
import { getLastName, getPartisanIndexColor } from '../lib/utils'

export function HomePage() {
  const scores = namedScores()
  const [selected, setSelected] = useState<NamedJusticeScore | null>(null)
  const [activeTab, setActiveTab] = useState<'scatter' | 'heatmap' | 'matrix' | 'tension' | 'running'>('tension')

  // Summary stats
  const mostPartisan = scores[0]
  const leastPartisan = scores[scores.length - 1]
  const avgPartisan = scores.reduce((s, x) => s + x.partisan_index, 0) / scores.length
  const totalCases = cases.length
  const highCases = cases.filter(c => c.signal_level === 'high').length

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-serif font-semibold mb-3">
          SCOTUS Partisan Index
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
          A nonpartisan framework that measures whether Supreme Court justices vote
          according to judicial doctrine or appointing-party interest. Only cases
          where doctrine and party diverge are used for scoring.
        </p>
        <div className="flex gap-3 mt-4 text-sm">
          <Link to="/methodology" className="underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            How it works
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/verify" className="underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            Verify any score
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/blog" className="underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            Full analysis
          </Link>
        </div>
      </div>

      {/* Summary stats strip */}
      <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Cases analyzed', value: totalCases.toString(), sub: `${highCases} high-signal` },
          { label: 'Most partisan', value: mostPartisan ? getLastName(mostPartisan.justice.name) : '—', sub: `${((mostPartisan?.partisan_index ?? 0)*100).toFixed(0)}% partisan index` },
          { label: 'Least partisan', value: leastPartisan ? getLastName(leastPartisan.justice.name) : '—', sub: `${((leastPartisan?.partisan_index ?? 0)*100).toFixed(0)}% partisan index` },
          { label: 'Court average', value: `${(avgPartisan*100).toFixed(0)}%`, sub: 'mean partisan index' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-serif font-semibold">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </section>

      {/* Justice grid */}
      <section className="mb-12">
        <h2 className="text-xl font-serif font-semibold mb-1">Justices by Partisan Index</h2>
        <p className="text-sm text-gray-500 mb-4">
          Sorted by partisan index (highest first). Click a justice to see per-doctrine breakdown.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {scores.map(s => (
            <JusticeCard
              key={s.seat_id}
              score={s}
              selected={selected?.seat_id === s.seat_id}
              onClick={() => setSelected(prev => prev?.seat_id === s.seat_id ? null : s)}
            />
          ))}
        </div>

        {/* Per-doctrine detail panel */}
        {selected && (
          <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-semibold text-lg">
                {selected.justice.name} — Per-Doctrine Scores
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-6 font-medium text-gray-600 dark:text-gray-400">Doctrine</th>
                    <th className="text-right py-2 pr-6 font-medium text-gray-600 dark:text-gray-400">Partisan Index</th>
                    <th className="text-right py-2 pr-6 font-medium text-gray-600 dark:text-gray-400">Doctrinal Adherence</th>
                    <th className="text-right py-2 font-medium text-gray-600 dark:text-gray-400">Cases</th>
                  </tr>
                </thead>
                <tbody>
                  {doctrines.map(d => {
                    const pd = selected.per_doctrine[d.id]
                    if (!pd) return (
                      <tr key={d.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-6 text-gray-400">{d.name}</td>
                        <td className="py-2 pr-6 text-right text-gray-300">—</td>
                        <td className="py-2 pr-6 text-right text-gray-300">—</td>
                        <td className="py-2 text-right text-gray-300">0</td>
                      </tr>
                    )
                    const partisan = pd.partisan_index
                    const doctrinal = 1 - partisan
                    return (
                      <tr key={d.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-6 font-medium">{d.name}</td>
                        <td className="py-2 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${(partisan * 100).toFixed(0)}%`,
                                  backgroundColor: getPartisanIndexColor(partisan, selected.justice.appointing_party),
                                }}
                              />
                            </div>
                            <span className="font-mono w-10 text-right">{(partisan * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="py-2 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-gray-400"
                                style={{ width: `${(doctrinal * 100).toFixed(0)}%` }} />
                            </div>
                            <span className="font-mono w-10 text-right">{(doctrinal * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="py-2 text-right text-gray-500">{pd.cases_evaluated}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Doctrinal adherence = 1 − partisan index for each doctrine. Low case counts produce less reliable per-doctrine scores.
              <Link to="/verify" className="underline ml-1">Full trace →</Link>
            </p>
          </div>
        )}
      </section>

      {/* Charts */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-semibold">Charts</h2>
          <div className="flex gap-1 text-sm flex-wrap">
            {([
              ['tension',  'Tension Scatter'],
              ['running',  'Running Index'],
              ['scatter',   'Ranking'],
              ['heatmap',   'By Doctrine'],
              ['matrix',    'Vote Matrix'],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded ${
                  activeTab === tab
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          {activeTab === 'scatter' && (
            <>
              <h3 className="font-serif font-semibold mb-2">Partisan Index by Justice</h3>
              <PartisanIndexChart data={scores} />
            </>
          )}
          {activeTab === 'heatmap' && (
            <>
              <h3 className="font-serif font-semibold mb-2">Doctrine Breakdown Heatmap</h3>
              <DoctrineHeatmap scores={scores} doctrines={doctrines} />
            </>
          )}
          {activeTab === 'matrix' && (
            <>
              <h3 className="font-serif font-semibold mb-2">Case-Level Vote Matrix</h3>
              <VoteMatrix cases={cases} scores={scores} />
            </>
          )}
          {activeTab === 'tension' && (
            <>
              <h3 className="font-serif font-semibold mb-1">Diagnostic Tension Scatter</h3>
              <p className="text-sm text-gray-500 mb-4">
                The X axis shows how often each justice faced cases where party and doctrine pointed in
                opposite directions — the only cases that reveal a genuine preference. The Y axis is the
                partisan index: among those forced choices, how often did they side with their appointing
                party over doctrine? Non-diagnostic cases (where party and doctrine agreed) are excluded from
                both axes.
              </p>
              <TensionScatter data={scores} />
            </>
          )}
          {activeTab === 'running' && (
            <>
              <h3 className="font-serif font-semibold mb-1">Running Partisan Index Over Time</h3>
              <p className="text-sm text-gray-500 mb-4">
                Shows how each justice's partisan index accumulates chronologically, using only diagnostic
                cases where party and doctrine genuinely conflicted. A rising line means partisan votes
                dominate; a falling line means doctrinal votes. Non-diagnostic cases are invisible here —
                they don't move the index in either direction.
              </p>
              <RunningPartisanChart data={scores} />
            </>
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-xl p-5 text-sm">
        <h3 className="font-semibold mb-2">Assumptions and Limitations</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
          <li>Only cases where doctrine and party-interest diverge are scored. Agreement cases are non-diagnostic.</li>
          <li>Party positions are documented by time period; a justice's "appointing party" reflects the dominant position of that party during the relevant term.</li>
          <li>All doctrine definitions and case classifications were made independently by separate analytical agents. See <Link to="/methodology" className="underline">Methodology</Link>.</li>
          <li>Justice Jackson (seat 9) has low confidence due to fewer qualifying cases (joined the court in 2022).</li>
          <li>This framework measures departures from stated doctrine, not correctness. A justice could be consistently wrong on doctrine without appearing partisan.</li>
        </ul>
        <p className="mt-3 text-gray-500">
          <Link to="/verify" className="underline">Trace any score back to the underlying cases and assumptions.</Link>
        </p>
      </section>
    </div>
  )
}
