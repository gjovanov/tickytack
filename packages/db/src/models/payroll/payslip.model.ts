import { Schema, model, type Document, type Types } from 'mongoose'

export interface IPayslipEarning {
  name: string
  amount: number
}

export interface IPayslipDeduction {
  name: string
  amount: number
}

export interface IPayslip extends Document {
  payrollRunId: Types.ObjectId
  employeeId: Types.ObjectId
  grossPay: number
  netPay: number
  earnings: IPayslipEarning[]
  deductions: IPayslipDeduction[]
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const payslipEarningSchema = new Schema<IPayslipEarning>(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
)

const payslipDeductionSchema = new Schema<IPayslipDeduction>(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
)

const payslipSchema = new Schema<IPayslip>(
  {
    payrollRunId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    grossPay: { type: Number, required: true },
    netPay: { type: Number, required: true },
    earnings: [payslipEarningSchema],
    deductions: [payslipDeductionSchema],
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

payslipSchema.index({ payrollRunId: 1, orgId: 1 })
payslipSchema.index({ employeeId: 1, orgId: 1 })

export const Payslip = model<IPayslip>('Payslip', payslipSchema)
