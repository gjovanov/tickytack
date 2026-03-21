import { Schema, model, type Document, type Types } from 'mongoose'

export type ProjectSource = 'jira' | null

export interface IProject extends Document {
  name: string
  key: string
  description?: string
  orgId: Types.ObjectId
  leadId?: Types.ObjectId
  color: string
  isActive: boolean
  source: ProjectSource
  sourceId?: string
  createdAt: Date
  updatedAt: Date
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, uppercase: true },
    description: { type: String, default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    color: { type: String, default: '#1976D2' },
    isActive: { type: Boolean, default: true },
    source: { type: String, enum: ['jira', null], default: null },
    sourceId: { type: String, default: null },
  },
  { timestamps: true },
)

projectSchema.index({ key: 1, orgId: 1 }, { unique: true })
projectSchema.index({ orgId: 1 })

export const Project = model<IProject>('Project', projectSchema)
