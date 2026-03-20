import { useState } from 'react'
import { Link } from 'react-router-dom'
import { namedScores, doctrines, cases } from '../lib/data'
import { JusticeCard } from '../components/JusticeCard'
import { PartisanIndexChart } from '../components/Charts/PartisanIndexChart'
import { DoctrineHeatmap } from '../components/Charts/DoctrineHeatmap'
import { VoteMatrix } from '../components/Charts/VoteMatrix'
import type { NamedJusticeScore } from '../lib/types'

export function HomePage() {
  const scores = namedScores()
  const [selected, setSelected] = useState<NamedJusticeScore | null>(null)
  const [activeTab, setActiveTab] = useState<'scatter' | 'heatmap' | 'matrix'>('scatter')

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

      {/* Justice grid */}
      <section className="mb-12">
        <h2 className="text-xl font-serif font-semibold mb-1">Justices by Partisan Index</h2>
        <p className="text-sm text-gray-500 mb-4">
          Sorted by partisan index (highest first). Click a justice to filter charts.
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
      </section>

      {/* Charts */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-semibold">Charts</h2>
          <div className="flex gap-1 text-sm">
            {(['scatter', 'heatmap', 'matrix'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded ${
                  activeTab === tab
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'scatter' ? 'Overview' : tab === 'heatmap' ? 'By Doctrine' : 'Vote Matrix'}
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
