import { Box, Badge, Link } from '@stripe/ui-extension-sdk/ui'

interface MoveCardProps {
  title: string
  summary: string
  risk: string
  riskColor: string
}

const RISK_BADGE_TYPE: Record<string, 'positive' | 'warning' | 'critical' | 'info'> = {
  safe: 'positive',
  conservative: 'positive',
  balanced: 'info',
  aggressive: 'warning',
  cutthroat: 'critical',
}

const MoveCard = ({ title, summary, risk, riskColor }: MoveCardProps) => {
  const badgeType = RISK_BADGE_TYPE[risk] || 'info'

  return (
    <Box
      css={{
        padding: 'medium',
        background: 'container',
        borderRadius: 'medium',
        stack: 'y',
        gapY: 'small',
      }}
    >
      <Box css={{ stack: 'x', alignY: 'center', distribute: 'space-between' }}>
        <Box css={{ fontWeight: 'semibold' }}>{title}</Box>
        <Badge type={badgeType}>
          {risk.charAt(0).toUpperCase() + risk.slice(1)}
        </Badge>
      </Box>
      <Box css={{ color: 'secondary', font: 'body' }}>{summary}</Box>
      <Link href="https://lucrumcfo.vercel.app/dashboard" target="_blank">
        See all 5 moves →
      </Link>
    </Box>
  )
}

export default MoveCard
