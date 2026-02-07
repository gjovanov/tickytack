import { Schema, model, type Document, type Types } from 'mongoose'

export type PayrollRunStatus = 'draft' | 'calculated' | 'approved' | 'paid'

export interface IDeductionItem {
  name: string
  type: 'percentage' | 'fixed'
  value: number
  amount: number
}

export interface IContributionItem {
  name: string
  type: 'percentage' | 'fixed'
  value: number
  amount: number
}

export interface IPayrollRun extends Document {
  name: string
  period: string
  startDate: Date
  endDate: Date
  status: PayrollRunStatus
  employeeCount: number
  totalGross: number
  totalDeductions: number
  totalNet: number
  totalEmployerContributions: number
  deductions: IDeductionItem[]
  employerContributions: IContributionItem[]
  orgId: Types.ObjectId
  createdBy: Types.ObjectId
  calculatedAt?: Date
  approvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const deductionItemSchema = new Schema<IDeductionItem>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
)

const contributionItemSchema = new Schema<IContributionItem>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
)

const payrollRunSchema = new Schema<IPayrollRun>(
  {
    name: { type: String, required: true },
    period: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'calculated', 'approved', 'paid'],
      default: 'draft',
    },
    employeeCount: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    totalEmployerContributions: { type: Number, default: 0 },
    deductions: [deductionItemSchema],
    employerContributions: [contributionItemSchema],
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    calculatedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

payrollRunSchema.index({ period: 1, orgId: 1 })
payrollRunSchema.index({ status: 1, orgId: 1 })

export const PayrollRun = model<IPayrollRun>('PayrollRun', payrollRunSchema)
