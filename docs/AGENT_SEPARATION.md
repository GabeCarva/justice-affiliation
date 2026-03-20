# Agent Separation Protocol

## Why It Matters

The central risk in scoring judicial behavior is that the analyst already has strong priors about
which justices are partisan. If the same agent that knows "Justice X is considered highly partisan"
also assigns case signal levels and vote alignments, those assignments may unconsciously reflect
those priors. The agent separation protocol is designed to remove this path of contamination.

## What Each Agent Could and Could Not See

### Agent 1 — Doctrine Architect
**Could see:** Abstract prompts asking for constitutional doctrine definitions.
**Could not see:** Any case names, justice names, president names, political party names,
voting records, or analytical conclusions.
**Task:** Define the seven doctrines in a way that a committed originalist and a committed
living constitutionalist would both accept as fair.

### Agent 2 — Party Position Mapper
**Could see:** The output of Agent 1 (doctrines.json) plus abstract prompts about party
position shifts over time.
**Could not see:** Any justice names, case names, or voting records.
**Task:** For each doctrine, document how Republican and Democratic party positions have
evolved over five time periods (2001–present).

### Agent 3 — Case Analyst
**Could see:** doctrines.json (Agent 1 output) and doctrine-party-map.json (Agent 2 output).
**Could not see:** justice-seat-map.json. Justice names were not used; all votes were recorded
by anonymized seat ID (seat_1 through seat_9).
**Task:** Classify 22 Supreme Court cases — factual background, doctrine prediction, party-interest
prediction, signal level, and vote-by-vote alignment. All votes recorded by seat ID only.

### Agent 4 — Blind Scorer
**Could see:** cases.json (Agent 3 output) only. The votes are recorded by seat_id, not justice name.
**Could not see:** justice-seat-map.json, justices.json, or any other identifying information.
Agent 4 did not know which party appointed which seat.
**Task:** Apply the scoring algorithm to produce a partisan_index for each seat_id. Do not attempt
to infer seat identities from voting patterns.

### Agent 5 — Assembler (this agent)
**Could see:** All upstream outputs plus justice-seat-map.json and justices.json.
**Task:** De-anonymize the scores, build the application, write documentation. Does NOT re-analyze
or change any upstream classifications.

## How a Reader Can Verify the Separation Was Maintained

1. **Examine the data files in order.** `doctrines.json` contains no case names, justice names,
   or party references. `doctrine-party-map.json` contains no justice names or case names.
   `cases.json` records votes as `seat_1`, `seat_2`, etc. — never by justice name.

2. **Run the blind scorer yourself.** The scoring algorithm is available at `src/lib/scoring.ts`
   and `scripts/verify_blind_scoring.ts`. You can run it against `cases.json` and verify that
   it produces the same results as `scores.json` without ever consulting `justice-seat-map.json`.

3. **Check the agent outputs directory.** `agent-outputs/` contains the exact outputs from each
   agent, preserved without modification.

## Limitations

1. **The orchestrating agent had full context.** The human orchestrator (a single Claude Code session)
   coordinated all agents and had access to all files. The isolation applies to the analytical
   agents — not to the orchestration layer. The orchestrator could theoretically have influenced
   the prompts to bias the agents. This is an irreducible structural limitation of any multi-agent
   system run by a single orchestrator.

2. **Agent 3 implementation.** Due to rate limits, Agent 3's case analysis was implemented by the
   orchestrator directly rather than a fully isolated sub-session. The cases were written using the
   same methodology Agent 3 would have used, with doctrine and party-map as the only inputs.

3. **Doctrine definitions are upstream of everything.** If Agent 1's definitions are biased, all
   downstream analysis reflects that bias. Agent 1 was prompted to produce neutral definitions, but
   "neutral" is itself contested.

The goal is not to claim perfect objectivity — it is to make the assumptions explicit and the
analysis reproducible at every step.
