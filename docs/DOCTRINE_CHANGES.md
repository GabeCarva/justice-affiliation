# How Doctrine Changes Propagate Through the Codebase

This document explains the data flow from `doctrines.json` through every part of the application, so that anyone editing doctrine definitions knows exactly what will update automatically and what requires manual intervention.

## Architecture Overview

```
doctrines.json (source of truth)
    │
    ├── src/lib/data.ts (central import hub)
    │       │
    │       ├── Pages: DoctrinePage, HomePage, VerifyPage, BlogPage
    │       │   └── Display doctrine fields directly → AUTO-SYNC
    │       │
    │       └── Charts: DoctrineHeatmap
    │           └── Uses d.short_name || d.name → AUTO-SYNC
    │
    ├── src/lib/priors.ts (imports doctrines.json directly)
    │       │
    │       ├── DOCTRINE_LABELS → derived from doctrines.json → AUTO-SYNC
    │       │
    │       └── computeSurpriseScores / computePriorAdjustedPoints
    │           └── Uses doctrine IDs from cases.json → ID-DEPENDENT
    │
    └── src/lib/types.ts (Doctrine interface)
            └── Must match doctrines.json field structure → MANUAL UPDATE
```

## Change Categories

### 1. Text-Only Changes (description, positions, contested_aspects)

**Impact: Fully automatic.**

These fields are read from `doctrines.json` at build time and displayed directly by the UI. No manual intervention required.

| File | What happens |
|------|-------------|
| `src/pages/DoctrinePage.tsx` | Displays all text fields verbatim |
| `src/pages/BlogPage.tsx` | Displays `name` and `key_question` |
| `src/pages/HomePage.tsx` | Displays `name` in per-doctrine tables |
| `src/pages/VerifyPage.tsx` | Displays `name` in case breakdown |

### 2. Name Changes (name field)

**Impact: Mostly automatic, verify heatmap.**

- `short_name` in doctrines.json controls the abbreviated label in `DoctrineHeatmap.tsx`
- `DOCTRINE_LABELS` in `priors.ts` is now derived from `doctrines.json` automatically
- All other pages use `d.name` directly

**Action required:** If you change `name`, also update `short_name` to keep the abbreviated label appropriate.

### 3. Adding `short_name` for New Doctrines

**Impact: Manual.**

When adding a new doctrine, include a `short_name` field for compact display in heatmaps and tables. If omitted, the full `name` is used as a fallback.

### 4. ID Changes (doctrine id field)

**Impact: Breaking. Requires updates across multiple files.**

Doctrine IDs are the primary key used throughout the system. Changing an ID requires updating:

| File | Field(s) to update |
|------|-------------------|
| `src/data/cases.json` | `doctrine_ids` arrays in all 51 cases |
| `src/data/doctrine-party-map.json` | `doctrine_id` field in each mapping |
| `src/data/justice-doctrine-priors.json` | Doctrine ID keys under each seat |
| `src/data/scores.json` | `per_doctrine` object keys |

**Recommendation:** Never change doctrine IDs. If a doctrine needs to be renamed, change `name` and `short_name` instead.

### 5. Adding a New Doctrine

**Checklist:**

1. Add entry to `src/data/doctrines.json` with all required fields including `short_name`
2. Add party mapping entries to `src/data/doctrine-party-map.json` (R and D)
3. Add prior positions for all 9 justices in `src/data/justice-doctrine-priors.json`
4. Tag relevant cases in `src/data/cases.json` with the new doctrine ID in their `doctrine_ids`
5. Regenerate scores: `npm run generate-scores`
6. Run verification: `npm run verify-alignment`

**Files that auto-adapt (no changes needed):**
- All page components (iterate over `doctrines[]`)
- DoctrineHeatmap (iterates over `doctrines[]`, uses `short_name`)
- DOCTRINE_LABELS in priors.ts (derived from doctrines.json)
- Scoring algorithm (iterates over case doctrine_ids)
- Trajectory computation (iterates over case doctrine_ids)

### 6. Removing a Doctrine

**Checklist:**

1. Remove from `src/data/doctrines.json`
2. Remove entries from `src/data/doctrine-party-map.json`
3. Remove keys from `src/data/justice-doctrine-priors.json`
4. Remove ID from `doctrine_ids` in affected cases in `src/data/cases.json`
5. Regenerate scores: `npm run generate-scores`
6. Run verification: `npm run verify-alignment`

### 7. Structural Changes (adding/removing fields)

**Impact: Manual.**

If you add or remove a field from the doctrine definition structure:

1. Update `src/lib/types.ts` — the `Doctrine` interface must match the JSON structure
2. Update any page that displays the field (currently `DoctrinePage.tsx` displays all fields)

## File Reference

### Data Files

| File | Role | Doctrine-related content |
|------|------|------------------------|
| `src/data/doctrines.json` | **Source of truth** | 7 doctrine definitions with all fields |
| `src/data/doctrine-party-map.json` | Party position history | Maps doctrine IDs to R/D party positions over time periods |
| `src/data/cases.json` | Case data | Each case has `doctrine_ids[]` tagging which doctrines it tests |
| `src/data/justice-doctrine-priors.json` | Justice priors | 9 justices x 7 doctrines with position/strength/source |
| `src/data/scores.json` | Computed scores | `per_doctrine` keyed by doctrine ID with partisan_index values |

### Library Files

| File | Role | Doctrine coupling |
|------|------|------------------|
| `src/lib/data.ts` | Central import hub | Imports and re-exports `doctrines.json` |
| `src/lib/types.ts` | Type definitions | `Doctrine` interface must match JSON structure |
| `src/lib/priors.ts` | Prior analysis | `DOCTRINE_LABELS` derived from `doctrines.json`; surprise/adjustment algorithms use doctrine IDs from cases |
| `src/lib/scoring.ts` | Scoring algorithm | Uses `doctrine_ids` from cases, not doctrine definitions |
| `src/lib/trajectory.ts` | Trajectory computation | Uses `doctrine_ids` from cases, not doctrine definitions |
| `src/lib/utils.ts` | Utilities | No doctrine coupling (threshold constants, color functions) |

### UI Components

| File | Doctrine fields used | Auto-sync |
|------|---------------------|-----------|
| `src/pages/DoctrinePage.tsx` | All fields | Yes |
| `src/pages/BlogPage.tsx` | `name`, `key_question` | Yes |
| `src/pages/HomePage.tsx` | `id`, `name` | Yes |
| `src/pages/VerifyPage.tsx` | `id`, `name` | Yes |
| `src/pages/PriorsPage.tsx` | Via `DOCTRINE_LABELS` (now auto-synced) | Yes |
| `src/components/Charts/DoctrineHeatmap.tsx` | `id`, `name`, `short_name` | Yes |
| `src/components/Charts/QuadrantChart.tsx` | None directly | N/A |
| `src/components/Charts/EvolutionChart.tsx` | None directly | N/A |
| `src/components/Charts/VoteMatrix.tsx` | None directly | N/A |

### Scripts

| File | Role | Doctrine coupling |
|------|------|------------------|
| `scripts/generate-scores.ts` | Regenerate scores.json | Reads cases.json `doctrine_ids` |
| `scripts/verify-alignment.ts` | 176-check test suite | Validates scores, thresholds, classification boundaries |
| `scripts/validate_data.ts` | Data validation | Cross-references doctrine IDs across all data files |

## Verification Commands

After any doctrine change:

```bash
# Regenerate scores (required after ID/case changes, not after text-only changes)
npm run generate-scores

# Run 176-check alignment verification
npm run verify-alignment

# Build to verify no TypeScript errors
npm run build
```

## Recently Fixed Issues

The following hardcoded doctrine references were eliminated in this update:

1. **`src/lib/priors.ts` DOCTRINE_LABELS** — Was a manually maintained `Record<string, string>` mapping IDs to display names. Now derived from `doctrines.json` import, auto-syncs when names change.

2. **`src/components/Charts/DoctrineHeatmap.tsx` name abbreviations** — Was a chain of `.replace()` calls converting full names to short labels (e.g., `'Congressional Spending Authority'` → `'Spending'`). Now uses `d.short_name || d.name` from doctrines.json.

3. **`doctrines.json` now includes `short_name`** — Each doctrine has an optional abbreviated name for compact UI display. Falls back to full `name` if absent.
