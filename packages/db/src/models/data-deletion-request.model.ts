import { Schema, model, type Document, type Types } from 'mongoose'

export type DeletionStatus = 'pending' | 'completed' | 'user_not_found'

export interface IDataDeletionRequest extends Document {
  confirmationCode: string
  facebookUserId: string
  userId?: Types.ObjectId
  status: DeletionStatus
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const dataDeletionRequestSchema = new Schema<IDataDeletionRequest>(
  {
    confirmationCode: { type: String, required: true, unique: true },
    facebookUserId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'user_not_found'],
      default: 'pending',
    },
    completedAt: { type: Date },
  },
  { timestamps: true },
)

export const DataDeletionRequest = model<IDataDeletionRequest>(
  'DataDeletionRequest',
  dataDeletionRequestSchema,
)
