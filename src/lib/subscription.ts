import prisma from './db'

export type AppFeature = 
  | 'multi-livestock' 
  | 'marketing' 
  | 'feed-formulation' 
  | 'advanced-finance'

export async function checkSubscriptionFeature(farmId: string, feature: AppFeature): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { farmId },
    include: { plan: true }
  })

  // Basic tier features (Default if no subscription)
  const basicFeatures: AppFeature[] = []

  // Standard tier features
  const standardFeatures: AppFeature[] = [
    'multi-livestock',
    'advanced-finance'
  ]

  // Premium tier features
  const premiumFeatures: AppFeature[] = [
    ...standardFeatures,
    'marketing',
    'feed-formulation'
  ]

  const now = new Date()
  const isActive = subscription?.status === 'ACTIVE' && (!subscription.endDate || subscription.endDate > now)
  const tier = (isActive ? subscription?.plan.tier : null) || 'BASIC'

  switch (tier) {
    case 'PREMIUM':
      return premiumFeatures.includes(feature)
    case 'STANDARD':
      return standardFeatures.includes(feature)
    default:
      return basicFeatures.includes(feature)
  }
}
