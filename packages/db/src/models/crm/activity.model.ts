import { Schema, model, type Document, type Types } from 'mongoose'

export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note'

export interface IActivity extends Document {
  type: ActivityType
  subject: string
  description?: string
  date: Date
  completed: boolean
  leadId?: Types.ObjectId
  dealId?: Types.ObjectId
  contactId?: Types.ObjectId
  assigneeId?: Types.ObjectId
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const activitySchema = new Schema<IActivity>(
  {
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'task', 'note'],
      required: true,
    },
    subject: { type: String, required: true },
    description: { type: String, default: null },
    date: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', default: null },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

activitySchema.index({ type: 1, orgId: 1 })
activitySchema.index({ leadId: 1, orgId: 1 })
activitySchema.index({ dealId: 1, orgId: 1 })

export const Activity = model<IActivity>('Activity', activitySchema)
