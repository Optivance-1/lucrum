import type { SimulationConfig, SimulationResult } from '@/types'
import { safeKvGet, safeKvSet } from '@/lib/kv'

const N_SIMULATIONS = 50_000
const HORIZON_MONTHS = 24

function sampleNormal(mean: number, stdDev: number, r1: number, r2: number): number {
  const z = Math.sqrt(-2.0 * Math.log(Math.max(r1, 1e-10))) * Math.cos(2.0 * Math.PI * r2)
  return mean + stdDev * z
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function percentile(sorted: Float32Array, p: number): number {
  const idx = Math.floor(sorted.length * p)
  return sorted[Math.min(idx, sorted.length - 1)]
}

function sortFloat32(arr: Float32Array): Float32Array {
  const copy = new Float32Array(arr)
  copy.sort()
  return copy
}

function meanFloat32(arr: Float32Array): number {
  let sum = 0
  for (let i = 0; i < arr.length; i++) sum += arr[i]
  return sum / arr.length
}

export function hashSimConfig(config: SimulationConfig): string {
  const raw = `${config.currentMRR}|${config.currentBalance}|${config.monthlyBurn}|${config.churnRate}|${config.mrrGrowthRate}|${config.appliedDecision?.actionType ?? 'none'}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i)
    hash = ((hash << 5) - hash + c) | 0
  }
  return Math.abs(hash).toString(36)
}

export function runSimulation(config: SimulationConfig): SimulationResult {
  const start = Date.now()

  const totalRandomsNeeded = N_SIMULATIONS * HORIZON_MONTHS * 4
  const rawRandoms = new Uint32Array(totalRandomsNeeded)
  crypto.getRandomValues(rawRandoms)
  const randoms = new Float32Array(totalRandomsNeeded)
  for (let i = 0; i < totalRandomsNeeded; i++) {
    randoms[i] = rawRandoms[i] / 0xFFFFFFFF
  }

  const finalBalance = new Float32Array(N_SIMULATIONS)
  const failureMonth = new Float32Array(N_SIMULATIONS)
  const mrr3mo = new Float32Array(N_SIMULATIONS)
  const mrr6mo = new Float32Array(N_SIMULATIONS)
  const mrr12mo = new Float32Array(N_SIMULATIONS)
  const mrr24mo = new Float32Array(N_SIMULATIONS)

  let breakEvenCount = 0
  const appliedBurnFactor = config.appliedDecision?.actionType === 'cut_burn_aggressively' ? 0.70 : 1.0

  for (let sim = 0; sim < N_SIMULATIONS; sim++) {
    let balance = config.currentBalance
    let mrr = config.currentMRR
    let failed = 0
    let everBreakEven = false
    const rBase = sim * HORIZON_MONTHS * 4
    const simBurn = config.monthlyBurn * appliedBurnFactor

    for (let month = 1; month <= HORIZON_MONTHS; month++) {
      const rIdx = rBase + (month - 1) * 4

      const growthMean = config.mrrGrowthRate / 100
      const growthStd = Math.abs(growthMean) * 0.5 + 0.02
      let growth = sampleNormal(growthMean, growthStd, randoms[rIdx], randoms[rIdx + 1])

      const churnMean = config.churnRate / 100
      const churnStd = churnMean * 0.3 + 0.005
      let churn = clamp(sampleNormal(churnMean, churnStd, randoms[rIdx + 2], randoms[rIdx + 3]), 0, 0.40)

      if (config.appliedDecision) {
        const d = config.appliedDecision
        if (d.actionType === 'send_churn_recovery_email') churn *= (1 - d.successProbability * 0.3)
        if (d.actionType === 'apply_coupon') churn *= (1 - d.successProbability * 0.5)
        if (d.actionType === 'launch_expansion_campaign') growth += d.successProbability * 0.02
        if (d.actionType === 'raise_price') growth += 0.03
      }

      let burnMult = 1.0
      let revShock = 1.0
      const shockRoll = randoms[rIdx]
      if (shockRoll < 0.05) burnMult = 1.30
      if (shockRoll < 0.01) burnMult = 1.60
      if (shockRoll > 0.97) revShock = 1.15
      if (shockRoll > 0.99) revShock = 1.40

      mrr = Math.max(0, mrr * (1 + growth) * (1 - churn) * revShock)
      balance += mrr - (simBurn * burnMult)

      if (mrr >= simBurn) everBreakEven = true
      if (balance <= 0 && failed === 0) failed = month
      if (month === 3) mrr3mo[sim] = mrr
      if (month === 6) mrr6mo[sim] = mrr
      if (month === 12) mrr12mo[sim] = mrr
      if (month === 24) mrr24mo[sim] = mrr
    }

    if (everBreakEven) breakEvenCount++
    finalBalance[sim] = balance
    failureMonth[sim] = failed
  }

  const sortedBalance = sortFloat32(finalBalance)
  const sortedFailure = sortFloat32(failureMonth)
  const sorted3 = sortFloat32(mrr3mo)
  const sorted6 = sortFloat32(mrr6mo)
  const sorted12 = sortFloat32(mrr12mo)
  const sorted24 = sortFloat32(mrr24mo)

  // Compute runway from failure months — convert failure month to days, non-failures get horizon * 30
  const runwayDays = new Float32Array(N_SIMULATIONS)
  for (let i = 0; i < N_SIMULATIONS; i++) {
    runwayDays[i] = failureMonth[i] === 0 ? HORIZON_MONTHS * 30 : failureMonth[i] * 30
  }
  const sortedRunway = sortFloat32(runwayDays)

  const survived = (threshold: number) => {
    let count = 0
    for (let i = 0; i < N_SIMULATIONS; i++) {
      if (failureMonth[i] === 0 || failureMonth[i] > threshold) count++
    }
    return count / N_SIMULATIONS
  }

  const runway = {
    p10: percentile(sortedRunway, 0.10),
    p25: percentile(sortedRunway, 0.25),
    p50: percentile(sortedRunway, 0.50),
    p75: percentile(sortedRunway, 0.75),
    p90: percentile(sortedRunway, 0.90),
    mean: meanFloat32(runwayDays),
    probabilityOf60Days: survived(2),
    probabilityOf90Days: survived(3),
    probabilityOf180Days: survived(6),
    probabilityOf365Days: survived(12),
    probabilityOf730Days: survived(24),
  }

  const mrrForecast = {
    month3: { p25: percentile(sorted3, 0.25), p50: percentile(sorted3, 0.50), p75: percentile(sorted3, 0.75) },
    month6: { p25: percentile(sorted6, 0.25), p50: percentile(sorted6, 0.50), p75: percentile(sorted6, 0.75) },
    month12: { p25: percentile(sorted12, 0.25), p50: percentile(sorted12, 0.50), p75: percentile(sorted12, 0.75) },
    month24: { p25: percentile(sorted24, 0.25), p50: percentile(sorted24, 0.50), p75: percentile(sorted24, 0.75) },
  }

  const bearIdx = Math.floor(N_SIMULATIONS * 0.10)
  const baseIdx = Math.floor(N_SIMULATIONS * 0.50)
  const bullIdx = Math.floor(N_SIMULATIONS * 0.90)
  const scenarios = {
    bear: {
      probability: 0.20,
      runway: sortedRunway[bearIdx],
      mrr3mo: sorted3[bearIdx],
      mrr12mo: sorted12[bearIdx],
      description: 'Headwinds persist — churn stays elevated, growth stalls',
    },
    base: {
      probability: 0.60,
      runway: sortedRunway[baseIdx],
      mrr3mo: sorted3[baseIdx],
      mrr12mo: sorted12[baseIdx],
      description: 'Current trajectory holds — moderate growth, managed churn',
    },
    bull: {
      probability: 0.20,
      runway: sortedRunway[bullIdx],
      mrr3mo: sorted3[bullIdx],
      mrr12mo: sorted12[bullIdx],
      description: 'Breakout growth — retention improves, expansion kicks in',
    },
  }

  const survProb180 = runway.probabilityOf180Days
  const riskScore = clamp(
    (1 - survProb180) * 50 +
    (config.churnRate / 20) * 25 +
    (runway.p50 < 60 * 30 ? 25 : runway.p50 < 90 * 30 ? 15 : 0),
    0,
    100
  )

  const elapsed = Date.now() - start
  console.log(`[monte-carlo] ${N_SIMULATIONS} runs in ${elapsed}ms`)
  if (elapsed > 1500) console.warn(`[monte-carlo] WARNING: simulation took ${elapsed}ms (target <400ms)`)

  return {
    runway,
    mrrForecast,
    scenarios,
    riskScore: Math.round(riskScore),
    volatilityScore: Math.round(runway.p75 - runway.p25),
    breakEvenProbability: breakEvenCount / N_SIMULATIONS,
    baselineRunwayP50: 0,
    decisionLiftP50: 0,
    nSimulations: N_SIMULATIONS,
    computedAt: Date.now(),
    horizonMonths: HORIZON_MONTHS,
  }
}

export async function getCachedSimulation(userId: string, config: SimulationConfig): Promise<SimulationResult | null> {
  try {
    const hash = hashSimConfig(config)
    return await safeKvGet<SimulationResult>(`sim:${userId}:${hash}`)
  } catch {
    return null
  }
}

export async function cacheSimulation(userId: string, config: SimulationConfig, result: SimulationResult): Promise<void> {
  try {
    const hash = hashSimConfig(config)
    await safeKvSet(`sim:${userId}:${hash}`, result, 1800)
  } catch {
    // best-effort
  }
}
