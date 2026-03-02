export interface SimulationBaseline {
  currentMrr: number
  availableCash: number
  monthlyRevenueMean: number
  monthlyRevenueStdDev: number
  monthlyOperatingOutflow: number
  monthlyChurnRate: number
  expectedMonthlyChurnEvents: number
  avgRevenuePerSubscription: number
  margin: number
  monthlyGrowthRate: number
  monthlyGrowthVolatility: number
}

export interface ScenarioModifiers {
  growthDelta: number
  marginDelta: number
  monthlyFixedCostDelta: number
  churnDelta: number
  revenueVolatilityMultiplier: number
}

export interface ParsedScenario {
  raw: string
  normalized: string
  modifiers: ScenarioModifiers
  notes: string[]
  summary: string
}

export interface PercentileBand {
  p10: number
  p50: number
  p90: number
}

export interface RunwayBand extends PercentileBand {
  best: number
  worst: number
}

export interface MonteCarloOptions {
  iterations?: number
  months?: number
}

export interface MonteCarloOutput {
  iterations: number
  months: number
  runwayMonths: RunwayBand
  cashAtMonths: {
    m6: PercentileBand
    m12: PercentileBand
    m18: PercentileBand
  }
  confidence: number
  survivalRate12m: number
}

interface SimulatedPath {
  runwayMonths: number
  cashTimeline: number[]
}

interface Rng {
  (): number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = clamp((p / 100) * (sorted.length - 1), 0, sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  const weight = idx - lo
  return sorted[lo] * (1 - weight) + sorted[hi] * weight
}

function sampleUniform(min: number, max: number, rng: Rng): number {
  return min + (max - min) * rng()
}

function sampleNormal(meanValue: number, stdValue: number, rng: Rng): number {
  if (stdValue <= 0) return meanValue
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return meanValue + z * stdValue
}

function samplePoisson(lambda: number, rng: Rng): number {
  const safeLambda = Math.max(0, lambda)
  if (safeLambda === 0) return 0

  if (safeLambda > 30) {
    return Math.max(0, Math.round(sampleNormal(safeLambda, Math.sqrt(safeLambda), rng)))
  }

  const l = Math.exp(-safeLambda)
  let p = 1
  let k = 0
  do {
    k += 1
    p *= rng()
  } while (p > l)
  return k - 1
}

function parseCurrencyMagnitude(raw: string, hasK: boolean): number {
  const sanitized = raw.replace(/,/g, '')
  const numeric = Number(sanitized)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return hasK ? numeric * 1000 : numeric
}

export function parseScenario(input: string): ParsedScenario {
  const raw = (input ?? '').trim()
  const normalized = raw.toLowerCase()

  const modifiers: ScenarioModifiers = {
    growthDelta: 0,
    marginDelta: 0,
    monthlyFixedCostDelta: 0,
    churnDelta: 0,
    revenueVolatilityMultiplier: 1,
  }
  const notes: string[] = []

  if (!normalized || normalized === 'baseline') {
    notes.push('Baseline projection with no scenario deltas.')
  }

  const cutAdsMatch = normalized.match(/cut\s+ads?(?:\s+by)?\s+(\d{1,2}(?:\.\d+)?)\s*%/)
  if (cutAdsMatch?.[1]) {
    const pct = clamp(Number(cutAdsMatch[1]) / 100, 0, 0.9)
    modifiers.marginDelta += pct * 0.5
    modifiers.growthDelta -= pct / 6
    notes.push(`Cut ads ${Math.round(pct * 100)}%: margin up, growth down.`)
  }

  const churnMatch = normalized.match(/churn\s*([+-]\s*\d{1,2}(?:\.\d+)?)\s*%/)
  if (churnMatch?.[1]) {
    const churnDeltaPct = Number(churnMatch[1].replace(/\s+/g, '')) / 100
    modifiers.churnDelta += churnDeltaPct
    modifiers.growthDelta -= Math.max(0, churnDeltaPct * 0.6)
    notes.push(`Churn shifted by ${Math.round(churnDeltaPct * 100)}%.`)
  }

  const addSpendMatch = normalized.match(/(?:add|hire|spend|invest)\s+\$?\s*([\d,.]+)\s*(k)?/)
  if (addSpendMatch?.[1]) {
    const amount = parseCurrencyMagnitude(addSpendMatch[1], Boolean(addSpendMatch[2]))
    if (amount > 0) {
      modifiers.monthlyFixedCostDelta += amount
      const roleBoost = /(designer|dev|developer|engineer|growth)/.test(normalized) ? 0.03 : 0.015
      modifiers.growthDelta += roleBoost
      notes.push(`Added ${Math.round(amount).toLocaleString('en-US')} in monthly spend.`)
    }
  }

  const priceRaiseMatch = normalized.match(/(?:raise|increase|price)\D+(\d{1,2}(?:\.\d+)?)\s*%/)
  if (priceRaiseMatch?.[1]) {
    const pct = clamp(Number(priceRaiseMatch[1]) / 100, 0, 0.5)
    modifiers.growthDelta += pct * 0.2
    modifiers.marginDelta += pct * 0.35
    modifiers.churnDelta += pct * 0.25
    notes.push(`Price moved by ${Math.round(pct * 100)}%: margin up with churn risk.`)
  }

  if (/pause\s+hires?|freeze\s+hiring/.test(normalized)) {
    modifiers.monthlyFixedCostDelta -= 2000
    modifiers.marginDelta += 0.03
    modifiers.growthDelta -= 0.01
    notes.push('Hiring freeze: lower spend, slightly slower growth.')
  }

  if (/optimi[sz]e|trim|reduce\s+cost/.test(normalized) && notes.length === 0) {
    modifiers.marginDelta += 0.05
    modifiers.growthDelta -= 0.01
    notes.push('General efficiency push: moderate margin gain with slight growth drag.')
  }

  if (notes.length === 0) {
    notes.push('Scenario not explicitly recognized, applied neutral assumptions.')
  }

  modifiers.revenueVolatilityMultiplier = clamp(
    1 + Math.abs(modifiers.churnDelta) * 1.5 + (modifiers.monthlyFixedCostDelta > 0 ? 0.08 : 0),
    0.7,
    2.2
  )
  modifiers.marginDelta = clamp(modifiers.marginDelta, -0.5, 0.5)
  modifiers.growthDelta = clamp(modifiers.growthDelta, -0.5, 0.5)
  modifiers.churnDelta = clamp(modifiers.churnDelta, -0.4, 0.8)

  return {
    raw,
    normalized,
    modifiers,
    notes,
    summary: notes.join(' '),
  }
}

function simulatePath(
  baseline: SimulationBaseline,
  scenario: ParsedScenario,
  months: number,
  rng: Rng
): SimulatedPath {
  const revenueBase = Math.max(1, baseline.monthlyRevenueMean || baseline.currentMrr || 1)
  const revenueStd = Math.max(revenueBase * 0.05, baseline.monthlyRevenueStdDev || revenueBase * 0.15)
  const outflowBase = Math.max(1, baseline.monthlyOperatingOutflow || revenueBase * 0.8)
  const growthVol = Math.max(0.005, baseline.monthlyGrowthVolatility || 0.03)
  const marginBase = clamp(
    Number.isFinite(baseline.margin) ? baseline.margin : 1 - outflowBase / revenueBase,
    -0.8,
    0.95
  )
  const churnEventsBase = Math.max(0.05, baseline.expectedMonthlyChurnEvents || 0.1)
  const avgRevenuePerSub = Math.max(1, baseline.avgRevenuePerSubscription || baseline.currentMrr || 1)

  const cashTimeline: number[] = []
  const netCashHistory: number[] = []

  let cash = Math.max(0, baseline.availableCash)
  let mrr = Math.max(0, baseline.currentMrr || revenueBase)
  let carriedCashIn = 0
  let runwayMonths: number | null = null

  for (let month = 1; month <= months; month += 1) {
    const growthNoise = sampleNormal(0, growthVol, rng)
    const monthGrowth = clamp(
      baseline.monthlyGrowthRate + scenario.modifiers.growthDelta + growthNoise,
      -0.6,
      0.6
    )
    mrr = Math.max(0, mrr * (1 + monthGrowth))

    const churnEvents = samplePoisson(
      churnEventsBase * (1 + scenario.modifiers.churnDelta),
      rng
    )
    const churnRate = clamp(
      baseline.monthlyChurnRate + scenario.modifiers.churnDelta + churnEvents * 0.004,
      0,
      0.7
    )
    const churnDrag = churnRate * avgRevenuePerSub * Math.max(1, churnEvents)

    const revenueMean = Math.max(0, mrr - churnDrag)
    const recognizedRevenue = Math.max(
      0,
      sampleNormal(
        revenueMean,
        revenueStd * scenario.modifiers.revenueVolatilityMultiplier,
        rng
      )
    )

    const payoutDelayDays = sampleUniform(1, 14, rng)
    const delayedFraction = payoutDelayDays / 30
    const cashIn = carriedCashIn + recognizedRevenue * (1 - delayedFraction)
    carriedCashIn = recognizedRevenue * delayedFraction

    const margin = clamp(marginBase + scenario.modifiers.marginDelta, -0.6, 0.95)
    const outflowByMargin = recognizedRevenue * (1 - margin)
    const outflowNoise = sampleNormal(0, outflowBase * 0.08, rng)
    const outflow = Math.max(
      0,
      Math.max(outflowByMargin, outflowBase + outflowNoise) + scenario.modifiers.monthlyFixedCostDelta
    )

    const netCash = cashIn - outflow
    const startingCash = cash
    cash += netCash
    netCashHistory.push(netCash)
    cashTimeline.push(cash)

    if (runwayMonths == null && cash <= 0) {
      if (netCash < 0 && startingCash > 0) {
        const fraction = clamp(startingCash / Math.abs(netCash), 0, 1)
        runwayMonths = (month - 1) + fraction
      } else {
        runwayMonths = month
      }
    }
  }

  if (runwayMonths == null) {
    const trailingNet = mean(netCashHistory.slice(-3))
    if (trailingNet < 0) {
      runwayMonths = months + clamp(cash / Math.abs(trailingNet), 0, 24)
    } else {
      runwayMonths = months + 24
    }
  }

  return {
    runwayMonths,
    cashTimeline,
  }
}

function roundBand(values: PercentileBand): PercentileBand {
  return {
    p10: Math.round(values.p10),
    p50: Math.round(values.p50),
    p90: Math.round(values.p90),
  }
}

export function runMonteCarlo(
  baseline: SimulationBaseline,
  scenario: ParsedScenario,
  options: MonteCarloOptions = {}
): MonteCarloOutput {
  const iterations = Math.round(clamp(options.iterations ?? 10000, 1000, 20000))
  const months = Math.round(clamp(options.months ?? 18, 6, 36))
  const rng = Math.random

  const runways: number[] = []
  const cashAt6: number[] = []
  const cashAt12: number[] = []
  const cashAt18: number[] = []

  for (let i = 0; i < iterations; i += 1) {
    const path = simulatePath(baseline, scenario, months, rng)
    runways.push(path.runwayMonths)

    const at6 = path.cashTimeline[Math.min(5, path.cashTimeline.length - 1)] ?? path.cashTimeline[path.cashTimeline.length - 1] ?? 0
    const at12 = path.cashTimeline[Math.min(11, path.cashTimeline.length - 1)] ?? path.cashTimeline[path.cashTimeline.length - 1] ?? 0
    const at18 = path.cashTimeline[Math.min(17, path.cashTimeline.length - 1)] ?? path.cashTimeline[path.cashTimeline.length - 1] ?? 0
    cashAt6.push(at6)
    cashAt12.push(at12)
    cashAt18.push(at18)
  }

  const runwayP10 = percentile(runways, 10)
  const runwayP50 = percentile(runways, 50)
  const runwayP90 = percentile(runways, 90)
  const runwaySpread = Math.max(0, runwayP90 - runwayP10)
  const survivalRate12m = runways.filter(r => r >= 12).length / runways.length
  const spreadPenalty = clamp(runwaySpread * 2, 0, 40)
  const confidence = Math.round(clamp(survivalRate12m * 100 + 18 - spreadPenalty, 5, 99))

  return {
    iterations,
    months,
    runwayMonths: {
      p10: Number(runwayP10.toFixed(1)),
      p50: Number(runwayP50.toFixed(1)),
      p90: Number(runwayP90.toFixed(1)),
      best: Number(runwayP90.toFixed(1)),
      worst: Number(runwayP10.toFixed(1)),
    },
    cashAtMonths: {
      m6: roundBand({
        p10: percentile(cashAt6, 10),
        p50: percentile(cashAt6, 50),
        p90: percentile(cashAt6, 90),
      }),
      m12: roundBand({
        p10: percentile(cashAt12, 10),
        p50: percentile(cashAt12, 50),
        p90: percentile(cashAt12, 90),
      }),
      m18: roundBand({
        p10: percentile(cashAt18, 10),
        p50: percentile(cashAt18, 50),
        p90: percentile(cashAt18, 90),
      }),
    },
    confidence,
    survivalRate12m: Number((survivalRate12m * 100).toFixed(1)),
  }
}

export function deriveRevenueVolatilityRatio(monthlyRevenueMean: number, monthlyRevenueStdDev: number): number {
  if (monthlyRevenueMean <= 0) return 0
  return clamp(monthlyRevenueStdDev / monthlyRevenueMean, 0, 2)
}

export function deriveGrowthVolatility(monthlyRevenueMean: number, monthlyRevenueStdDev: number): number {
  const ratio = deriveRevenueVolatilityRatio(monthlyRevenueMean, monthlyRevenueStdDev)
  return clamp(ratio * 0.18, 0.01, 0.15)
}

export function calculateStdDev(values: number[]): number {
  return stdDev(values)
}
