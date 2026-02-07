import { Invoice, type IInvoice } from 'db/src/models'
import { invoiceDao } from '../dao/invoicing/invoice.dao'

export function calculateInvoiceTotals(lines: { quantity: number; unitPrice: number; discount: number; taxRate: number }[]): {
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  lineTotals: number[]
} {
  let subtotal = 0
  let discountTotal = 0
  let taxTotal = 0
  const lineTotals: number[] = []

  for (const line of lines) {
    const lineSubtotal = line.quantity * line.unitPrice
    const lineDiscount = lineSubtotal * (line.discount / 100)
    const taxableAmount = lineSubtotal - lineDiscount
    const lineTax = taxableAmount * (line.taxRate / 100)
    const lineTotal = taxableAmount + lineTax

    subtotal += lineSubtotal
    discountTotal += lineDiscount
    taxTotal += lineTax
    lineTotals.push(lineTotal)
  }

  return {
    subtotal,
    discountTotal,
    taxTotal,
    total: subtotal - discountTotal + taxTotal,
    lineTotals,
  }
}

export async function recordPayment(
  invoiceId: string,
  payment: { date: Date; amount: number; method: string; reference?: string },
): Promise<IInvoice> {
  const invoice = await invoiceDao.findById(invoiceId)
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'paid') throw new Error('Invoice already paid')
  if (invoice.status === 'voided') throw new Error('Cannot pay a voided invoice')
  if (invoice.status === 'cancelled') throw new Error('Cannot pay a cancelled invoice')

  const newAmountPaid = invoice.amountPaid + payment.amount
  if (newAmountPaid > invoice.total + 0.01) {
    throw new Error('Payment exceeds invoice total')
  }

  const amountDue = invoice.total - newAmountPaid
  let newStatus = invoice.status
  if (amountDue <= 0.01) {
    newStatus = 'paid'
  } else if (newAmountPaid > 0) {
    newStatus = 'partially_paid'
  }

  const updated = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      $push: { payments: payment },
      $set: {
        amountPaid: newAmountPaid,
        amountDue: Math.max(0, amountDue),
        status: newStatus,
      },
    },
    { new: true },
  )

  return updated!
}

export async function sendInvoice(invoiceId: string): Promise<IInvoice> {
  const invoice = await invoiceDao.findById(invoiceId)
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status !== 'draft') throw new Error('Can only send draft invoices')

  const updated = await Invoice.findByIdAndUpdate(
    invoiceId,
    { $set: { status: 'sent', sentAt: new Date() } },
    { new: true },
  )

  return updated!
}

export async function checkOverdueInvoices(orgId: string): Promise<IInvoice[]> {
  const now = new Date()
  const invoices = await Invoice.find({
    orgId,
    status: { $in: ['sent', 'partially_paid'] },
    dueDate: { $lt: now },
  }).exec()

  return invoices
}
