# SCOTUS Partisan Index

A nonpartisan framework for measuring whether Supreme Court justices vote according to judicial
doctrine or appointing-party political interest.

## What This Is

Most SCOTUS analysis asks "who voted with whom." This project asks a different question: in cases
where judicial doctrine and party interest diverge, which does a justice follow? Only these
"diagnostic" cases reveal whether a justice is primarily principled or primarily partisan.

The result is a partisan index for each current justice, computed from 57 Supreme Court cases
(2011–2024) across 9 constitutional doctrines.

## Live Site

[GabeCarva.github.io/justice-affiliation](https://GabeCarva.github.io/justice-affiliation)

## How to Run Locally

```bash
npm install
npm run dev
```

## Data

All data is in `src/data/`:
- `doctrines.json` — 9 constitutional doctrine definitions
- `doctrine-party-map.json` — party positions per doctrine per time period
- `cases.json` — 57 diagnostic cases with anonymized votes
- `scores.json` — blind partisan index scores by seat ID
- `justice-seat-map.json` — maps seat IDs to justice names (introduced last)
- `justices.json` — justice metadata

## Methodology

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) for the full scoring algorithm and agent separation
protocol. All assumptions are documented and challengeable.

## Verify Scores

```bash
npx ts-node --esm scripts/verify_blind_scoring.ts
```

This re-computes scores from `cases.json` and diffs against `scores.json`.
