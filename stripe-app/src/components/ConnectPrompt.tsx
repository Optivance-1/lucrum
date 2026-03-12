import { Box, Button, Icon } from '@stripe/ui-extension-sdk/ui'

interface ConnectPromptProps {
  connectUrl: string
}

const ConnectPrompt = ({ connectUrl }: ConnectPromptProps) => {
  return (
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
          width: '64px',
          height: '64px',
          borderRadius: 'large',
          background: 'container',
          alignX: 'center',
          alignY: 'center',
          display: 'flex',
        }}
      >
        <Icon name="sparkles" size="large" />
      </Box>

      <Box css={{ stack: 'y', gapY: 'small' }}>
        <Box css={{ fontWeight: 'bold', font: 'heading' }}>
          Connect to Lucrum
        </Box>
        <Box css={{ color: 'secondary', maxWidth: '280px' }}>
          Get AI CFO insights, revenue forecasts, and Five Moves recommendations
          directly in your Stripe Dashboard.
        </Box>
      </Box>

      <Box css={{ stack: 'y', gapY: 'xsmall', width: 'fill', alignX: 'start' }}>
        {[
          '50,000 Monte Carlo simulations',
          'Revenue leak detection',
          'Churn risk scoring',
          'AI-powered recommendations',
        ].map((feature) => (
          <Box key={feature} css={{ stack: 'x', gapX: 'small', alignY: 'center' }}>
            <Icon name="check" size="small" css={{ color: 'positive' }} />
            <Box css={{ font: 'caption' }}>{feature}</Box>
          </Box>
        ))}
      </Box>

      <Button type="primary" href={connectUrl} target="_blank">
        Get started free →
      </Button>

      <Box css={{ font: 'caption', color: 'secondary' }}>
        60 seconds to connect. First question free.
      </Box>
    </Box>
  )
}

export default ConnectPrompt
