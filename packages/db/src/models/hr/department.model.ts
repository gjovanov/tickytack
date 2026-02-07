import { Schema, model, type Document, type Types } from 'mongoose'

export interface IDepartment extends Document {
  name: string
  code: string
  managerId?: Types.ObjectId
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

departmentSchema.index({ code: 1, orgId: 1 }, { unique: true })

export const Department = model<IDepartment>('Department', departmentSchema)
