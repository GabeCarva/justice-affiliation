import { useState } from 'react'
import { doctrines, doctrinePartyMap, cases } from '../lib/data'
import type { Doctrine } from '../lib/types'

export function DoctrinePage() {
  const [selected, setSelected] = useState<Doctrine>(doctrines[0])

  const mappings = doctrinePartyMap.filter(m => m.doctrine_id === selected.id)
  const relevantCases = cases.filter(c => c.doctrine_ids.includes(selected.id))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-serif font-semibold mb-2">Doctrine Definitions</h1>
      <p className="text-gray-500 mb-8">
        The seven constitutional doctrines tracked in this analysis. Definitions were written without reference
        to any justice names, cases, or party positions to prevent bias contamination.
      </p>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="md:w-56 flex-shrink-0">
          <ul className="space-y-1">
            {doctrines.map(d => (
              <li key={d.id}>
                <button
                  onClick={() => setSelected(d)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selected.id === d.id
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {d.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-serif font-semibold mb-1">{selected.name}</h2>
          <p className="text-xs text-gray-400 mb-4">ID: {selected.id}</p>

          <div className="space-y-5 text-sm">
            <div>
              <h3 className="font-semibold mb-1">Description</h3>
              <p className="text-gray-700 dark:text-gray-300">{selected.description}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Constitutional Basis</h3>
              <p className="text-gray-700 dark:text-gray-300">{selected.constitutional_basis}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Key Question</h3>
              <p className="text-gray-700 dark:text-gray-300 italic">{selected.key_question}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-1 text-red-800 dark:text-red-400">Principled Conservative Position</h3>
                <p className="text-gray-700 dark:text-gray-300">{selected.principled_conservative_position}</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-1 text-blue-800 dark:text-blue-400">Principled Liberal Position</h3>
                <p className="text-gray-700 dark:text-gray-300">{selected.principled_liberal_position}</p>
              </div>
            </div>

            <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg p-4">
              <h3 className="font-semibold mb-1 text-amber-900 dark:text-amber-300">Contested Aspects</h3>
              <p className="text-amber-800 dark:text-amber-200">{selected.contested_aspects}</p>
            </div>

            {/* Party position mappings */}
            {mappings.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Party Position by Period</h3>
                {mappings.map(m => (
                  <div key={m.party} className="mb-4">
                    <h4 className={`font-medium mb-2 ${m.party === 'R' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
                      {m.party === 'R' ? 'Republican' : 'Democrat'} Party Positions
                    </h4>
                    <div className="space-y-2">
                      {m.periods.map((p, i) => (
                        <div key={i} className="border border-gray-100 dark:border-gray-800 rounded p-3">
                          <p className="text-xs text-gray-500 mb-1">
                            {p.start_year}–{p.end_year ?? 'present'} &middot;{' '}
                            <span className={`font-medium ${
                              p.alignment_with_doctrine === 'aligned' ? 'text-green-700 dark:text-green-400' :
                              p.alignment_with_doctrine === 'opposed' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                            }`}>
                              {p.alignment_with_doctrine}
                            </span>
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">{p.practical_position}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cases using this doctrine */}
            {relevantCases.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Cases Involving This Doctrine ({relevantCases.length})</h3>
                <div className="space-y-2">
                  {relevantCases.map(c => (
                    <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{c.title} ({c.year})</span>
                        <span className={`text-xs font-medium uppercase ${
                          c.signal_level === 'high' ? 'text-red-600' :
                          c.signal_level === 'medium' ? 'text-amber-600' : 'text-gray-400'
                        }`}>
                          {c.signal_level} signal
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">{c.signal_explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
