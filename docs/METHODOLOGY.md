# Methodology

## Framework Overview

The SCOTUS Partisan Index measures whether Supreme Court justices vote according to judicial doctrine
or appointing-party political interest. The central insight is that most cases are non-diagnostic:
when doctrine and party interest align, a justice's vote cannot distinguish principled behavior from
partisan behavior. Only cases where doctrine and party diverge are informative.

## What Makes a Case Diagnostic

A case is diagnostic when:
1. There is a clear doctrine-based prediction for the outcome (e.g., executive restraint doctrine
   predicts the court should block an executive overreach).
2. There is a clear party-interest prediction that differs (e.g., the executive action was taken by
   a president whose party opposes executive limits, creating pressure to uphold it).

When these predictions agree, the case is excluded from scoring. When they disagree, the case
contributes to the partisan index.

## Signal Levels

Each case is assigned a signal level:

- **High**: Doctrine and party interest clearly diverge. The case is strongly diagnostic.
  Weight: 1.0x
- **Medium**: Some divergence, but ambiguity in doctrine application or party interest.
  Weight: 0.5x
- **Low**: Weak signal. Doctrine and party somewhat diverge but the case is not strongly diagnostic.
  Weight: 0.0x (excluded from scoring)

## Scoring Algorithm

For each justice (identified by anonymized seat ID during scoring):

```
partisan_score = 0
doctrine_score = 0

For each case where this justice voted:
  weight = 1.0 if signal_level == "high"
         = 0.5 if signal_level == "medium"
         = 0.0 if signal_level == "low" (skip)

  If vote_aligns_with_appointer_party == "yes" AND vote_aligns_with_doctrine == "no":
    partisan_score += 1.0 * weight

  If vote_aligns_with_doctrine == "yes" AND vote_aligns_with_appointer_party == "no":
    doctrine_score += 1.0 * weight

  If both "yes": non-diagnostic, skip (0 contribution)
  If both "no": non-diagnostic, skip (0 contribution)

  If partial alignment:
    partisan_score or doctrine_score += 0.5 * weight (as appropriate)

total = partisan_score + doctrine_score
partisan_index = total > 0 ? partisan_score / total : 0.5
confidence = "high" if total >= 4
           = "medium" if total >= 2
           = "low" if total < 2
```

## Agent Separation Protocol

To prevent analytical bias contaminating the scoring, this project used five separate analytical agents:

| Agent | Receives | Produces | Cannot See |
|-------|----------|----------|------------|
| 1 — Doctrine Architect | Abstract prompts only | doctrines.json | All cases, justices, party positions |
| 2 — Party Position Mapper | doctrines.json | doctrine-party-map.json | Cases, justices, voting records |
| 3 — Case Analyst | doctrines.json + doctrine-party-map.json | cases.json (anonymized) | Justice names, seat mapping |
| 4 — Blind Scorer | cases.json only | scores.json (anonymized) | Justice names, seat-to-justice mapping |
| 5 — Assembler | All outputs + seat map | Complete application | Nothing restricted |

Agent 3 recorded all votes by anonymized seat ID (seat_1 through seat_9), not by justice name.
Agent 4 computed scores from the anonymized voting data, never learning which justice occupied which seat.
The seat-to-justice mapping was introduced only in the final assembly stage.

## Statistical Limitations

1. **Small N**: 22 cases across 7 doctrines means per-doctrine scores are based on 2–7 cases each.
   These per-doctrine figures should be treated as directional indicators, not precise measurements.

2. **Selection bias**: The cases were chosen by the orchestrating agent. A different set of cases
   could produce different scores. All case selections and their assumptions are documented in
   `CASE_ASSUMPTIONS.md`.

3. **The ideology-partisanship confound**: The framework cannot distinguish genuine originalist
   doctrine adherence from movement-conservative partisanship when they produce identical votes.
   A justice who sincerely believes the conservative legal movement's doctrinal positions is not
   mismeasured by this framework — they appear consistent with doctrine AND party. Only divergence
   cases reveal the distinction.

4. **Doctrine contestation**: The definition of "doctrine-aligned" is itself contested. If our
   definition of any doctrine is wrong, all scores for that doctrine are wrong. See
   `DOCTRINE_ASSUMPTIONS.md` for the basis of each definition.

5. **Partial human context**: The orchestrating agent coordinating the pipeline had full context
   even if individual analysis agents did not. This is an irreducible structural limitation.
   See `AGENT_SEPARATION.md` for how this was managed.

## How to Reproduce

1. Clone the repository.
2. Inspect `src/data/cases.json` and identify any case you want to challenge.
3. Run `scripts/verify_blind_scoring.ts` to re-compute scores from the case data and compare
   against the stored `scores.json`.
4. To challenge a classification, edit the relevant JSON file and re-run the scorer.
5. The "Verify Scores" page in the app provides a graphical trace for any justice and case.
