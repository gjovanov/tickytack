import { Schema, model, type Document, type Types } from 'mongoose'

export interface IEmployeeDocument extends Document {
  employeeId: Types.ObjectId
  name: string
  type: string
  fileUrl: string
  expiryDate?: Date
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const employeeDocumentSchema = new Schema<IEmployeeDocument>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    fileUrl: { type: String, required: true },
    expiryDate: { type: Date, default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

employeeDocumentSchema.index({ employeeId: 1, orgId: 1 })

export const EmployeeDocument = model<IEmployeeDocument>('EmployeeDocument', employeeDocumentSchema)
