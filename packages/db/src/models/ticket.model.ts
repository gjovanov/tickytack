import { Schema, model, type Document, type Types } from 'mongoose'

export type TicketStatus = 'open' | 'in_progress' | 'done' | 'closed'
export type TicketPriority = 'lowest' | 'low' | 'medium' | 'high' | 'highest'

export interface ITicket extends Document {
  key: string
  summary: string
  description?: string
  projectId: Types.ObjectId
  orgId: Types.ObjectId
  assigneeId?: Types.ObjectId
  reporterId: Types.ObjectId
  status: TicketStatus
  priority: TicketPriority
  estimatedHours?: number
  sequenceNumber: number
  createdAt: Date
  updatedAt: Date
}

const ticketSchema = new Schema<ITicket>(
  {
    key: { type: String, required: true },
    summary: { type: String, required: true },
    description: { type: String, default: null },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'done', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['lowest', 'low', 'medium', 'high', 'highest'],
      default: 'medium',
    },
    estimatedHours: { type: Number, default: null },
    sequenceNumber: { type: Number, required: true },
  },
  { timestamps: true },
)

ticketSchema.index({ key: 1, orgId: 1 }, { unique: true })
ticketSchema.index({ projectId: 1, orgId: 1 })

export const Ticket = model<ITicket>('Ticket', ticketSchema)
