import {
  ContextView,
  Box,
  Button,
  Icon,
} from '@stripe/ui-extension-sdk/ui'
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context'

const LUCRUM_API_BASE = 'https://lucrumcfo.vercel.app'

const ConnectView = ({ userContext }: ExtensionContextValue) => {
  return (
    <ContextView title="Connect to Lucrum">
      <Box
        css={{
          padding: 'xlarge',
          stack: 'y',
          gapY: 'large',
          alignX: 'center',
          textAlign: 'center',
        }}
      >
        <Box
          css={{
            width: 'fill',
            padding: 'large',
            background: 'container',
            borderRadius: 'large',
            stack: 'y',
            gapY: 'medium',
          }}
        >
          <Icon name="sparkles" size="large" />
          
          <Box>
            <Box css={{ fontWeight: 'bold', font: 'heading' }}>
              Your AI CFO awaits
            </Box>
            <Box css={{ color: 'secondary', marginTop: 'small' }}>
              Connect your Stripe account to Lucrum and get AI-powered financial
              insights, Five Moves recommendations, and revenue leak detection.
            </Box>
          </Box>

          <Box css={{ stack: 'y', gapY: 'small', alignX: 'start', width: 'fill' }}>
            {[
              'Monte Carlo runway simulations',
              'Churn risk scoring for every customer',
              'Revenue recovery automation',
              'AI CFO chat with MAX',
            ].map((feature) => (
              <Box key={feature} css={{ stack: 'x', gapX: 'small', alignY: 'center' }}>
                <Icon name="check" css={{ color: 'positive' }} />
                <Box css={{ font: 'body' }}>{feature}</Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Button
          type="primary"
          href={`${LUCRUM_API_BASE}/connect`}
          target="_blank"
        >
          Get started free →
        </Button>

        <Box css={{ font: 'caption', color: 'secondary' }}>
          60 seconds to connect. First question free.
        </Box>
      </Box>
    </ContextView>
  )
}

export default ConnectView
