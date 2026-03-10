import { getUserPlan } from '@/lib/subscription'

export type DecisionActionDraft = {
  id: string
  title: string
  description: string
  status: 'stub'
}

export type DecisionEngineReadiness = {
  ready: boolean
  blockers: string[]
  nextActions: DecisionActionDraft[]
}

export async function getDecisionEngineReadiness(userId: string): Promise<DecisionEngineReadiness> {
  const plan = await getUserPlan(userId)
  const blockers =
    plan === 'pro'
      ? []
      : ['Upgrade to Pro before enabling automated decision execution.']

  return {
    ready: blockers.length === 0,
    blockers,
    nextActions: [
      {
        id: 'decision-engine-stub',
        title: 'Decision engine scaffolded',
        description: 'Auth, billing, webhook audit trail, and user identity are now in place for the full action engine build.',
        status: 'stub',
      },
    ],
  }
}
