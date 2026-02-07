import { Schema, model, type Document, type Types } from 'mongoose'

export interface IFiscalPeriod extends Document {
  name: string
  fiscalYearId: Types.ObjectId
  startDate: Date
  endDate: Date
  isClosed: boolean
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const fiscalPeriodSchema = new Schema<IFiscalPeriod>(
  {
    name: { type: String, required: true },
    fiscalYearId: { type: Schema.Types.ObjectId, ref: 'FiscalYear', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isClosed: { type: Boolean, default: false },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

fiscalPeriodSchema.index({ fiscalYearId: 1, orgId: 1 })

export const FiscalPeriod = model<IFiscalPeriod>('FiscalPeriod', fiscalPeriodSchema)
