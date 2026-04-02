import casesData from '../data/cases.json'
import priorsData from '../data/justice-doctrine-priors.json'

export type PriorPosition = 'supports' | 'opposed' | 'neutral' | 'unknown'
export type PriorStrength = 'strong' | 'moderate' | 'weak'

export interface DoctrinePrior {
  position: PriorPosition
  strength: PriorStrength
  source: string
  summary: string
}

export interface PriorViolation {
  case_id: string
  case_title: string
  year: number
  doctrine_id: string
  prior_position: PriorPosition
  expected_doctrine_alignment: 'yes' | 'no'
  actual_doctrine_alignment: string
  actual_party_alignment: string
  is_party_correlated: boolean
}

export interface DoctrineSurpriseStats {
  doctrine_id: string
  prior_position: PriorPosition
  prior_strength: PriorStrength
  cases_evaluated: number
  violations: number
  party_correlated_violations: number
  surprise_rate: number
  party_correlation_rate: number
  violation_details: PriorViolation[]
}

export interface JusticeSurpriseScore {
  seat_id: string
  justice_name: string
  per_doctrine: Record<string, DoctrineSurpriseStats>
  total_cases_with_prior: number
  total_violations: number
  total_party_correlated: number
  overall_surprise_rate: number
  overall_party_correlation_rate: number
}

type CaseVote = {
  vote: string
  vote_aligns_with_doctrine: string
  vote_aligns_with_appointer_party: string
}

type CaseRecord = {
  id: string
  title: string
  year: number
  doctrine_ids: string[]
  votes: Record<string, CaseVote>
}

function getJusticeVote(caseData: CaseRecord, seatId: string): CaseVote | null {
  return caseData.votes?.[seatId] ?? null
}

export function computeSurpriseScores(): JusticeSurpriseScore[] {
  const cases = casesData as unknown as CaseRecord[]
  const priors = priorsData as Record<string, Record<string, unknown>>
  const seats = Object.keys(priors)

  return seats.map(seatId => {
    const justicePriors = priors[seatId]
    const justiceName = justicePriors.justice_name as string
    const perDoctrine: Record<string, DoctrineSurpriseStats> = {}

    for (const [doctrineId, rawPrior] of Object.entries(justicePriors)) {
      if (doctrineId === 'justice_name') continue
      const prior = rawPrior as DoctrinePrior

      // Skip unknown or weak priors — no clear prediction to test against
      if (prior.position === 'unknown' || prior.strength === 'weak') continue

      const casesForDoctrine = cases.filter(c => c.doctrine_ids.includes(doctrineId))
      const violationDetails: PriorViolation[] = []
      let casesEvaluated = 0

      for (const caseData of casesForDoctrine) {
        const vote = getJusticeVote(caseData, seatId)
        if (!vote) continue // Justice not on Court for this case

        const docAlign = vote.vote_aligns_with_doctrine
        const partyAlign = vote.vote_aligns_with_appointer_party
        if (!docAlign || docAlign === 'partial') continue

        casesEvaluated++

        // "supports" doctrine → expected to vote YES with doctrine
        // "opposed" doctrine → expected to vote NO with doctrine
        const expectedDocAlign: 'yes' | 'no' = prior.position === 'supports' ? 'yes' : 'no'
        const isViolation = docAlign !== expectedDocAlign

        if (isViolation) {
          violationDetails.push({
            case_id: caseData.id,
            case_title: caseData.title,
            year: caseData.year,
            doctrine_id: doctrineId,
            prior_position: prior.position,
            expected_doctrine_alignment: expectedDocAlign,
            actual_doctrine_alignment: docAlign,
            actual_party_alignment: partyAlign,
            is_party_correlated: partyAlign === 'yes',
          })
        }
      }

      const violations = violationDetails.length
      const partyCorrelated = violationDetails.filter(v => v.is_party_correlated).length

      perDoctrine[doctrineId] = {
        doctrine_id: doctrineId,
        prior_position: prior.position,
        prior_strength: prior.strength,
        cases_evaluated: casesEvaluated,
        violations,
        party_correlated_violations: partyCorrelated,
        surprise_rate: casesEvaluated > 0 ? violations / casesEvaluated : 0,
        party_correlation_rate: violations > 0 ? partyCorrelated / violations : 0,
        violation_details: violationDetails,
      }
    }

    const allViolations = Object.values(perDoctrine).flatMap(d => d.violation_details)
    const totalCases = Object.values(perDoctrine).reduce((s, d) => s + d.cases_evaluated, 0)
    const totalViolations = allViolations.length
    const totalPartyCorrelated = allViolations.filter(v => v.is_party_correlated).length

    return {
      seat_id: seatId,
      justice_name: justiceName,
      per_doctrine: perDoctrine,
      total_cases_with_prior: totalCases,
      total_violations: totalViolations,
      total_party_correlated: totalPartyCorrelated,
      overall_surprise_rate: totalCases > 0 ? totalViolations / totalCases : 0,
      overall_party_correlation_rate: totalViolations > 0 ? totalPartyCorrelated / totalViolations : 0,
    }
  })
}

export function getPriorForSeat(seatId: string, doctrineId: string): DoctrinePrior | null {
  const priors = priorsData as Record<string, Record<string, unknown>>
  const p = priors[seatId]?.[doctrineId]
  if (!p) return null
  return p as DoctrinePrior
}

export const DOCTRINE_LABELS: Record<string, string> = {
  'agency-deference': 'Agency Deference',
  'congressional-spending-authority': 'Spending Authority',
  'executive-restraint': 'Executive Restraint',
  'federalism-states-rights': 'Federalism',
  'nationwide-injunctions': 'Nationwide Injunctions',
  'presidential-immunity': 'Presidential Immunity',
  'standing-justiciability': 'Standing',
}
