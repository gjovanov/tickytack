import { Schema, model, type Document, type Types } from 'mongoose'

export interface IPriceListItem {
  productId: Types.ObjectId
  price: number
}

export interface IPriceList extends Document {
  name: string
  currency: string
  items: IPriceListItem[]
  isActive: boolean
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const priceListItemSchema = new Schema<IPriceListItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    price: { type: Number, required: true },
  },
  { _id: false },
)

const priceListSchema = new Schema<IPriceList>(
  {
    name: { type: String, required: true },
    currency: { type: String, default: 'EUR' },
    items: [priceListItemSchema],
    isActive: { type: Boolean, default: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

priceListSchema.index({ name: 1, orgId: 1 }, { unique: true })

export const PriceList = model<IPriceList>('PriceList', priceListSchema)
