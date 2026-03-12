import { Box, Icon } from '@stripe/ui-extension-sdk/ui'

interface MetricCardProps {
  label: string
  value: string
  trend: 'positive' | 'negative' | 'neutral'
}

const MetricCard = ({ label, value, trend }: MetricCardProps) => {
  const trendColor =
    trend === 'positive' ? 'positive' : trend === 'negative' ? 'critical' : 'secondary'

  return (
    <Box
      css={{
        flex: 1,
        padding: 'medium',
        background: 'container',
        borderRadius: 'medium',
        stack: 'y',
        gapY: 'xsmall',
      }}
    >
      <Box css={{ font: 'caption', color: 'secondary', fontWeight: 'medium' }}>
        {label}
      </Box>
      <Box css={{ stack: 'x', alignY: 'center', gapX: 'xsmall' }}>
        <Box css={{ fontWeight: 'bold', font: 'heading' }}>{value}</Box>
        {trend !== 'neutral' && (
          <Icon
            name={trend === 'positive' ? 'arrowUp' : 'arrowDown'}
            size="small"
            css={{ color: trendColor }}
          />
        )}
      </Box>
    </Box>
  )
}

export default MetricCard
