import type { AffiliateProduct, StripeMetrics } from '@/types'

export const AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  {
    id: 'clearco',
    name: 'Clearco',
    category: 'financing',
    tagline: 'Revenue-based financing for SaaS',
    description: 'Get non-dilutive capital based on your recurring revenue. No equity given up.',
    ctaText: 'Check eligibility',
    affiliateUrl: 'https://clearco.com?ref=lucrum',
    triggerConditions: { minMRR: 1000, requiresRevenue: true },
    maxRecommendationContext: 'This founder has steady MRR and could benefit from non-dilutive growth capital via Clearco.',
    priority: 1,
  },
  {
    id: 'capchase',
    name: 'Capchase',
    category: 'financing',
    tagline: 'Turn annual contracts into upfront cash',
    description: 'Advance your annual subscription revenue so you can invest in growth today.',
    ctaText: 'Get funded',
    affiliateUrl: 'https://capchase.com?ref=lucrum',
    triggerConditions: { minMRR: 5000, requiresRevenue: true },
    maxRecommendationContext: 'With strong MRR this founder could accelerate growth by advancing annual contract revenue through Capchase.',
    priority: 2,
  },
  {
    id: 'arc',
    name: 'Arc',
    category: 'financing',
    tagline: 'The startup banking platform',
    description: 'Higher yield on idle cash, fast wire transfers, and startup-friendly banking.',
    ctaText: 'Open account',
    affiliateUrl: 'https://arc.tech?ref=lucrum',
    triggerConditions: { minMRR: 500 },
    maxRecommendationContext: 'This founder has meaningful cash reserves that could earn higher yield with Arc banking.',
    priority: 3,
  },
  {
    id: 'brex',
    name: 'Brex',
    category: 'credit',
    tagline: 'Corporate card with no personal guarantee',
    description: 'High-limit corporate card built for startups. Earn points on SaaS spend.',
    ctaText: 'Apply now',
    affiliateUrl: 'https://brex.com?ref=lucrum',
    triggerConditions: { minMRR: 2000, requiresRevenue: true },
    maxRecommendationContext: 'With growing revenue this founder qualifies for a high-limit Brex card to manage expenses.',
    priority: 4,
  },
  {
    id: 'ramp',
    name: 'Ramp',
    category: 'credit',
    tagline: 'Save 5% on average with smart spend controls',
    description: 'Corporate card with automatic savings insights and spend management.',
    ctaText: 'Start saving',
    affiliateUrl: 'https://ramp.com?ref=lucrum',
    triggerConditions: { minMRR: 1000, requiresRevenue: true },
    maxRecommendationContext: 'Ramp could help this founder cut unnecessary spend — important given their burn rate.',
    priority: 5,
  },
  {
    id: 'stripe_capital',
    name: 'Stripe Capital',
    category: 'saas_lending',
    tagline: 'Funding from Stripe, repaid from your sales',
    description: 'Get a loan offer from Stripe, repaid automatically as a percentage of sales.',
    ctaText: 'Check offers',
    affiliateUrl: 'https://stripe.com/capital?ref=lucrum',
    triggerConditions: { minMRR: 3000, requiresRevenue: true, accountAgeDays: 90 },
    maxRecommendationContext: 'This established Stripe merchant may qualify for Stripe Capital — fast funding with automatic repayment.',
    priority: 6,
  },
  {
    id: 'bench',
    name: 'Bench',
    category: 'accounting',
    tagline: 'Bookkeeping done for you',
    description: 'Professional bookkeeping with a dedicated team. Tax-ready financials every month.',
    ctaText: 'Get started',
    affiliateUrl: 'https://bench.co?ref=lucrum',
    triggerConditions: { minMRR: 500, requiresRevenue: true },
    maxRecommendationContext: 'Bench handles bookkeeping so this founder can focus on growth instead of spreadsheets.',
    priority: 7,
  },
  {
    id: 'pilot',
    name: 'Pilot',
    category: 'accounting',
    tagline: 'Bookkeeping, tax, and CFO services for startups',
    description: 'Expert bookkeeping backed by software, designed for high-growth companies.',
    ctaText: 'See pricing',
    affiliateUrl: 'https://pilot.com?ref=lucrum',
    triggerConditions: { minMRR: 5000, requiresRevenue: true },
    maxRecommendationContext: 'With significant revenue, Pilot can provide the bookkeeping and CFO support this founder needs.',
    priority: 8,
  },
]

function meetsConditions(
  product: AffiliateProduct,
  metrics: Pick<StripeMetrics, 'mrr' | 'runway' | 'churnRate' | 'accountAgeDays' | 'revenue30d'>
): boolean {
  const c = product.triggerConditions
  if (c.requiresRevenue && metrics.revenue30d <= 0) return false
  if (c.minMRR != null && metrics.mrr < c.minMRR) return false
  if (c.maxMRR != null && metrics.mrr > c.maxMRR) return false
  if (c.minRunway != null && metrics.runway < c.minRunway) return false
  if (c.maxRunway != null && metrics.runway > c.maxRunway) return false
  if (c.minChurn != null && metrics.churnRate < c.minChurn) return false
  if (c.accountAgeDays != null && metrics.accountAgeDays < c.accountAgeDays) return false
  return true
}

export function getEligibleAffiliates(
  metrics: Pick<StripeMetrics, 'mrr' | 'runway' | 'churnRate' | 'accountAgeDays' | 'revenue30d'>
): AffiliateProduct[] {
  return AFFILIATE_PRODUCTS
    .filter(p => meetsConditions(p, metrics))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 2)
}

export function getAffiliateById(id: string): AffiliateProduct | undefined {
  return AFFILIATE_PRODUCTS.find(p => p.id === id)
}
