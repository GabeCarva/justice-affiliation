import { Link } from 'react-router-dom'
import { namedScores, cases, doctrines } from '../lib/data'
import { classifyPartisanIndex } from '../lib/utils'

export function BlogPage() {
  const scores = namedScores()
  const highSignalCases = cases.filter(c => c.signal_level === 'high').slice(0, 4)

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-5xl font-serif font-semibold mb-4 leading-tight">
        Are Supreme Court Justices Ideological or Partisan?
      </h1>
      <p className="text-sm text-gray-500 mb-10">
        A structured analysis using 22 Supreme Court cases, 7 constitutional doctrines, and a blind scoring protocol.
      </p>

      <section className="prose prose-gray dark:prose-invert max-w-none">

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">The Question</h2>
        <p>
          When a Supreme Court justice rules in favor of the party that appointed them, does that reflect a principled
          commitment to judicial doctrine, or political loyalty? The question is harder than it seems. Conservative
          doctrines and Republican political interests often align. Liberal doctrines and Democratic political interests
          often align too. Most cases do not help us distinguish between the two explanations.
        </p>
        <p>
          The diagnostic cases are the rare ones where they diverge: where what the doctrine requires points in one
          direction, and what the appointing party wants points in the other. A justice who is genuinely principled
          should follow doctrine even when it conflicts with their appointing party. A partisan justice should follow
          their party even when doctrine cuts the other way. Only these divergence cases allow the distinction to be
          drawn.
        </p>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">The Test</h2>
        <p>
          We define a "partisan index" for each justice. It is a number between 0.0 and 1.0 computed only from
          diagnostic cases — cases where doctrine prediction and party-interest prediction disagree. A score of 0.0
          means the justice always follows doctrine when doctrine and party conflict. A score of 1.0 means the justice
          always follows party. A score near 0.5 means the justice's votes cannot be distinguished from coin flips
          in diagnostic situations.
        </p>
        <p>
          Cases are assigned a signal level — high, medium, or low — based on how clearly doctrine and party diverge.
          High-signal cases receive full weight (1.0x) in the scoring. Medium-signal cases receive half weight (0.5x).
          Low-signal cases are excluded from the partisan index calculation entirely.
        </p>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">The Method</h2>
        <p>
          To prevent analytical bias, this project uses a five-agent separation protocol. Doctrine definitions
          were written by an agent that knew no case names, justice names, or voting records. Party position mappings
          were written by an agent that knew only the abstract doctrine definitions. Cases were analyzed by an agent
          that classified votes by anonymized seat ID, never by justice name. Scores were computed by a fourth agent
          that received only the anonymized voting data. Only the final assembly stage joined the anonymized scores
          to the justice identities.
        </p>
        <p>
          Every assumption is documented and challengeable. See the{' '}
          <Link to="/methodology" className="underline">Methodology page</Link> for the full protocol.
        </p>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">The Doctrines</h2>
        <p>
          We tracked seven constitutional doctrines that are directly relevant to the major contested cases of the
          current court era, and where party positions have demonstrably shifted over time:
        </p>
        <ul>
          {doctrines.map(d => (
            <li key={d.id}>
              <strong>{d.name}</strong> — {d.key_question}
            </li>
          ))}
        </ul>
        <p>
          The doctrine definitions were designed to capture principled positions that a committed originalist and a
          committed living constitutionalist could both accept as fair characterizations. See the full definitions
          on the <Link to="/doctrines" className="underline">Doctrines page</Link>.
        </p>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">The Cases</h2>
        <p>
          We analyzed {cases.length} Supreme Court cases from 2012 through 2024. Here are four high-signal examples:
        </p>
        {highSignalCases.map(c => (
          <div key={c.id} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-6">
            <h3 className="font-semibold">{c.title} ({c.year})</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{c.description}</p>
            <p className="text-sm mt-2"><strong>Why diagnostic:</strong> {c.signal_explanation}</p>
            <p className="text-sm mt-1"><strong>Doctrine predicted:</strong> {c.doctrine_prediction}</p>
            <p className="text-sm mt-1"><strong>Republican interest predicted:</strong> {c.r_party_prediction}</p>
            <p className="text-sm mt-1"><strong>Democratic interest predicted:</strong> {c.d_party_prediction}</p>
          </div>
        ))}

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">The Scores</h2>
        <p>
          After applying the blind scoring algorithm, here are the partisan index scores for each current justice:
        </p>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Justice</th>
                <th className="text-left py-2 pr-4">Party</th>
                <th className="text-right py-2 pr-4">Partisan Index</th>
                <th className="text-right py-2">Classification</th>
              </tr>
            </thead>
            <tbody>
              {scores.map(s => {
                const { label } = classifyPartisanIndex(s.partisan_index)
                return (
                  <tr key={s.seat_id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium">{s.justice.name}</td>
                    <td className="py-2 pr-4 text-gray-500">{s.justice.appointing_party}</td>
                    <td className="py-2 pr-4 text-right font-mono">{(s.partisan_index * 100).toFixed(1)}%</td>
                    <td className="py-2 text-right text-gray-600">{label}{s.confidence === 'low' ? ' *' : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">* Low confidence — fewer than 2 weighted diagnostic cases</p>
        </div>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">The Counterarguments</h2>
        <p>
          This analysis has real limitations that readers should weigh:
        </p>
        <ul>
          <li>
            <strong>The movement-ideology confound.</strong> The conservative legal movement (Federalist Society) has
            genuinely advocated for many of the doctrinal positions that correlate with Republican political interests.
            A justice could sincerely believe in both originalism and Republican policy outcomes without being partisan.
            The partisan index cannot distinguish genuine doctrine adherence from ideology-based party loyalty.
          </li>
          <li>
            <strong>The small-N problem.</strong> With 22 cases and 7 doctrines, per-doctrine scores are based on
            very few data points. Small samples produce unstable estimates. A justice might appear highly partisan on
            agency deference based on 3-4 cases.
          </li>
          <li>
            <strong>Selection bias.</strong> We chose the cases. A different selection could produce different scores.
            All case assumptions are documented on the <Link to="/verify" className="underline">Verify page</Link>.
          </li>
          <li>
            <strong>The doctrine definition problem.</strong> Doctrine definitions are contested. If our definition
            of "executive restraint" is wrong, all scores for that doctrine are wrong. We attempted to use
            neutral definitions, but the attempt itself involved choices.
          </li>
        </ul>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">The Conclusion</h2>
        <p>
          The scores suggest a wide range of partisan orientation across the current court. Several justices show
          high partisan index scores — meaning that in the cases where doctrine and party diverged, they sided with
          party more often than doctrine. Others show the opposite pattern. The Chief Justice appears in the middle,
          consistent with his institutional role.
        </p>
        <p>
          What does this mean for the court's legitimacy? That depends on your baseline. If you believe the
          conservative legal movement's doctrinal positions are genuinely principled and the alignment with
          Republican outcomes is coincidental, the scores look less damning. If you believe doctrine is being
          selectively deployed to achieve preferred outcomes, the scores support that concern.
        </p>
        <p>
          The value of this framework is not the verdict. It is the structure: a set of documented assumptions,
          a transparent algorithm, and a reproducible process that anyone can challenge at the level of any
          individual assumption. If you disagree with a doctrine definition, change it and recompute.
          If you think a case was misclassified, document why. That is the point.
        </p>
      </section>

      <div className="mt-12 flex gap-4 text-sm">
        <Link to="/verify" className="underline text-gray-600 hover:text-gray-900">Trace any score</Link>
        <Link to="/methodology" className="underline text-gray-600 hover:text-gray-900">Full methodology</Link>
        <Link to="/" className="underline text-gray-600 hover:text-gray-900">Dashboard</Link>
      </div>
    </div>
  )
}
