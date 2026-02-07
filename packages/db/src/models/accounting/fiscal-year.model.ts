import { Schema, model, type Document, type Types } from 'mongoose'

export interface IFiscalYear extends Document {
  name: string
  startDate: Date
  endDate: Date
  isClosed: boolean
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const fiscalYearSchema = new Schema<IFiscalYear>(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isClosed: { type: Boolean, default: false },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

fiscalYearSchema.index({ orgId: 1 })

export const FiscalYear = model<IFiscalYear>('FiscalYear', fiscalYearSchema)
