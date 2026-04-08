import { Link } from 'react-router-dom'

export function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-serif font-semibold mb-3">Methodology</h1>
      <p className="text-gray-500 mb-10">
        How the partisan index is computed, and why the process is structured the way it is.
      </p>

      <div className="prose prose-gray dark:prose-invert max-w-none">

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">Core Principle</h2>
        <p>
          The only cases that contribute to a justice's partisan index are cases where the prediction
          from judicial doctrine and the prediction from appointing-party political interest diverge.
          Cases where doctrine and party align are non-diagnostic — they cannot distinguish genuine
          doctrine adherence from partisan loyalty.
        </p>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">The Scoring Algorithm</h2>
        <p>For each justice, in each qualifying case:</p>
        <ol>
          <li>
            A <strong>weight</strong> is assigned: 1.0 for high-signal cases, 0.5 for medium-signal, 0.0 for low-signal
            (excluded).
          </li>
          <li>
            If the justice voted with their appointing party AND against doctrine:{' '}
            <code>partisan_score += 1.0 × weight</code>
          </li>
          <li>
            If the justice voted with doctrine AND against their appointing party:{' '}
            <code>doctrine_score += 1.0 × weight</code>
          </li>
          <li>
            If both votes aligned, the case is non-diagnostic and contributes nothing.
          </li>
          <li>
            Partial alignment cases contribute 0.5 to the relevant score.
          </li>
        </ol>
        <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4 text-sm overflow-x-auto">
{`partisan_index = partisan_score / (partisan_score + doctrine_score)
confidence = "high" if total >= 4 else "medium" if total >= 2 else "low"`}
        </pre>
        <p>
          If a justice has no diagnostic cases (total = 0), the index defaults to 0.5 (indeterminate).
        </p>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">The Agent Separation Protocol</h2>
        <p>
          To prevent analytical bias, this project used a five-agent isolation protocol.
          Each agent received only the outputs of the agents before it — never any other context.
        </p>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-6">Agent</th>
                <th className="text-left py-2 pr-6">Receives</th>
                <th className="text-left py-2">Produces</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-6 font-medium">1 — Doctrine Architect</td>
                <td className="py-2 pr-6 text-gray-600">Nothing (abstract prompts only)</td>
                <td className="py-2">doctrines.json</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-6 font-medium">2 — Party Position Mapper</td>
                <td className="py-2 pr-6 text-gray-600">doctrines.json</td>
                <td className="py-2">doctrine-party-map.json</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-6 font-medium">3 — Case Analyst</td>
                <td className="py-2 pr-6 text-gray-600">doctrines.json + doctrine-party-map.json</td>
                <td className="py-2">cases.json (anonymized seat IDs)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-6 font-medium">4 — Blind Scorer</td>
                <td className="py-2 pr-6 text-gray-600">cases.json only</td>
                <td className="py-2">scores.json (no justice names)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-6 font-medium">5 — Assembler</td>
                <td className="py-2 pr-6 text-gray-600">All outputs + justice-seat-map.json</td>
                <td className="py-2">Complete application</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Agent 3 recorded votes by seat number (seat_1 through seat_9), not by justice name.
          Agent 4 never saw the seat-to-justice mapping. The mapping was only introduced in the final assembly.
        </p>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">Limitations</h2>
        <ul>
          <li>
            <strong>Selection bias:</strong> We chose cases from a curated set. Different cases would produce different scores.
          </li>
          <li>
            <strong>Small N:</strong> Per-doctrine scores are based on 2–16 cases. Treat them as suggestive, not definitive.
          </li>
          <li>
            <strong>Doctrine contestation:</strong> The definitions of "doctrine-aligned" are themselves contested.
          </li>
          <li>
            <strong>The ideology-partisanship confound:</strong> The framework cannot distinguish genuine originalist
            doctrine adherence from movement-conservative partisanship when they produce the same votes.
          </li>
          <li>
            <strong>Partial human context:</strong> The orchestrator agent coordinating the pipeline had full context,
            even if individual analysis agents did not. This is a structural limitation disclosed here.
          </li>
        </ul>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">What Explains the Liberal Outliers?</h2>
        <p>
          Sotomayor (73.5%), Kagan (69.1%), and Jackson (78.8%) score substantially higher partisan indices
          than Roberts (23.8%), Kavanaugh (23.4%), and Barrett (28.6%). The naive reading — that liberal
          justices are simply more partisan — deserves scrutiny. At least four structural factors inflate
          liberal scores independent of actual partisan behavior:
        </p>
        <ol>
          <li>
            <strong>Majority/minority asymmetry.</strong> Conservative justices currently hold a 6-3 majority.
            A majority justice must build coalitions across doctrinal sub-factions and occasionally compromise
            to hold five votes; this naturally produces some doctrine-over-party votes. A minority justice
            writing in dissent faces no coalition constraint and can vote her preferences cleanly. This
            systematically lowers partisan index for majority justices regardless of their actual commitments.
          </li>
          <li>
            <strong>Doctrinal baseline loading.</strong> Six of the nine doctrines in this project — executive
            restraint, agency deference, federalism, standing, presidential immunity, and nationwide
            injunctions — use the <em>current conservative position</em> as the principled baseline. These
            are precisely the doctrines on which conservatives recently won by constructing new positions
            (major questions doctrine, anti-Chevron, broad immunity). When "voting with doctrine" means
            "voting with the new conservative consensus," liberal justices who resist that consensus are
            scored partisan for disagreeing with positions that did not exist a decade ago.
          </li>
          <li>
            <strong>Precedent-fidelity conflated with partisanship.</strong> A justice who votes to preserve
            Chevron deference because it was settled, unanimously-decided law is exhibiting fidelity to
            precedent — itself a recognized judicial principle. The framework cannot distinguish "I'm
            following settled law" from "I'm voting partisan." Agency deference scores for liberal justices
            (Sotomayor 100%, Kagan 98%) are likely substantially inflated by this conflation.
          </li>
          <li>
            <strong>The gap is real but smaller than reported.</strong> After correcting for these structural
            factors, the actual partisan-behavior gap between liberal and conservative justices is real but
            significantly smaller than the raw numbers suggest — roughly half to one-quarter the size.
            Roberts, Kavanaugh, and Barrett have made genuine counter-partisan votes (Roberts in NFIB v.
            Sebelius and DHS v. Regents; all three on standing cases against Republican-aligned plaintiffs)
            that the framework correctly credits. The liberal justices have fewer such departures, and that
            difference is worth taking seriously even after correcting for structural inflation.
          </li>
        </ol>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">Framework Asymmetry</h2>
        <p>
          This project explicitly notes the asymmetric application of standing doctrine: conservative
          justices have applied strict standing to liberal-aligned plaintiffs while permitting broad standing
          for conservative-aligned plaintiffs. That asymmetry is documented and affects scoring.
        </p>
        <p>
          An analogous asymmetry on the conservative side is not currently flagged: the selective application
          of originalism. Several conservative justices demand strict textual fidelity in administrative law
          cases but have employed "history and tradition" analysis in substantive due process cases
          (including <em>Dobbs v. Jackson Women's Health</em> and <em>Bruen</em>) — a methodology that has
          no textual basis in the Constitution and would be unrecognizable to the originalists who developed
          the theory. Measuring consistency of stated interpretive method across doctrinal contexts is a
          meta-level analysis this project does not currently perform. A complete account of principled
          versus partisan behavior would need to address it.
        </p>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">What's Missing</h2>
        <p>
          Three additional doctrinal areas would substantially improve the framework's completeness and
          its ability to test whether justices apply their professed methodology even when it hurts:
        </p>
        <ul>
          <li>
            <strong>First Amendment.</strong> Cases where conservative doctrine (broad speech protection,
            anti-compelled speech, viewpoint neutrality) cuts against conservative political outcomes are
            among the most diagnostic in the entire corpus. <em>Snyder v. Phelps</em> — Westboro Baptist
            picketing military funerals — required justices to protect deeply offensive anti-military speech
            to be faithful to First Amendment doctrine. <em>United States v. Alvarez</em> required
            protecting lies about military service. These cases test whether conservative justices apply
            their stated doctrine when it protects speech they find repugnant — the gold standard for
            identifying genuine methodological commitment.
          </li>
          <li>
            <strong>Equal Protection.</strong> The transformation of the Equal Protection Clause from an
            anti-subordination principle into an anti-classification principle — culminating in{' '}
            <em>Students for Fair Admissions v. Harvard</em> (2023) — is the single most consequential
            doctrinal reorientation of the Roberts Court era. The conservative anti-classification position
            and liberal anti-subordination position are reasonably articulable and produce clear diagnostic
            cases. Omitting this doctrine leaves a central battlefield unscored.
          </li>
          <li>
            <strong>Criminal Procedure.</strong> The Fourth and Sixth Amendments occasionally produce
            counter-partisan votes — Gorsuch has sided with criminal defendants in Sixth Amendment
            confrontation-clause and Fourth Amendment cases in ways that diverge from typical Republican
            law-enforcement priorities. These diagnostic votes are currently excluded from scoring entirely,
            likely undercounting genuine doctrine-over-party behavior among conservative justices.
          </li>
        </ul>

        <h2 className="font-serif text-2xl font-semibold mt-10 mb-4">How to Reproduce This Analysis</h2>
        <ol>
          <li>Clone the repository from GitHub.</li>
          <li>Inspect <code>src/data/doctrines.json</code>, <code>doctrine-party-map.json</code>, and <code>cases.json</code>.</li>
          <li>
            Run the scoring algorithm yourself: the same TypeScript implementation used in this app is in{' '}
            <code>src/lib/scoring.ts</code>. It is also available as a script at <code>scripts/verify_blind_scoring.ts</code>.
          </li>
          <li>
            To challenge a classification, edit the relevant JSON file and re-run the scorer. The{' '}
            <Link to="/verify" className="underline">Verify Scores</Link> page shows the full trace for any justice and case.
          </li>
        </ol>

        <p className="mt-8 text-sm text-gray-500">
          Full documentation files are in the <code>docs/</code> directory of the repository.
        </p>
      </div>
    </div>
  )
}
