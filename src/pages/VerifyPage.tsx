import { useState, useMemo } from 'react'
import { namedScores, cases, doctrines } from '../lib/data'
import type { NamedJusticeScore, DiagnosticCase } from '../lib/types'
import { classifyPartisanIndex, getLastName, getPartisanIndexColor } from '../lib/utils'

const WEIGHT: Record<string, number> = { high: 1.0, medium: 0.5, low: 0.0 }

interface VoteContribution {
  caseTitle: string
  caseYear: number
  caseId: string
  signalLevel: string
  weight: number
  vote: string
  voteAlignsDoctrine: string
  voteAlignsParty: string
  partisanContrib: number
  doctrineContrib: number
  doctrineIds: string[]
}

function computeTrace(score: NamedJusticeScore, allCases: DiagnosticCase[]): VoteContribution[] {
  return allCases
    .filter(c => c.votes[score.seat_id] !== undefined)
    .map(c => {
      const vote = c.votes[score.seat_id]
      const weight = WEIGHT[c.signal_level] ?? 0
      const pa = vote.vote_aligns_with_appointer_party
      const da = vote.vote_aligns_with_doctrine
      let pContrib = 0
      let dContrib = 0
      if (pa === 'yes' && da === 'no') pContrib = 1.0 * weight
      else if (da === 'yes' && pa === 'no') dContrib = 1.0 * weight
      else if (pa === 'partial' && da === 'no') pContrib = 0.5 * weight
      else if (pa === 'no' && da === 'partial') dContrib = 0.5 * weight
      else if (pa === 'yes' && da === 'partial') pContrib = 0.5 * weight
      else if (pa === 'partial' && da === 'yes') dContrib = 0.5 * weight
      else if (pa === 'partial' && da === 'partial') { pContrib = 0.5 * weight; dContrib = 0.5 * weight }
      return {
        caseTitle: c.title,
        caseYear: c.year,
        caseId: c.id,
        signalLevel: c.signal_level,
        weight,
        vote: vote.vote,
        voteAlignsDoctrine: da,
        voteAlignsParty: pa,
        partisanContrib: pContrib,
        doctrineContrib: dContrib,
        doctrineIds: c.doctrine_ids,
      }
    })
}

function contribBg(p: number, d: number) {
  if (p > d) return '#fee2e2'
  if (d > p) return '#dbeafe'
  if (p === 0 && d === 0) return '#f9fafb'
  return '#fef9c3'
}

export function VerifyPage() {
  const scores = namedScores()
  const [selectedSeat, setSelectedSeat] = useState<string>(scores[0]?.seat_id ?? 'seat_1')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

  const score = scores.find(s => s.seat_id === selectedSeat)!
  const trace = useMemo(() => score ? computeTrace(score, cases) : [], [score])
  const selectedCase = selectedCaseId ? cases.find(c => c.id === selectedCaseId) : null

  const totalPartisan = trace.reduce((s, t) => s + t.partisanContrib, 0)
  const totalDoctrine = trace.reduce((s, t) => s + t.doctrineContrib, 0)
  const total = totalPartisan + totalDoctrine
  const computedIndex = total > 0 ? totalPartisan / total : 0.5

  // CSV export
  function exportCSV() {
    const headers = ['Case', 'Year', 'Signal', 'Weight', 'Vote', 'Aligns Doctrine', 'Aligns Party', 'Partisan Contrib', 'Doctrine Contrib']
    const rows = trace.map(t => [
      `"${t.caseTitle}"`, t.caseYear, t.signalLevel, t.weight,
      `"${t.vote}"`, t.voteAlignsDoctrine, t.voteAlignsParty,
      t.partisanContrib.toFixed(3), t.doctrineContrib.toFixed(3)
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scotus-${selectedSeat}-trace.csv`
    a.click()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-serif font-semibold mb-2">Verify Scores</h1>
      <p className="text-gray-500 mb-8">
        Trace any justice's partisan index back to the specific cases and votes that produced it.
        Every number is auditable.
      </p>

      {/* Justice selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">Select a justice</label>
        <div className="flex flex-wrap gap-2">
          {scores.map(s => (
            <button
              key={s.seat_id}
              onClick={() => { setSelectedSeat(s.seat_id); setSelectedCaseId(null) }}
              className={`px-3 py-2 rounded text-sm border transition-all ${
                selectedSeat === s.seat_id
                  ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              {getLastName(s.justice.name)}
              <span className="ml-1 text-xs opacity-70">({(s.partisan_index * 100).toFixed(0)}%)</span>
            </button>
          ))}
        </div>
      </div>

      {score && (
        <>
          {/* Score summary */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-semibold">{score.justice.name}</h2>
                <p className="text-sm text-gray-500">
                  Appointed {score.justice.year_appointed} by {score.justice.appointed_by} ({score.justice.appointing_party})
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold font-mono">{(computedIndex * 100).toFixed(1)}%</p>
                <p className="text-sm text-gray-500">{classifyPartisanIndex(computedIndex).label}</p>
                {score.confidence === 'low' && (
                  <p className="text-xs text-amber-600 mt-1">Low confidence</p>
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Partisan weighted score</p>
                <p className="font-semibold">{totalPartisan.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Doctrine weighted score</p>
                <p className="font-semibold">{totalDoctrine.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Total weight</p>
                <p className="font-semibold">{total.toFixed(3)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 font-mono">
              partisan_index = {totalPartisan.toFixed(3)} / ({totalPartisan.toFixed(3)} + {totalDoctrine.toFixed(3)}) = {computedIndex.toFixed(3)}
            </p>
            <button
              onClick={exportCSV}
              className="mt-3 text-xs underline text-gray-500 hover:text-gray-800"
            >
              Export raw data as CSV
            </button>
          </div>

          {/* Per-doctrine breakdown */}
          <h3 className="font-serif font-semibold text-lg mb-3">Score by Doctrine</h3>
          <div className="mb-8 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Doctrine</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-600">Partisan Index</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-600">Doctrinal Adherence</th>
                  <th className="text-right py-2 font-medium text-gray-600">Cases</th>
                </tr>
              </thead>
              <tbody>
                {doctrines.map(d => {
                  const pd = score.per_doctrine[d.id]
                  if (!pd) return (
                    <tr key={d.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-400">{d.name}</td>
                      <td className="py-2 pr-4 text-right text-gray-300">—</td>
                      <td className="py-2 pr-4 text-right text-gray-300">—</td>
                      <td className="py-2 text-right text-gray-300">0</td>
                    </tr>
                  )
                  const partisan = pd.partisan_index
                  const doctrinal = 1 - partisan
                  return (
                    <tr key={d.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium">{d.name}</td>
                      <td className="py-2 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${(partisan * 100).toFixed(0)}%`,
                                backgroundColor: getPartisanIndexColor(partisan),
                              }}
                            />
                          </div>
                          <span className="font-mono w-10 text-right">{(partisan * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${(doctrinal * 100).toFixed(0)}%` }}
                            />
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
            <p className="text-xs text-gray-400 mt-2">
              Doctrinal adherence = 1 − partisan index. Per-doctrine scores use the same diagnostic cases filtered by doctrine tag.
            </p>
          </div>

          {/* Case-by-case trace */}
          <h3 className="font-serif font-semibold text-lg mb-3">Case-by-Case Breakdown</h3>
          <div className="space-y-2 mb-8">
            {trace.map(t => (
              <div
                key={t.caseId}
                onClick={() => setSelectedCaseId(prev => prev === t.caseId ? null : t.caseId)}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:border-gray-400 transition-colors"
                style={{ backgroundColor: contribBg(t.partisanContrib, t.doctrineContrib) }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-medium text-sm">{t.caseTitle}</span>
                    <span className="text-gray-500 text-xs ml-2">({t.caseYear})</span>
                    <span className={`ml-2 text-xs font-medium uppercase ${
                      t.signalLevel === 'high' ? 'text-red-600' :
                      t.signalLevel === 'medium' ? 'text-amber-600' : 'text-gray-400'
                    }`}>
                      {t.signalLevel} (weight {t.weight})
                    </span>
                    {cases.find(c => c.id === t.caseId)?.methodological_note && (
                      <span className="ml-2 text-xs font-bold text-orange-600" title="Methodological flag — see case detail">⚑</span>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs font-mono">
                    {t.partisanContrib > 0 && (
                      <span className="text-red-700">+{t.partisanContrib.toFixed(2)} partisan</span>
                    )}
                    {t.doctrineContrib > 0 && (
                      <span className="text-blue-700">+{t.doctrineContrib.toFixed(2)} doctrine</span>
                    )}
                    {t.partisanContrib === 0 && t.doctrineContrib === 0 && (
                      <span className="text-gray-400">non-diagnostic</span>
                    )}
                  </div>
                </div>
                {selectedCaseId === t.caseId && (
                  <div className="mt-3 pt-3 border-t border-gray-300 text-sm text-gray-700 space-y-1">
                    <p><strong>Vote:</strong> {t.vote}</p>
                    <p><strong>Aligns with doctrine:</strong> {t.voteAlignsDoctrine}</p>
                    <p><strong>Aligns with appointing party:</strong> {t.voteAlignsParty}</p>
                    <p><strong>Doctrines:</strong> {t.doctrineIds.map(id => doctrines.find(d => d.id === id)?.name ?? id).join(', ')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Case detail panel */}
          {selectedCase && (
            <div className="border border-gray-300 dark:border-gray-600 rounded-xl p-6">
              <h3 className="font-serif font-semibold text-lg mb-1">{selectedCase.title} ({selectedCase.year})</h3>
              <p className="text-xs text-gray-500 mb-3">{selectedCase.scotus_citation}</p>
              <p className="text-sm mb-3">{selectedCase.factual_background}</p>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Doctrine prediction</p>
                  <p className="text-gray-600 dark:text-gray-400">{selectedCase.doctrine_prediction}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Signal explanation</p>
                  <p className="text-gray-600 dark:text-gray-400">{selectedCase.signal_explanation}</p>
                </div>
              </div>
              {selectedCase.assumptions.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-sm mb-1">Assumptions</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                    {selectedCase.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {selectedCase.counterarguments.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-sm mb-1">Counterarguments</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                    {selectedCase.counterarguments.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {selectedCase.methodological_note && (
                <div className="mt-4 border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950 rounded-lg p-3">
                  <p className="font-medium text-sm mb-1 text-orange-900 dark:text-orange-300">Methodological Flag</p>
                  <p className="text-sm text-orange-800 dark:text-orange-200">{selectedCase.methodological_note}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
