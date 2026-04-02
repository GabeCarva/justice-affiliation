// Scoring algorithm implementation — mirrors Agent 4's blind scoring logic
// This is included in the frontend for the "Verify Scores" transparency feature.

import type { DiagnosticCase, JusticeScore } from './types';

type VoteAlignment = 'yes' | 'no' | 'partial';

interface ScoreAccumulator {
  partisan_score: number;
  doctrine_score: number;
  total_cases: number;
  partisan_votes: number;
  doctrine_votes: number;
  mixed_votes: number;
}

function getWeight(signal_level: string): number {
  if (signal_level === 'high') return 1.0;
  if (signal_level === 'medium') return 0.5;
  return 0.0;
}

function scoreVote(
  vote_aligns_with_doctrine: VoteAlignment,
  vote_aligns_with_appointer_party: VoteAlignment,
  weight: number,
  acc: ScoreAccumulator
): void {
  if (vote_aligns_with_appointer_party === 'yes' && vote_aligns_with_doctrine === 'no') {
    acc.partisan_score += 1.0 * weight;
    acc.partisan_votes += 1;
  } else if (vote_aligns_with_doctrine === 'yes' && vote_aligns_with_appointer_party === 'no') {
    acc.doctrine_score += 1.0 * weight;
    acc.doctrine_votes += 1;
  } else if (vote_aligns_with_appointer_party === 'yes' && vote_aligns_with_doctrine === 'yes') {
    // Non-diagnostic — skip
  } else if (vote_aligns_with_appointer_party === 'partial' || vote_aligns_with_doctrine === 'partial') {
    acc.partisan_score += 0.5 * weight;
    acc.doctrine_score += 0.5 * weight;
    acc.mixed_votes += 1;
  }
}

export function computeScores(cases: DiagnosticCase[]): JusticeScore[] {
  // Collect all seat IDs
  const seatIds = new Set<string>();
  for (const c of cases) {
    for (const seatId of Object.keys(c.votes)) {
      seatIds.add(seatId);
    }
  }

  const scores: JusticeScore[] = [];

  for (const seatId of seatIds) {
    const overall: ScoreAccumulator = {
      partisan_score: 0,
      doctrine_score: 0,
      total_cases: 0,
      partisan_votes: 0,
      doctrine_votes: 0,
      mixed_votes: 0,
    };

    const perDoctrine: Record<string, ScoreAccumulator> = {};

    for (const c of cases) {
      const vote = c.votes[seatId];
      if (!vote) continue;

      const weight = getWeight(c.signal_level);
      if (weight === 0) continue;

      overall.total_cases += 1;
      scoreVote(vote.vote_aligns_with_doctrine, vote.vote_aligns_with_appointer_party, weight, overall);

      for (const docId of c.doctrine_ids) {
        if (!perDoctrine[docId]) {
          perDoctrine[docId] = {
            partisan_score: 0,
            doctrine_score: 0,
            total_cases: 0,
            partisan_votes: 0,
            doctrine_votes: 0,
            mixed_votes: 0,
          };
        }
        perDoctrine[docId].total_cases += 1;
        scoreVote(
          vote.vote_aligns_with_doctrine,
          vote.vote_aligns_with_appointer_party,
          weight,
          perDoctrine[docId]
        );
      }
    }

    const total = overall.partisan_score + overall.doctrine_score;
    const partisan_index = total > 0 ? overall.partisan_score / total : 0.5;
    const confidence: 'high' | 'medium' | 'low' =
      total >= 4 ? 'high' : total >= 2 ? 'medium' : 'low';

    const per_doctrine_output: JusticeScore['per_doctrine'] = {};
    for (const [docId, acc] of Object.entries(perDoctrine)) {
      const docTotal = acc.partisan_score + acc.doctrine_score;
      per_doctrine_output[docId] = {
        partisan_index: docTotal > 0 ? acc.partisan_score / docTotal : 0.5,
        cases_evaluated: acc.total_cases,
      };
    }

    scores.push({
      seat_id: seatId,
      partisan_index,
      total_diagnostic_cases: overall.total_cases,
      partisan_votes: overall.partisan_votes,
      doctrine_votes: overall.doctrine_votes,
      mixed_votes: overall.mixed_votes,
      per_doctrine: per_doctrine_output,
      confidence,
    });
  }

  return scores.sort((a, b) => b.partisan_index - a.partisan_index);
}
