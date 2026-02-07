import { Schema, model, type Document, type Types } from 'mongoose'

export type ErpTimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface IErpTimesheetEntry {
  date: Date
  hours: number
  description?: string
}

export interface IErpTimesheet extends Document {
  employeeId: Types.ObjectId
  period: string
  entries: IErpTimesheetEntry[]
  totalHours: number
  status: ErpTimesheetStatus
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const erpTimesheetEntrySchema = new Schema<IErpTimesheetEntry>(
  {
    date: { type: Date, required: true },
    hours: { type: Number, required: true },
    description: { type: String, default: null },
  },
  { _id: false },
)

const erpTimesheetSchema = new Schema<IErpTimesheet>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    period: { type: String, required: true },
    entries: [erpTimesheetEntrySchema],
    totalHours: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected'],
      default: 'draft',
    },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

erpTimesheetSchema.index({ employeeId: 1, period: 1, orgId: 1 })

export const ErpTimesheet = model<IErpTimesheet>('ErpTimesheet', erpTimesheetSchema)
