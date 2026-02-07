import { Schema, model, type Document, type Types } from 'mongoose'

export interface ITimeEntry extends Document {
  orgId: Types.ObjectId
  userId: Types.ObjectId
  ticketId: Types.ObjectId
  projectId: Types.ObjectId
  date: Date
  startTime: string
  endTime: string
  durationMinutes: number
  description?: string
  createdAt: Date
  updatedAt: Date
}

const timeEntrySchema = new Schema<ITimeEntry>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    description: { type: String, default: null },
  },
  { timestamps: true },
)

timeEntrySchema.index({ orgId: 1, userId: 1, date: 1 })
timeEntrySchema.index({ orgId: 1, projectId: 1, date: 1 })

export const TimeEntry = model<ITimeEntry>('TimeEntry', timeEntrySchema)
