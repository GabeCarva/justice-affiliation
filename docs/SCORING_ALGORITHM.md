# Scoring Algorithm

## Formal Definition

```
For each seat_id in {seat_1, seat_2, ..., seat_9}:

  partisan_score = 0.0
  doctrine_score = 0.0

  For each case c where votes[seat_id] exists:
    weight(c) = 1.0  if c.signal_level == "high"
              = 0.5  if c.signal_level == "medium"
              = 0.0  if c.signal_level == "low"  # excluded

    pa = c.votes[seat_id].vote_aligns_with_appointer_party  # "yes", "no", "partial"
    da = c.votes[seat_id].vote_aligns_with_doctrine          # "yes", "no", "partial"

    Case 1: pa == "yes" AND da == "no"
      → partisan_score += 1.0 × weight(c)

    Case 2: da == "yes" AND pa == "no"
      → doctrine_score += 1.0 × weight(c)

    Case 3: pa == "yes" AND da == "yes"
      → non-diagnostic: no contribution (skip)

    Case 4: pa == "no" AND da == "no"
      → non-diagnostic: no contribution (skip)

    Case 5: pa == "partial" AND da == "no"
      → partisan_score += 0.5 × weight(c)

    Case 6: pa == "no" AND da == "partial"
      → doctrine_score += 0.5 × weight(c)

    Case 7: pa == "yes" AND da == "partial"
      → partisan_score += 0.5 × weight(c)

    Case 8: pa == "partial" AND da == "yes"
      → doctrine_score += 0.5 × weight(c)

    Case 9: pa == "partial" AND da == "partial"
      → partisan_score += 0.5 × weight(c)
      → doctrine_score += 0.5 × weight(c)
      (mixed signal, equal contribution)

  total = partisan_score + doctrine_score
  partisan_index = total > 0 ? partisan_score / total : 0.5
  confidence = "high"   if total >= 4
             = "medium"  if total >= 2
             = "low"     if total < 2
```

## Worked Example

Suppose a justice has voted in four high-signal cases and two medium-signal cases:

| Case | Signal | Weight | pa   | da  | Partisan | Doctrine |
|------|--------|--------|------|-----|----------|----------|
| A    | high   | 1.0    | yes  | no  | +1.0     | +0.0     |
| B    | high   | 1.0    | yes  | no  | +1.0     | +0.0     |
| C    | high   | 1.0    | no   | yes | +0.0     | +1.0     |
| D    | high   | 1.0    | yes  | yes | (skip)   | (skip)   |
| E    | medium | 0.5    | yes  | no  | +0.5     | +0.0     |
| F    | medium | 0.5    | no   | yes | +0.0     | +0.5     |

```
partisan_score = 1.0 + 1.0 + 0.5 = 2.5
doctrine_score = 1.0 + 0.5 = 1.5
total = 4.0
partisan_index = 2.5 / 4.0 = 0.625
confidence = "high" (total >= 4)
```

This justice scores 62.5% — Moderately Partisan.

## Per-Doctrine Breakdown

The same algorithm is applied filtered by doctrine_id. If a case has two doctrine_ids, the vote
contribution counts toward both doctrine breakdowns. This means the sum of per-doctrine contributions
may exceed the overall score.

## Confidence Interpretation

| Total Weighted Score | Confidence | Meaning |
|---------------------|-----------|---------|
| >= 4.0              | high      | At least 4 full-weight diagnostic data points (or equivalent) |
| >= 2.0 and < 4.0    | medium    | 2–3 full-weight data points |
| < 2.0               | low       | Insufficient data; treat score with caution |

## What the Score Measures

The partisan_index measures: in cases where judicial doctrine and appointing-party political interest
diverged, how often did the justice follow party over doctrine?

It does NOT measure:
- How often the justice voted with their appointing party overall
- Whether the justice was "right" or "wrong" as a matter of law
- The justice's ideological orientation independent of partisanship
- The consistency or quality of the justice's legal reasoning

A score of 0.5 means the diagnostic votes were split evenly or that the pattern is indeterminate —
not necessarily that the justice is "balanced."
