export interface StripeMetrics {
  mrr: number
  revenue: number
  revenueGrowth: number
  activeSubscriptions: number
  newCustomers: number
  availableBalance: number
  dailyRevenue: { day: string; revenue: number }[]
  recentEvents: StripeEvent[]
}

export interface StripeEvent {
  id: string
  amount: number
  currency: string
  description: string
  customer: string | null
  created: number
  status: string
  paid: boolean
}

export interface AIInsight {
  type: 'warning' | 'opportunity' | 'risk' | 'win'
  title: string
  body: string
  action: string
  priority: 'high' | 'medium' | 'low'
}

export interface CFOContext {
  mrr: number
  mrrGrowth: number
  revenue: number
  customers: number
  churnRate: number
  runway: number
}
