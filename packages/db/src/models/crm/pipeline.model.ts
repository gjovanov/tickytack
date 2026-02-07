import { Schema, model, type Document, type Types } from 'mongoose'

export interface IPipelineStage {
  name: string
  order: number
  probability: number
}

export interface IPipeline extends Document {
  name: string
  stages: IPipelineStage[]
  isDefault: boolean
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const pipelineStageSchema = new Schema<IPipelineStage>(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    probability: { type: Number, default: 0 },
  },
  { _id: false },
)

const pipelineSchema = new Schema<IPipeline>(
  {
    name: { type: String, required: true },
    stages: [pipelineStageSchema],
    isDefault: { type: Boolean, default: false },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

pipelineSchema.index({ orgId: 1 })

export const Pipeline = model<IPipeline>('Pipeline', pipelineSchema)
