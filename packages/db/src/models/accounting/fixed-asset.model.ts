import { Schema, model, type Document, type Types } from 'mongoose'

export type FixedAssetStatus = 'active' | 'disposed' | 'fully_depreciated'

export interface IFixedAsset extends Document {
  name: string
  code: string
  purchaseDate: Date
  purchaseCost: number
  currentValue: number
  depreciationRate: number
  accumulatedDepreciation: number
  status: FixedAssetStatus
  accountId: Types.ObjectId
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const fixedAssetSchema = new Schema<IFixedAsset>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    purchaseDate: { type: Date, required: true },
    purchaseCost: { type: Number, required: true },
    currentValue: { type: Number, required: true },
    depreciationRate: { type: Number, required: true },
    accumulatedDepreciation: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'disposed', 'fully_depreciated'],
      default: 'active',
    },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

fixedAssetSchema.index({ code: 1, orgId: 1 }, { unique: true })
fixedAssetSchema.index({ status: 1, orgId: 1 })

export const FixedAsset = model<IFixedAsset>('FixedAsset', fixedAssetSchema)
