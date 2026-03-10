import type {
  StripeMetrics,
  StripeCustomer,
  DecisionScore,
  SimulationConfig,
  SimulationResult,
  Move,
  MoveRisk,
  FiveMovesResult,
} from '@/types'
import { scoreDecisions } from '@/lib/decision-scorer'
import { runSimulation, hashSimConfig, getCachedSimulation, cacheSimulation } from '@/lib/monte-carlo'
import { callHeavyAI, stripThinking } from '@/lib/ai-client'
import { safeKvGet, safeKvSet } from '@/lib/kv'

const RISK_COLORS: Record<MoveRisk, string> = {
  cutthroat: '#FF3B5C',
  aggressive: '#FF8C00',
  balanced: '#C9A84C',
  conservative: '#00A066',
  safe: '#00D084',
}

const RISK_LABELS: Record<MoveRisk, string> = {
  cutthroat: 'Cutthroat — Maximum EV',
  aggressive: 'Aggressive — High Upside',
  balanced: 'Balanced — Best Risk-Adj',
  conservative: 'Conservative — Protect Position',
  safe: 'Safe — Minimum Viable Action',
}

function buildSimConfig(metrics: StripeMetrics, decision?: DecisionScore | null): SimulationConfig {
  return {
    currentMRR: metrics.mrr,
    currentBalance: metrics.availableBalance,
    monthlyBurn: metrics.estimatedMonthlyBurn,
    mrrGrowthRate: metrics.mrrGrowth,
    churnRate: metrics.churnRate,
    appliedDecision: decision
      ? { actionType: decision.actionType, successProbability: decision.successProbability }
      : null,
  }
}

function runSimForDecisions(metrics: StripeMetrics, decisions: DecisionScore[]): SimulationResult {
  const primary = decisions[0] ?? null
  return runSimulation(buildSimConfig(metrics, primary))
}

function computeMoveMetrics(
  move: { actions: DecisionScore[]; simulation: SimulationResult },
  baseline: SimulationResult
) {
  const sim = move.simulation
  return {
    expectedRunwayGain: Math.round(sim.runway.p50 - baseline.runway.p50),
    expectedMRRAt90d: Math.round(sim.mrrForecast.month3.p50),
    expectedMRRAt365d: Math.round(sim.mrrForecast.month12.p50),
    survivalProbability: sim.runway.probabilityOf180Days,
    expectedDollarImpact: move.actions.reduce((s, a) => s + a.estimatedDollarImpact, 0),
    riskOfBackfire: Math.max(0, 1 - sim.runway.probabilityOf180Days),
    compositeScore: move.actions.length
      ? move.actions.reduce((s, a) => s + a.compositeScore, 0) / move.actions.length
      : 0,
  }
}

function deterministicFallback(
  rank: 1 | 2 | 3 | 4 | 5,
  risk: MoveRisk,
  actions: DecisionScore[],
  sim: SimulationResult,
  baseline: SimulationResult
): Omit<Move, 'metrics' | 'simulation' | 'actions'> {
  const label = actions.map(a => a.label).join(' + ') || 'Hold position'
  const gain = Math.round(sim.runway.p50 - baseline.runway.p50)
  return {
    rank,
    risk,
    riskLabel: RISK_LABELS[risk],
    riskColor: RISK_COLORS[risk],
    title: `${risk.charAt(0).toUpperCase() + risk.slice(1)}: ${label}`,
    summary: `Execute ${label} to shift runway by ${gain > 0 ? '+' : ''}${gain} days.`,
    rationale: `Simulations show median survival at ${(sim.runway.probabilityOf180Days * 100).toFixed(0)}% over 180 days. Composite score: ${actions[0]?.compositeScore?.toFixed(0) ?? 0}/100.`,
    tradeoff: risk === 'safe' ? 'Minimal downside, but limited upside.' : `Higher reward but ${(1 - sim.runway.probabilityOf180Days) * 100 > 20 ? 'meaningful' : 'modest'} backfire risk.`,
    maxStatement: `50,000 simulations ran. ${label} gives you +${gain} days of runway with ${(sim.runway.probabilityOf180Days * 100).toFixed(0)}% 180-day survival. The math supports this move.`,
    timeToExecute: risk === 'safe' || risk === 'conservative' ? 'Execute now' : risk === 'balanced' ? 'This week' : 'This month',
  }
}

export async function generateFiveMoves(
  metrics: StripeMetrics,
  customers: StripeCustomer[],
  userId: string
): Promise<FiveMovesResult> {
  const baseConfig = buildSimConfig(metrics)
  const cacheKey = `fivemoves:${userId}:${hashSimConfig(baseConfig)}`

  const cached = await safeKvGet<FiveMovesResult>(cacheKey)
  if (cached && cached.generatedAt && Date.now() - cached.generatedAt < 30 * 60 * 1000) {
    return cached
  }

  const decisions = scoreDecisions(metrics, customers)
  const baseline = runSimulation(baseConfig)
  baseline.baselineRunwayP50 = baseline.runway.p50

  // Construct 5 move candidates
  const moveSpecs: Array<{ rank: 1 | 2 | 3 | 4 | 5; risk: MoveRisk; actions: DecisionScore[] }> = []

  // MOVE 1 — CUTTHROAT: top 2 by composite regardless of risk
  const top2 = decisions.filter(d => d.actionType !== 'do_nothing').slice(0, 2)
  moveSpecs.push({ rank: 1, risk: 'cutthroat', actions: top2 })

  // MOVE 2 — AGGRESSIVE: top decision + first safe-ish one
  const aggressiveSecond = decisions.find(d => d.riskTier >= 3 && d.actionType !== 'do_nothing' && d !== top2[0])
  moveSpecs.push({ rank: 2, risk: 'aggressive', actions: [decisions[0], aggressiveSecond].filter((d): d is DecisionScore => d != null && d.actionType !== 'do_nothing') })

  // MOVE 3 — BALANCED: reversibility >= 60, top 2
  const balancedActions = decisions.filter(d => d.scores.reversibility >= 60 && d.actionType !== 'do_nothing').slice(0, 2)
  moveSpecs.push({ rank: 3, risk: 'balanced', actions: balancedActions.length ? balancedActions : [decisions.find(d => d.actionType !== 'do_nothing')!].filter(Boolean) })

  // MOVE 4 — CONSERVATIVE: fully reversible, top 1
  const conservativeAction = decisions.find(d => d.scores.reversibility === 100 && d.actionType !== 'do_nothing')
  moveSpecs.push({ rank: 4, risk: 'conservative', actions: conservativeAction ? [conservativeAction] : [] })

  // MOVE 5 — SAFE: riskTier 5 with max confidence
  const safeActions = decisions.filter(d => d.riskTier === 5 && d.actionType !== 'do_nothing')
  const safest = safeActions.sort((a, b) => b.scores.confidence - a.scores.confidence)[0]
  moveSpecs.push({ rank: 5, risk: 'safe', actions: safest ? [safest] : [] })

  // Run simulations for each
  const movesWithSims = moveSpecs.map(spec => ({
    ...spec,
    simulation: spec.actions.length ? runSimForDecisions(metrics, spec.actions) : baseline,
  }))

  // Compute metrics
  const movesWithMetrics = movesWithSims.map(m => ({
    ...m,
    metrics: computeMoveMetrics(m, baseline),
  }))

  // Build AI prompt
  let dataQuality: FiveMovesResult['dataQuality'] = 'high'

  const prompt = `You are MAX, AI CFO inside Lucrum.
50,000 Monte Carlo simulations just ran across 5 strategic moves.
Write the human interpretation layer.
Be direct. Sound like a brilliant CFO texting a founder.
Reference exact numbers. Never say "it depends".

FOUNDER STATE:
MRR: $${metrics.mrr} | Growth: ${metrics.mrrGrowth}% MoM
Churn: ${metrics.churnRate}% | Runway: ${metrics.runway}d straight-line
Cash: $${metrics.availableBalance} | Burn: $${metrics.estimatedMonthlyBurn}/mo

BASELINE (doing nothing):
Median runway: ${Math.round(baseline.runway.p50)}d
180d survival: ${(baseline.runway.probabilityOf180Days * 100).toFixed(0)}%
Risk score: ${baseline.riskScore}/100
MRR in 12mo: $${Math.round(baseline.mrrForecast.month12.p50)}

${movesWithMetrics.map((m, i) => `
MOVE ${i + 1} — ${m.risk.toUpperCase()}
Actions: ${m.actions.map(a => a.label).join(' + ') || 'Hold'}
Simulation vs baseline:
  Runway gain: +${m.metrics.expectedRunwayGain}d
  180d survival: ${(m.metrics.survivalProbability * 100).toFixed(0)}%
  MRR at 90d: $${m.metrics.expectedMRRAt90d}
  MRR at 12mo: $${m.metrics.expectedMRRAt365d}
  Backfire risk: ${(m.metrics.riskOfBackfire * 100).toFixed(0)}%
  Composite score: ${m.metrics.compositeScore.toFixed(0)}/100
`).join('')}

For EACH of the 5 moves write:
  title: 4-6 word punchy title
  summary: 1 sentence what this move does
  rationale: 2 sentences why the math supports this
  tradeoff: 1 sentence what the founder gives up
  maxStatement: MAX's direct take, under 60 words, first person, reference the numbers
  timeToExecute: "Execute now" OR "This week" OR "This month"

Respond ONLY with valid JSON — no markdown, no preamble:
{
  "moves": [
    { "rank":1, "title":"...", "summary":"...", "rationale":"...", "tradeoff":"...", "maxStatement":"...", "timeToExecute":"..." },
    { "rank":2, "title":"...", "summary":"...", "rationale":"...", "tradeoff":"...", "maxStatement":"...", "timeToExecute":"..." },
    { "rank":3, "title":"...", "summary":"...", "rationale":"...", "tradeoff":"...", "maxStatement":"...", "timeToExecute":"..." },
    { "rank":4, "title":"...", "summary":"...", "rationale":"...", "tradeoff":"...", "maxStatement":"...", "timeToExecute":"..." },
    { "rank":5, "title":"...", "summary":"...", "rationale":"...", "tradeoff":"...", "maxStatement":"...", "timeToExecute":"..." }
  ]
}`

  let aiMoves: Array<{ rank: number; title: string; summary: string; rationale: string; tradeoff: string; maxStatement: string; timeToExecute: string }> | null = null

  try {
    const raw = stripThinking(await callHeavyAI(undefined, prompt))
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed.moves) && parsed.moves.length === 5) {
        aiMoves = parsed.moves
      }
    }
  } catch (err) {
    console.error('[five-moves] AI interpretation failed:', err)
    dataQuality = 'low'
  }

  const moves: Move[] = movesWithMetrics.map((m, i) => {
    const ai = aiMoves?.[i]
    const fallback = deterministicFallback(m.rank, m.risk, m.actions, m.simulation, baseline)

    return {
      rank: m.rank,
      risk: m.risk,
      riskLabel: RISK_LABELS[m.risk],
      riskColor: RISK_COLORS[m.risk],
      title: ai?.title ?? fallback.title,
      summary: ai?.summary ?? fallback.summary,
      rationale: ai?.rationale ?? fallback.rationale,
      tradeoff: ai?.tradeoff ?? fallback.tradeoff,
      actions: m.actions,
      simulation: m.simulation,
      metrics: m.metrics,
      maxStatement: ai?.maxStatement ?? fallback.maxStatement,
      timeToExecute: ai?.timeToExecute ?? fallback.timeToExecute,
    }
  })

  const result: FiveMovesResult = {
    moves,
    baselineSimulation: baseline,
    generatedAt: Date.now(),
    dataQuality: aiMoves ? 'high' : 'low',
  }

  await safeKvSet(cacheKey, result, 1800)

  return result
}
