import { Schema, model, type Document, type Types } from 'mongoose'

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface ILeaveRequest extends Document {
  employeeId: Types.ObjectId
  leaveTypeId: Types.ObjectId
  startDate: Date
  endDate: Date
  days: number
  reason?: string
  status: LeaveRequestStatus
  rejectionReason?: string
  approvedBy?: Types.ObjectId
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

leaveRequestSchema.index({ employeeId: 1, orgId: 1 })
leaveRequestSchema.index({ leaveTypeId: 1, orgId: 1 })
leaveRequestSchema.index({ status: 1, orgId: 1 })

export const LeaveRequest = model<ILeaveRequest>('LeaveRequest', leaveRequestSchema)
