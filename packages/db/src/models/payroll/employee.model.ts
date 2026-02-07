import { Schema, model, type Document, type Types } from 'mongoose'

export type EmployeeStatus = 'active' | 'inactive' | 'terminated'

export interface IEmployee extends Document {
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  departmentId?: Types.ObjectId
  position?: string
  hireDate: Date
  baseSalary: number
  currency: string
  status: EmployeeStatus
  userId?: Types.ObjectId
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const employeeSchema = new Schema<IEmployee>(
  {
    employeeNumber: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    position: { type: String, default: null },
    hireDate: { type: Date, required: true },
    baseSalary: { type: Number, required: true },
    currency: { type: String, default: 'EUR' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated'],
      default: 'active',
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

employeeSchema.index({ employeeNumber: 1, orgId: 1 }, { unique: true })
employeeSchema.index({ status: 1, orgId: 1 })

export const Employee = model<IEmployee>('Employee', employeeSchema)
