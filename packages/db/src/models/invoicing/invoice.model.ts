import { Schema, model, type Document, type Types } from 'mongoose'

export type InvoiceType = 'sales' | 'purchase' | 'proforma' | 'credit_note'
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'voided' | 'cancelled'

export interface IInvoiceLine {
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  lineTotal: number
}

export interface IInvoicePayment {
  date: Date
  amount: number
  method: string
  reference?: string
}

export interface IInvoice extends Document {
  invoiceNumber: string
  type: InvoiceType
  contactId: Types.ObjectId
  date: Date
  dueDate: Date
  lines: IInvoiceLine[]
  subtotal: number
  taxTotal: number
  discountTotal: number
  total: number
  amountPaid: number
  amountDue: number
  payments: IInvoicePayment[]
  status: InvoiceStatus
  currency: string
  exchangeRate: number
  notes?: string
  sentAt?: Date
  orgId: Types.ObjectId
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const invoiceLineSchema = new Schema<IInvoiceLine>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
)

const invoicePaymentSchema = new Schema<IInvoicePayment>(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    reference: { type: String, default: null },
  },
  { _id: false },
)

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true },
    type: {
      type: String,
      enum: ['sales', 'purchase', 'proforma', 'credit_note'],
      required: true,
    },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    date: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    lines: [invoiceLineSchema],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    payments: [invoicePaymentSchema],
    status: {
      type: String,
      enum: ['draft', 'sent', 'partially_paid', 'paid', 'voided', 'cancelled'],
      default: 'draft',
    },
    currency: { type: String, default: 'EUR' },
    exchangeRate: { type: Number, default: 1 },
    notes: { type: String, default: null },
    sentAt: { type: Date, default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

invoiceSchema.index({ invoiceNumber: 1, orgId: 1 }, { unique: true })
invoiceSchema.index({ type: 1, orgId: 1 })
invoiceSchema.index({ status: 1, orgId: 1 })
invoiceSchema.index({ contactId: 1, orgId: 1 })
invoiceSchema.index({ dueDate: 1, status: 1, orgId: 1 })

export const Invoice = model<IInvoice>('Invoice', invoiceSchema)
