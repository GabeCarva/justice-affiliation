# SCOTUS Partisan vs. Ideology Analyzer

## Project Overview

Build a data-driven web application that tests whether US Supreme Court justices vote based on consistent judicial doctrine or based on the policy preferences of the political party that appointed them. The app identifies cases where doctrine and party interest *diverge* — these are the only diagnostically useful cases — and scores each justice on how often they follow doctrine vs. party in those cases.

The core insight: most SCOTUS cases are non-diagnostic because ideology and party interest point the same direction. A conservative originalist opposing a liberal regulatory expansion tells you nothing — both doctrine and party predict the same vote. The signal comes from cases where doctrine and party *conflict*: does a justice who claims to limit executive power actually limit it when their party holds the presidency? Does a justice who defends congressional spending authority defend it when their party's president is the one spending?

---

## CRITICAL: Agent Separation Protocol

This project uses multiple isolated Claude Code agent sessions to prevent bias contamination. **No single agent should have access to both the analytical framework AND the justice-level voting data.** The reasoning: if the agent defining doctrines can see how justices voted, it may unconsciously define doctrines to produce a desired result. If the agent scoring justices can see their names and appointing party, it may unconsciously shade its interpretation.

### Agent Roles and Isolation Rules

#### Agent 1: Doctrine Architect
**Purpose:** Define judicial doctrines, describe what each doctrine means, and document what a principled adherent of each doctrine would do in abstract scenarios.

**Has access to:**
- Constitutional law textbooks, legal scholarship, Federalist Society and ACS publications
- Historical descriptions of judicial philosophies (originalism, textualism, living constitutionalism, etc.)
- Abstract legal questions (e.g., "Can the executive spend money Congress did not appropriate?")

**Does NOT have access to:**
- Any specific case names, outcomes, or votes
- Any justice names or voting records
- Any party-specific framing (questions should be posed neutrally)
- Output from any other agent

**Produces:** `doctrines.json` — pure doctrinal definitions with no reference to specific cases or justices.

**Validation:** A human reviewer should confirm that doctrine definitions are neutral, internally consistent, and would be recognized by legal scholars as fair characterizations regardless of political leaning. Ideally, have someone with conservative legal sympathies and someone with liberal legal sympathies both review the definitions for fairness.

---

#### Agent 2: Party Position Mapper
**Purpose:** Map how each political party's *practical policy position* on each doctrine has shifted over time.

**Has access to:**
- `doctrines.json` (output from Agent 1)
- Party platforms, congressional voting records, presidential policy statements
- Political science research on party position shifts
- News coverage of party policy positions by era

**Does NOT have access to:**
- Any Supreme Court case outcomes or justice votes
- Any justice names or judicial records
- Output from Agents 3, 4, or 5

**Produces:** `doctrine-party-map.json` — a time-series mapping of where R and D stood on each doctrine during each period, with cited evidence.

**Key requirement:** This agent must document *shifts* in party position over time. For example, the Republican Party's position on executive power shifted from "restrain" (Obama era) to "expand" (Trump era). The Democratic Party's position on congressional spending authority was "defend" against Republican presidents but "flexible" when Biden spent via executive action. Each shift must be documented with specific evidence (platform language, legislative votes, presidential statements).

**Validation:** A human reviewer should check that party position mappings are supported by cited evidence and would be recognized as accurate by political scientists regardless of their own political orientation.

---

#### Agent 3: Case Analyst
**Purpose:** Identify Supreme Court cases that are diagnostically useful — meaning the doctrine prediction and the party-interest prediction *diverge* — and record the factual outcome of each case.

**Has access to:**
- `doctrines.json` (output from Agent 1)
- `doctrine-party-map.json` (output from Agent 2)
- Supreme Court case opinions, oral argument transcripts, SCOTUSblog analysis
- Legal scholarship analyzing specific cases

**Does NOT have access to:**
- Output from Agent 4 or Agent 5
- Any pre-existing partisan scoring or ideological ratings of justices

**Produces:** `cases.json` — each case tagged with which doctrines it tests, what a doctrinal adherent would predict, what party interest would predict, the diagnostic signal level, and the raw vote outcome for each seat.

**Critical rule on vote recording:** Votes in `cases.json` must be recorded by **seat number or anonymized ID**, not by justice name. The mapping from seat to justice name lives in a separate file (`justice-seat-map.json`) that Agent 4 never sees. This ensures the scoring agent cannot be biased by knowing whose votes it is evaluating.

**Vote recording format:**
```json
{
  "votes": {
    "seat_1": { "vote": "allow", "vote_direction_vs_doctrine": "against", "vote_direction_vs_party_of_appointer": "aligned" },
    "seat_2": { "vote": "block", "vote_direction_vs_doctrine": "consistent", "vote_direction_vs_party_of_appointer": "against" }
  }
}
```

The `vote_direction_vs_doctrine` and `vote_direction_vs_party_of_appointer` fields are determined by comparing the vote against the predictions from `doctrines.json` and `doctrine-party-map.json`. The agent performing this comparison does not need to know which justice occupies which seat.

**Validation:** A human reviewer should confirm that the doctrine-prediction and party-prediction for each case are reasonable, that the signal level classification is defensible, and that vote recording is factually accurate against the case record.

---

#### Agent 4: Blind Scorer
**Purpose:** Score each seat's voting record across diagnostic cases. Produce a partisan index for each seat.

**Has access to:**
- `cases.json` with anonymized seat IDs (output from Agent 3)
- The scoring algorithm (defined below)

**Does NOT have access to:**
- `justice-seat-map.json` (does not know which justice is which seat)
- `justices.json` (does not know names, appointing party, or stated philosophy)
- Output from any other agent except the case data

**Produces:** `scores.json` — a partisan index score for each anonymized seat, plus per-doctrine breakdowns.

**Scoring algorithm:**
```
For each seat:
  For each high-signal diagnostic case where this seat voted:
    If vote aligned with party interest AND against doctrine: partisan_score += 1.0
    If vote aligned with party interest AND with doctrine: score += 0 (non-diagnostic)
    If vote aligned with doctrine AND against party interest: doctrine_score += 1.0
    If vote was mixed/partial: partisan_score += 0.5, doctrine_score += 0.5

  partisan_index = partisan_score / (partisan_score + doctrine_score)
  // 1.0 = pure partisan, 0.0 = pure doctrine, 0.5 = indeterminate
```

For medium-signal cases, apply 0.5x weight. Low-signal cases are excluded from scoring.

**Validation:** A human reviewer should run the algorithm manually on a sample of cases to confirm the automated scoring matches.

---

#### Agent 5: Assembler and Visualization Builder
**Purpose:** Combine all outputs, de-anonymize seats, build the frontend, generate charts, and write the blog post.

**Has access to:**
- All outputs from Agents 1-4
- `justice-seat-map.json` (to de-anonymize)
- `justices.json` (justice metadata)

**This is the ONLY agent that sees the complete picture.** It must not modify any scores, doctrine definitions, or case classifications. It assembles, visualizes, and narrates.

**Produces:** The complete React application, all charts, the blog post, and the methodology documentation.

---

### Agent Execution Order

```
Agent 1 (Doctrine Architect)
    │
    ▼
Agent 2 (Party Position Mapper)  ← receives doctrines.json
    │
    ▼
Agent 3 (Case Analyst)          ← receives doctrines.json + doctrine-party-map.json
    │
    ▼
Agent 4 (Blind Scorer)          ← receives cases.json (anonymized seats only)
    │
    ▼
Agent 5 (Assembler)             ← receives ALL outputs + justice-seat-map.json
```

Each agent runs in a **separate Claude Code session** with only its permitted inputs. Do not run multiple agents in the same session. Do not copy-paste context between sessions beyond the specified output files.

---

## Architecture

### Deployment Target
- Static site deployed to GitHub Pages (React + Vite)
- Blog post rendered as a page within the app (not a separate site)
- All data is static JSON — no backend
- CI/CD via GitHub Actions: push to main deploys to Pages

### Tech Stack
- React 18+ with TypeScript
- Vite for build
- Recharts or D3.js for visualizations
- TailwindCSS for styling (editorial aesthetic — clean, typographic, not flashy)
- GitHub Pages for hosting
- No database — all data lives in typed JSON files in `/src/data/`

### Repo Structure
```
scotus-partisan-index/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions: build + deploy to Pages
├── public/
│   └── favicon.ico
├── src/
│   ├── data/
│   │   ├── doctrines.json          # [Agent 1 output] Doctrine definitions
│   │   ├── doctrine-party-map.json # [Agent 2 output] Party position mapping over time
│   │   ├── cases.json              # [Agent 3 output] Diagnostic cases with anonymized votes
│   │   ├── justices.json           # Justice metadata (name, appointer, year, philosophy)
│   │   ├── justice-seat-map.json   # Maps anonymized seat IDs to justice names
│   │   ├── scores.json             # [Agent 4 output] Blind scores per seat
│   │   └── assumptions.json        # All analytical assumptions in structured form
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Navigation.tsx
│   │   ├── CaseCard.tsx            # Individual case detail with vote breakdown
│   │   ├── JusticeScorecard.tsx    # Per-justice partisan index display
│   │   ├── DoctrineTimeline.tsx    # How a doctrine's party alignment shifted over time
│   │   ├── PartyDoctrineGrid.tsx   # Main chart: X = party, Y = doctrine adherence
│   │   ├── DriftChart.tsx          # Justice drift on a doctrine over time
│   │   ├── DiagnosticSignalBadge.tsx # Visual indicator of case signal level
│   │   ├── AssumptionDisclosure.tsx # Expandable assumption documentation
│   │   └── BlindScoringExplainer.tsx # Explains the agent separation methodology
│   ├── pages/
│   │   ├── Home.tsx                # Overview, key findings, methodology summary
│   │   ├── Doctrines.tsx           # Browse all doctrines with party mapping timeline
│   │   ├── Cases.tsx               # Browse diagnostic cases, filter by signal level
│   │   ├── Scorecard.tsx           # Justice-by-justice partisan index with drill-down
│   │   ├── Charts.tsx              # All visualizations on one page
│   │   ├── Methodology.tsx         # Full documentation of assumptions + agent separation
│   │   └── Blog.tsx                # Long-form narrative writeup for sharing
│   ├── lib/
│   │   ├── scoring.ts              # Scoring algorithm (mirrors Agent 4 logic for transparency)
│   │   ├── types.ts                # TypeScript interfaces for all data structures
│   │   └── utils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── docs/
│   ├── METHODOLOGY.md              # Complete methodology documentation
│   ├── DOCTRINE_ASSUMPTIONS.md     # Why each doctrine is defined as it is
│   ├── PARTY_MAPPING.md            # How doctrines map to parties over time, with evidence
│   ├── CASE_ASSUMPTIONS.md         # Why each case tests what we claim, what we're assuming
│   ├── SCORING_ALGORITHM.md        # The blind scoring formula with worked examples
│   └── AGENT_SEPARATION.md         # Documents the isolation protocol and why it matters
├── agent-prompts/
│   ├── agent1-doctrine-architect.md    # Exact prompt for Agent 1
│   ├── agent2-party-mapper.md          # Exact prompt for Agent 2
│   ├── agent3-case-analyst.md          # Exact prompt for Agent 3
│   ├── agent4-blind-scorer.md          # Exact prompt for Agent 4
│   └── agent5-assembler.md             # Exact prompt for Agent 5
├── scripts/
│   ├── validate_data.ts            # Check cross-file consistency
│   ├── verify_blind_scoring.ts     # Re-run scoring and diff against scores.json
│   └── generate_blog_data.ts       # Extract key stats for blog narrative
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── index.html
```

---

## Data Model

### Doctrine Definition (`doctrines.json`)
```typescript
interface Doctrine {
  id: string;                        // e.g., "executive-restraint"
  name: string;                      // e.g., "Executive Restraint"
  description: string;               // What the doctrine means in neutral terms
  constitutional_basis: string;      // Where in the Constitution this is grounded
  key_question: string;              // e.g., "Should the president's actions be constrained by explicit congressional authorization?"
  principled_conservative_position: string;
  principled_liberal_position: string;
  contested_aspects: string;         // What is genuinely debatable about this doctrine
}
```

### Doctrine-Party Mapping (`doctrine-party-map.json`)
```typescript
interface DoctrinePartyMapping {
  doctrine_id: string;
  party: "R" | "D";
  periods: Array<{
    start_year: number;
    end_year: number | null;         // null = ongoing
    practical_position: string;      // What the party actually did/advocated
    alignment_with_doctrine: "aligned" | "opposed" | "mixed";
    evidence: string[];              // Specific citations: platform language, votes, statements
  }>;
}
```

### Case Definition (`cases.json`)
```typescript
interface DiagnosticCase {
  id: string;
  title: string;
  year: number;
  scotus_citation: string;           // e.g., "606 U.S. ___ (2025)"
  area: string;                      // "Executive Power", "Spending Power", "Federalism", etc.
  doctrine_ids: string[];            // Which doctrines this case tests

  description: string;
  factual_background: string;        // What happened, neutrally stated

  // Diagnostic classification
  doctrine_prediction: string;       // What a principled doctrine adherent would do
  r_party_prediction: string;        // What R party interest predicts
  d_party_prediction: string;        // What D party interest predicts
  signal_level: "high" | "medium" | "low";
  signal_explanation: string;        // Why this signal level

  // Anonymized votes
  votes: {
    [seat_id: string]: {
      vote: string;                  // Factual description of what this seat did
      vote_aligns_with_doctrine: "yes" | "no" | "partial";
      vote_aligns_with_appointer_party: "yes" | "no" | "partial";
    };
  };

  sources: string[];                 // URLs to opinions, SCOTUSblog, etc.
  assumptions: string[];             // What we are assuming in this classification
  counterarguments: string[];        // Strongest arguments against our classification
}
```

### Justice Definition (`justices.json`)
```typescript
interface Justice {
  id: string;
  name: string;
  appointed_by: string;
  appointing_party: "R" | "D";
  year_appointed: number;
  year_left: number | null;
  stated_philosophy: string[];       // Self-described judicial philosophy
  claimed_doctrines: string[];       // Doctrine IDs they claim to follow
}
```

### Seat Map (`justice-seat-map.json`)
```typescript
// This file is the ONLY bridge between anonymized seats and named justices.
// Agent 4 (Blind Scorer) never sees this file.
interface SeatMap {
  [seat_id: string]: {
    justice_id: string;
    period: { start_year: number; end_year: number | null };
  };
}
```

### Scores (`scores.json`)
```typescript
interface JusticeScore {
  seat_id: string;                   // Anonymized — de-anonymized only by Agent 5
  partisan_index: number;            // 0.0 (pure doctrine) to 1.0 (pure partisan)
  total_diagnostic_cases: number;
  partisan_votes: number;
  doctrine_votes: number;
  mixed_votes: number;
  per_doctrine: {
    [doctrine_id: string]: {
      partisan_index: number;
      cases_evaluated: number;
    };
  };
  confidence: "high" | "medium" | "low"; // Based on N of diagnostic cases
}
```

---

## Doctrines to Track

Agent 1 should define these independently, but the following are the target doctrines based on the areas where party positions have demonstrably shifted. Agent 1 should be given the *questions*, not the *answers*.

### Suggested doctrine prompts for Agent 1:

1. **Executive Restraint** — "Define the judicial doctrine regarding limits on presidential executive action. When should courts block executive orders or agency actions as exceeding presidential authority? What constitutional provisions are relevant?"

2. **Congressional Spending Authority (Power of the Purse)** — "Define the doctrine regarding Congress's exclusive authority over federal spending. Can the executive spend money Congress did not appropriate? Can the executive withhold money Congress did appropriate?"

3. **Federalism / States' Rights** — "Define the doctrine regarding the balance of power between federal and state governments. When should the federal government defer to states, and when is federal supremacy appropriate?"

4. **Agency Deference** — "Define the doctrine regarding how much courts should defer to executive agency interpretations of ambiguous statutes. What is the historical basis for deference, and what are the arguments against it?"

5. **Standing and Justiciability** — "Define the doctrine regarding who has legal standing to bring a case. How strictly should standing requirements be enforced? Should they be applied consistently regardless of the subject matter?"

6. **Presidential Immunity** — "Define any historical or constitutional basis for presidential immunity from criminal prosecution. Is there an originalist case for broad immunity?"

7. **Nationwide Injunctions** — "Define the doctrine regarding the power of a single federal district court to issue an injunction that applies nationwide. What are the historical and constitutional arguments for and against?"

---

## Visualizations

### Chart 1: Party-Doctrine Grid (The Main Chart)
- X-axis: Party affiliation of appointing president (R vs. D), with justices placed as dots
- Y-axis: Partisan index (0.0 = pure doctrine adherent, 1.0 = pure partisan)
- Each justice is a labeled dot
- Color: by bloc (hard-right, center-right, liberal)
- Goal: visually answer "are justices clustered by party or spread by doctrine?"

### Chart 2: Justice Drift Over Time (Per Doctrine)
- X-axis: Time (years)
- Y-axis: Partisan index for a specific doctrine
- One line per justice (selectable)
- Shows whether a justice's adherence to a doctrine changed when the party in power changed
- This is the key chart for your theory — if a justice's "executive restraint" score drops when their party takes power and rises when the other party has power, that is a strong partisan signal

### Chart 3: Doctrine Comparison Heatmap
- Rows: Justices
- Columns: Doctrines
- Cell color: Partisan index for that justice on that doctrine
- Reveals which justices are selectively partisan (partisan on some doctrines, principled on others)

### Chart 4: Case-Level Vote Matrix
- Rows: Diagnostic cases (sorted by signal level)
- Columns: Justices
- Cells: Color-coded by whether vote was doctrine-aligned, party-aligned, or mixed
- Shows the raw data behind the scores

### Chart 5: Confidence Indicators
- Overlay on all charts showing N of diagnostic cases per justice per doctrine
- Low-N scores should be visually flagged (dashed lines, transparency, asterisks)

---

## Blog Post Structure

The blog page should be a long-form narrative accessible to a general audience. Structure:

1. **The Question** — Are Supreme Court justices ideological or partisan? What's the difference?
2. **The Test** — How do you distinguish? Only cases where doctrine and party diverge are diagnostic.
3. **The Method** — Blind scoring, agent separation, documented assumptions.
4. **The Doctrines** — What we tracked and why.
5. **The Cases** — Walk through 3-4 high-signal examples in detail.
6. **The Scores** — The partisan index for each justice, with per-doctrine breakdown.
7. **The Drift** — Do justices shift when power changes hands?
8. **The Counterarguments** — Why this analysis might be wrong. The movement-ideology confound. The small-N problem.
9. **The Conclusion** — What does this mean for the Court's legitimacy?

Tone: analytical, not polemical. Present both sides of every contested classification. The goal is to build a framework, not to prosecute a case.

---

## Documentation Requirements

Every analytical choice must be documented and challengeable. The app should include:

### METHODOLOGY.md
- The full framework: what makes a case diagnostic, how signal levels are assigned, the scoring algorithm
- The agent separation protocol and why it exists
- Statistical limitations (small N, selection bias in case choice)
- How to reproduce the analysis

### DOCTRINE_ASSUMPTIONS.md
For each doctrine:
- Why this doctrine was included
- What we are assuming about what a principled adherent would believe
- Strongest counterargument to our characterization
- Sources consulted

### PARTY_MAPPING.md
For each doctrine-party-period mapping:
- What evidence supports this mapping
- When the party position shifted and why
- Cases where the mapping is contested or unclear

### CASE_ASSUMPTIONS.md
For each diagnostic case:
- Why we classified the signal level as we did
- What we are assuming about which doctrine applies
- The strongest argument that our classification is wrong
- What a defender of the majority position would say about why this is principled, not partisan

### AGENT_SEPARATION.md
- Why agent separation matters for analytical integrity
- What each agent could and could not see
- How a reader can verify the separation was maintained
- Limitations (the human assembling the project still has full context)

---

## Scoring Validation

The app should include a "Verify Scores" page or section that:

1. Shows the scoring algorithm in plain language
2. Lets the user pick any justice and any case and see exactly how the score was computed
3. Includes a "run the algorithm yourself" calculator where the user can change doctrine classifications or case signal levels and see how scores change
4. Exports raw data as CSV for independent analysis

---

## Quality Standards

- No emojis anywhere in the app or documentation
- Typography-forward design: use a serif display font, clean sans-serif body text
- Dark/light theme support
- Mobile-responsive
- Every chart must have a plain-English caption explaining what it shows
- Every data point must be traceable back to a specific case, doctrine, and assumption
- The README should be concise: what this is, how to run it, link to the live site
- Assumption disclosures should be prominent, not hidden — this is a feature, not a disclaimer

---

## Development Sequence

1. **Agent 1** — Define doctrines (separate session, no case/justice context)
2. **Agent 2** — Map party positions (separate session, receives only doctrines.json)
3. **Agent 3** — Identify and classify diagnostic cases with anonymized votes (separate session, receives doctrines.json + doctrine-party-map.json)
4. **Human review gate** — Review all three outputs for neutrality and accuracy before proceeding
5. **Agent 4** — Blind score all seats (separate session, receives only cases.json)
6. **Human review gate** — Verify scores against manual spot-checks
7. **Agent 5** — Assemble app, build visualizations, write blog post, generate documentation
8. **Deploy** — Push to GitHub, configure Pages, verify live site

---

## Data Sources

- Supreme Court opinions: supremecourt.gov
- Case analysis: SCOTUSblog (scotusblog.com), Oyez (oyez.org)
- Voting data: Supreme Court Database (scdb.wustl.edu)
- Shadow docket tracker: Brennan Center
- Party platforms: presidency.ucsb.edu (American Presidency Project)
- Political science research on party position shifts: JSTOR, Google Scholar
- Stat Pack annual reports: SCOTUSblog

---

## Extending the Analysis

Future additions that the data model should support:

- **Historical justices** — apply the same framework to past courts (Warren, Burger, Rehnquist)
- **Lower court judges** — same methodology applied to circuit courts
- **Predictive model** — given a new case's doctrine tags and party-interest predictions, predict the vote split
- **Crowdsourced doctrine review** — let legal scholars submit alternative doctrine classifications and see how scores change
- **Comparative analysis** — how does the current court's partisan index compare to past courts?

---

## Final Notes

The value of this project is not the scores themselves — it is the *framework* and the *transparency*. Every number should be traceable to a documented assumption that a reader can challenge. The agent separation exists to make the analysis more credible, not more complex. If someone disagrees with a doctrine definition, a party mapping, or a case classification, they should be able to change that single input and recompute everything downstream. The app is a machine for structured argumentation about judicial behavior, not a verdict.
