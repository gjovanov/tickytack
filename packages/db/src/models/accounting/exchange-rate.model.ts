import { Schema, model, type Document, type Types } from 'mongoose'

export interface IExchangeRate extends Document {
  fromCurrency: string
  toCurrency: string
  rate: number
  date: Date
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const exchangeRateSchema = new Schema<IExchangeRate>(
  {
    fromCurrency: { type: String, required: true },
    toCurrency: { type: String, required: true },
    rate: { type: Number, required: true },
    date: { type: Date, required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

exchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1, date: 1, orgId: 1 })

export const ExchangeRate = model<IExchangeRate>('ExchangeRate', exchangeRateSchema)
