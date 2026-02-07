import { Contact, Lead, Deal, type ILead, type IDeal } from 'db/src/models'
import { leadDao } from '../dao/crm/lead.dao'
import { dealDao } from '../dao/crm/deal.dao'
import { pipelineDao } from '../dao/crm/pipeline.dao'
import { contactDao } from '../dao/invoicing/contact.dao'

export async function convertLead(
  leadId: string,
  options?: { createDeal?: boolean; dealName?: string; dealValue?: number },
): Promise<{ contact: any; deal?: any }> {
  const lead = await leadDao.findById(leadId)
  if (!lead) throw new Error('Lead not found')
  if (lead.status === 'converted') throw new Error('Lead already converted')

  const orgId = String(lead.orgId)

  // Create contact from lead data
  const contact = await Contact.create({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    type: 'customer',
    orgId: lead.orgId,
  })

  let deal: any = undefined
  if (options?.createDeal) {
    // Find default pipeline
    const pipeline = await pipelineDao.findDefault(orgId)
    if (!pipeline) throw new Error('No default pipeline found')

    const firstStage = pipeline.stages.sort((a, b) => a.order - b.order)[0]

    deal = await Deal.create({
      name: options.dealName || `Deal from ${lead.name}`,
      value: options.dealValue || 0,
      pipelineId: pipeline._id,
      stage: firstStage.name,
      probability: firstStage.probability,
      contactId: contact._id,
      assigneeId: lead.assigneeId,
      status: 'open',
      orgId: lead.orgId,
    })
  }

  // Mark lead as converted
  await Lead.findByIdAndUpdate(leadId, {
    $set: {
      status: 'converted',
      convertedContactId: contact._id,
      convertedDealId: deal?._id || null,
    },
  })

  return { contact, deal }
}

export async function moveDealStage(
  dealId: string,
  newStage: string,
): Promise<IDeal> {
  const deal = await dealDao.findById(dealId)
  if (!deal) throw new Error('Deal not found')

  const pipeline = await pipelineDao.findById(String(deal.pipelineId))
  if (!pipeline) throw new Error('Pipeline not found')

  const stageConfig = pipeline.stages.find(s => s.name === newStage)
  if (!stageConfig) throw new Error(`Invalid stage: ${newStage}`)

  const updated = await Deal.findByIdAndUpdate(
    dealId,
    { $set: { stage: newStage, probability: stageConfig.probability } },
    { new: true },
  )

  return updated!
}

export interface PipelineSummary {
  stages: {
    name: string
    dealCount: number
    totalValue: number
    weightedValue: number
  }[]
  totalValue: number
  weightedValue: number
}

export async function getPipelineSummary(
  orgId: string,
  pipelineId: string,
): Promise<PipelineSummary> {
  const pipeline = await pipelineDao.findById(pipelineId)
  if (!pipeline) throw new Error('Pipeline not found')

  const deals = (await dealDao.findByPipeline(orgId, pipelineId))
    .filter(d => d.status === 'open')

  const stageMap = new Map<string, { dealCount: number; totalValue: number; weightedValue: number }>()

  for (const stage of pipeline.stages) {
    stageMap.set(stage.name, { dealCount: 0, totalValue: 0, weightedValue: 0 })
  }

  for (const deal of deals) {
    const stage = stageMap.get(deal.stage)
    if (stage) {
      stage.dealCount++
      stage.totalValue += deal.value
      stage.weightedValue += deal.value * (deal.probability / 100)
    }
  }

  const stages = pipeline.stages.map(s => ({
    name: s.name,
    ...stageMap.get(s.name)!,
  }))

  const totalValue = stages.reduce((sum, s) => sum + s.totalValue, 0)
  const weightedValue = stages.reduce((sum, s) => sum + s.weightedValue, 0)

  return { stages, totalValue, weightedValue }
}
