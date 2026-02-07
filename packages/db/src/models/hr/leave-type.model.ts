import { Schema, model, type Document, type Types } from 'mongoose'

export interface ILeaveType extends Document {
  name: string
  code: string
  defaultDays: number
  isPaid: boolean
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const leaveTypeSchema = new Schema<ILeaveType>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    defaultDays: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

leaveTypeSchema.index({ code: 1, orgId: 1 }, { unique: true })

export const LeaveType = model<ILeaveType>('LeaveType', leaveTypeSchema)
