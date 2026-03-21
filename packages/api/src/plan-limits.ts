import { PLANS, type PlanId } from 'config/src'
import { Org } from 'db/src/models'
import { userDao, projectDao } from 'services/src/dao'
import BadRequestError from './errors/BadRequestError'

async function getOrgPlan(orgId: string) {
  const org = await Org.findById(orgId).select('subscription.plan').lean()
  const planId = (org?.subscription?.plan || 'free') as PlanId
  return PLANS[planId] || PLANS.free
}

export async function checkUserLimit(orgId: string) {
  const plan = await getOrgPlan(orgId)
  if (plan.limits.maxUsers === -1) return
  const users = await userDao.findByOrgId(orgId)
  if (users.length >= plan.limits.maxUsers) {
    throw new BadRequestError(
      `User limit reached (${plan.limits.maxUsers}) for the ${plan.name} plan. Upgrade to add more users.`,
    )
  }
}

export async function checkProjectLimit(orgId: string) {
  const plan = await getOrgPlan(orgId)
  if (plan.limits.maxProjects === -1) return
  const { total } = await projectDao.findAll({ orgId }, 1, 1)
  if (total >= plan.limits.maxProjects) {
    throw new BadRequestError(
      `Project limit reached (${plan.limits.maxProjects}) for the ${plan.name} plan. Upgrade to add more projects.`,
    )
  }
}

export async function checkExportEnabled(orgId: string) {
  const plan = await getOrgPlan(orgId)
  if (!plan.limits.exportEnabled) {
    throw new BadRequestError(
      `Export is not available on the ${plan.name} plan. Upgrade to Pro or Business to export.`,
    )
  }
}
