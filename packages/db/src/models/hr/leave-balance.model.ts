import { Schema, model, type Document, type Types } from 'mongoose'

export interface ILeaveBalance extends Document {
  employeeId: Types.ObjectId
  leaveTypeId: Types.ObjectId
  year: number
  entitled: number
  taken: number
  pending: number
  remaining: number
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const leaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    year: { type: Number, required: true },
    entitled: { type: Number, default: 0 },
    taken: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

leaveBalanceSchema.index({ employeeId: 1, leaveTypeId: 1, year: 1, orgId: 1 }, { unique: true })

export const LeaveBalance = model<ILeaveBalance>('LeaveBalance', leaveBalanceSchema)
