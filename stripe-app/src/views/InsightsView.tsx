import {
  ContextView,
  Box,
  Badge,
  Button,
  Spinner,
  Link,
} from '@stripe/ui-extension-sdk/ui'
import { useState, useEffect } from 'react'
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context'

const LUCRUM_API_BASE = 'https://lucrumcfo.vercel.app'

interface CustomerInsight {
  customerId: string
  churnRisk: 'low' | 'medium' | 'high'
  mrrContribution: number
  daysAsCustomer: number
  recommendedAction: string
  lastPaymentStatus: string
}

const RISK_COLORS: Record<string, 'positive' | 'warning' | 'critical'> = {
  low: 'positive',
  medium: 'warning',
  high: 'critical',
}

const InsightsView = ({ userContext, environment }: ExtensionContextValue) => {
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState<CustomerInsight | null>(null)
  const [notConnected, setNotConnected] = useState(false)

  const stripeAccountId = userContext?.account?.id
  const customerId = (environment as any)?.objectContext?.id

  useEffect(() => {
    if (!stripeAccountId || !customerId) {
      setLoading(false)
      setNotConnected(true)
      return
    }

    const fetchInsight = async () => {
      try {
        const res = await fetch(
          `${LUCRUM_API_BASE}/api/stripe-app/customer?stripeAccountId=${stripeAccountId}&customerId=${customerId}`
        )
        if (!res.ok) {
          if (res.status === 404) {
            setNotConnected(true)
          }
          throw new Error('Failed to fetch')
        }
        const json = await res.json()
        setInsight(json)
      } catch {
        setNotConnected(true)
      } finally {
        setLoading(false)
      }
    }

    fetchInsight()
  }, [stripeAccountId, customerId])

  if (loading) {
    return (
      <ContextView title="Lucrum Insights">
        <Box css={{ padding: 'large', alignX: 'center' }}>
          <Spinner size="large" />
        </Box>
      </ContextView>
    )
  }

  if (notConnected || !insight) {
    return (
      <ContextView title="Lucrum Insights">
        <Box css={{ padding: 'large', stack: 'y', gapY: 'medium', alignX: 'center' }}>
          <Box css={{ textAlign: 'center' }}>
            <Box css={{ fontWeight: 'semibold', marginBottom: 'small' }}>
              Connect to Lucrum to see churn risk
            </Box>
            <Box css={{ color: 'secondary', font: 'caption' }}>
              Get AI-powered insights for every customer
            </Box>
          </Box>
          <Button
            type="primary"
            href={`${LUCRUM_API_BASE}/connect`}
            target="_blank"
          >
            Connect Lucrum →
          </Button>
        </Box>
      </ContextView>
    )
  }

  return (
    <ContextView title="Lucrum Insights">
      <Box css={{ padding: 'medium', stack: 'y', gapY: 'medium' }}>
        {/* Churn Risk */}
        <Box
          css={{
            stack: 'x',
            alignY: 'center',
            distribute: 'space-between',
            padding: 'medium',
            background: 'container',
            borderRadius: 'medium',
          }}
        >
          <Box>
            <Box css={{ font: 'caption', color: 'secondary' }}>Churn Risk</Box>
            <Box css={{ fontWeight: 'semibold', marginTop: 'xsmall' }}>
              {insight.churnRisk.charAt(0).toUpperCase() + insight.churnRisk.slice(1)}
            </Box>
          </Box>
          <Badge type={RISK_COLORS[insight.churnRisk]}>
            {insight.churnRisk.toUpperCase()}
          </Badge>
        </Box>

        {/* Metrics Grid */}
        <Box css={{ stack: 'x', gapX: 'medium', distribute: 'space-between' }}>
          <Box css={{ flex: 1 }}>
            <Box css={{ font: 'caption', color: 'secondary' }}>MRR</Box>
            <Box css={{ fontWeight: 'semibold' }}>
              ${insight.mrrContribution.toLocaleString()}
            </Box>
          </Box>
          <Box css={{ flex: 1 }}>
            <Box css={{ font: 'caption', color: 'secondary' }}>Tenure</Box>
            <Box css={{ fontWeight: 'semibold' }}>
              {insight.daysAsCustomer} days
            </Box>
          </Box>
          <Box css={{ flex: 1 }}>
            <Box css={{ font: 'caption', color: 'secondary' }}>Last Payment</Box>
            <Box css={{ fontWeight: 'semibold' }}>
              {insight.lastPaymentStatus}
            </Box>
          </Box>
        </Box>

        {/* Recommended Action */}
        {insight.recommendedAction && (
          <Box
            css={{
              padding: 'medium',
              background: 'container',
              borderRadius: 'medium',
            }}
          >
            <Box css={{ font: 'caption', color: 'secondary', marginBottom: 'xsmall' }}>
              Recommended Action
            </Box>
            <Box css={{ fontWeight: 'medium' }}>{insight.recommendedAction}</Box>
          </Box>
        )}

        {/* Link to Dashboard */}
        <Box css={{ marginTop: 'small' }}>
          <Link
            href={`${LUCRUM_API_BASE}/dashboard/customers?id=${customerId}`}
            target="_blank"
          >
            View full analysis in Lucrum →
          </Link>
        </Box>
      </Box>
    </ContextView>
  )
}

export default InsightsView
