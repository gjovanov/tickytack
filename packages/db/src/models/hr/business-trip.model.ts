import { Schema, model, type Document, type Types } from 'mongoose'

export type BusinessTripStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface IBusinessTrip extends Document {
  employeeId: Types.ObjectId
  destination: string
  purpose: string
  startDate: Date
  endDate: Date
  estimatedCost: number
  actualCost: number
  status: BusinessTripStatus
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const businessTripSchema = new Schema<IBusinessTrip>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    destination: { type: String, required: true },
    purpose: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    estimatedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

businessTripSchema.index({ employeeId: 1, orgId: 1 })
businessTripSchema.index({ status: 1, orgId: 1 })

export const BusinessTrip = model<IBusinessTrip>('BusinessTrip', businessTripSchema)
