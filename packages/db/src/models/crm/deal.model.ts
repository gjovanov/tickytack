import { Schema, model, type Document, type Types } from 'mongoose'

export type DealStatus = 'open' | 'won' | 'lost'

export interface IDeal extends Document {
  name: string
  value: number
  currency: string
  pipelineId: Types.ObjectId
  stage: string
  probability: number
  contactId?: Types.ObjectId
  assigneeId?: Types.ObjectId
  expectedCloseDate?: Date
  status: DealStatus
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const dealSchema = new Schema<IDeal>(
  {
    name: { type: String, required: true },
    value: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' },
    pipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline', required: true },
    stage: { type: String, required: true },
    probability: { type: Number, default: 0 },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    expectedCloseDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['open', 'won', 'lost'],
      default: 'open',
    },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

dealSchema.index({ pipelineId: 1, orgId: 1 })
dealSchema.index({ stage: 1, orgId: 1 })
dealSchema.index({ status: 1, orgId: 1 })
dealSchema.index({ assigneeId: 1, orgId: 1 })

export const Deal = model<IDeal>('Deal', dealSchema)
