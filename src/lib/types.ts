// TypeScript interfaces for all data structures in the SCOTUS Partisan Index project

export interface Doctrine {
  id: string;
  name: string;
  short_name?: string;
  description: string;
  constitutional_basis: string;
  key_question: string;
  principled_conservative_position: string;
  principled_liberal_position: string;
  contested_aspects: string;
  scoring_caveat?: string;
}

export interface DoctrinePartyPeriod {
  start_year: number;
  end_year: number | null;
  practical_position: string;
  alignment_with_doctrine: 'aligned' | 'opposed' | 'mixed';
  evidence: string[];
}

export interface DoctrinePartyMapping {
  doctrine_id: string;
  party: 'R' | 'D';
  periods: DoctrinePartyPeriod[];
}

export type VoteAlignment = 'yes' | 'no' | 'partial';

export interface SeatVote {
  vote: string;
  vote_aligns_with_doctrine: VoteAlignment;
  vote_aligns_with_appointer_party: VoteAlignment;
}

export interface DiagnosticCase {
  id: string;
  title: string;
  year: number;
  scotus_citation: string;
  area: string;
  doctrine_ids: string[];
  description: string;
  factual_background: string;
  doctrine_prediction: string;
  r_party_prediction: string;
  d_party_prediction: string;
  signal_level: 'high' | 'medium' | 'low';
  signal_explanation: string;
  votes: {
    [seat_id: string]: SeatVote;
  };
  sources: string[];
  assumptions: string[];
  counterarguments: string[];
  methodological_note?: string;
}

export interface Justice {
  id: string;
  name: string;
  appointed_by: string;
  appointing_party: 'R' | 'D';
  year_appointed: number;
  year_left: number | null;
  stated_philosophy: string[];
  claimed_doctrines: string[];
}

export interface SeatMapEntry {
  justice_id: string;
  description: string;
  period: { start_year: number; end_year: number | null };
}

export interface SeatMap {
  [seat_id: string]: SeatMapEntry;
}

export interface PerDoctrineScore {
  partisan_index: number;
  cases_evaluated: number;
}

export interface JusticeScore {
  seat_id: string;
  partisan_index: number;
  total_diagnostic_cases: number;
  partisan_votes: number;
  doctrine_votes: number;
  mixed_votes: number;
  per_doctrine: {
    [doctrine_id: string]: PerDoctrineScore;
  };
  confidence: 'high' | 'medium' | 'low';
}

// De-anonymized score — created by Agent 5
export interface NamedJusticeScore extends JusticeScore {
  justice: Justice;
}
