import {
  ContextView,
  Box,
  Inline,
  Badge,
  Button,
  Icon,
  Link,
  Spinner,
} from '@stripe/ui-extension-sdk/ui'
import { useState, useEffect } from 'react'
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context'

import MetricCard from '../components/MetricCard'
import MoveCard from '../components/MoveCard'
import ConnectPrompt from '../components/ConnectPrompt'

const LUCRUM_API_BASE = 'https://lucrumcfo.vercel.app'

interface SummaryData {
  connected: boolean
  mrr?: number
  runway?: number
  churnRate?: number
  topMove?: {
    title: string
    summary: string
    risk: string
    riskColor: string
  }
  leakCount?: number
  leakValue?: number
  connectUrl: string
}

const AppView = ({ userContext, environment }: ExtensionContextValue) => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stripeAccountId = userContext?.account?.id

  useEffect(() => {
    if (!stripeAccountId) {
      setLoading(false)
      return
    }

    const fetchSummary = async () => {
      try {
        const res = await fetch(
          `${LUCRUM_API_BASE}/api/stripe-app/summary?stripeAccountId=${stripeAccountId}`
        )
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError('Unable to load Lucrum data')
        setData({ connected: false, connectUrl: `${LUCRUM_API_BASE}/connect` })
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [stripeAccountId])

  if (loading) {
    return (
      <ContextView title="Lucrum CFO">
        <Box css={{ padding: 'large', stack: 'y', alignX: 'center' }}>
          <Spinner size="large" />
          <Box css={{ marginTop: 'medium', color: 'secondary' }}>
            Loading your AI CFO insights...
          </Box>
        </Box>
      </ContextView>
    )
  }

  if (!data?.connected) {
    return (
      <ContextView title="Lucrum CFO">
        <ConnectPrompt connectUrl={data?.connectUrl || `${LUCRUM_API_BASE}/connect`} />
      </ContextView>
    )
  }

  return (
    <ContextView
      title="Lucrum CFO"
      actions={
        <Button
          type="primary"
          href={`${LUCRUM_API_BASE}/dashboard`}
          target="_blank"
        >
          Open Lucrum
        </Button>
      }
    >
      <Box css={{ padding: 'medium', stack: 'y', gapY: 'medium' }}>
        {/* Key Metrics */}
        <Box css={{ stack: 'x', gapX: 'medium', distribute: 'space-between' }}>
          <MetricCard
            label="MRR"
            value={`$${(data.mrr ?? 0).toLocaleString()}`}
            trend="neutral"
          />
          <MetricCard
            label="Runway"
            value={data.runway === 9999 ? '∞' : `${data.runway ?? 0}d`}
            trend={(data.runway ?? 0) > 90 ? 'positive' : 'negative'}
          />
          <MetricCard
            label="Churn"
            value={`${data.churnRate ?? 0}%`}
            trend={(data.churnRate ?? 0) < 5 ? 'positive' : 'negative'}
          />
        </Box>

        {/* Revenue Leaks Alert */}
        {(data.leakCount ?? 0) > 0 && (
          <Box
            css={{
              padding: 'medium',
              background: 'container',
              borderRadius: 'medium',
              stack: 'x',
              alignY: 'center',
              distribute: 'space-between',
            }}
          >
            <Inline css={{ stack: 'x', gapX: 'small', alignY: 'center' }}>
              <Icon name="warning" css={{ color: 'warning' }} />
              <Box>
                <Box css={{ fontWeight: 'semibold' }}>
                  {data.leakCount} revenue leak{data.leakCount !== 1 ? 's' : ''} detected
                </Box>
                <Box css={{ color: 'secondary', font: 'caption' }}>
                  ${(data.leakValue ?? 0).toLocaleString()} recoverable
                </Box>
              </Box>
            </Inline>
            <Link href={`${LUCRUM_API_BASE}/dashboard`} target="_blank">
              Fix now →
            </Link>
          </Box>
        )}

        {/* Top Move */}
        {data.topMove && (
          <Box css={{ stack: 'y', gapY: 'small' }}>
            <Box css={{ font: 'caption', color: 'secondary', fontWeight: 'semibold' }}>
              TOP RECOMMENDED MOVE
            </Box>
            <MoveCard
              title={data.topMove.title}
              summary={data.topMove.summary}
              risk={data.topMove.risk}
              riskColor={data.topMove.riskColor}
            />
          </Box>
        )}

        {/* Footer */}
        <Box css={{ marginTop: 'medium', font: 'caption', color: 'secondary' }}>
          Powered by 50,000 Monte Carlo simulations
        </Box>
      </Box>
    </ContextView>
  )
}

export default AppView
