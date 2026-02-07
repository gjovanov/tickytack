import { Invoice, type IInvoice } from 'db/src/models'
import { BaseDao } from '../base.dao'

class InvoiceDao extends BaseDao<IInvoice> {
  constructor() {
    super(Invoice)
  }

  async getNextInvoiceNumber(orgId: string, type: string): Promise<string> {
    const prefixMap: Record<string, string> = {
      sales: 'INV',
      purchase: 'BILL',
      proforma: 'PRF',
      credit_note: 'CRN',
    }
    const prefix = prefixMap[type] || 'INV'
    const last = await this.model
      .findOne({ orgId, type })
      .sort({ createdAt: -1 })
      .select('invoiceNumber')
      .exec()
    if (!last) return `${prefix}-0001`
    const num = parseInt(last.invoiceNumber.replace(`${prefix}-`, ''), 10)
    return `${prefix}-${String(num + 1).padStart(4, '0')}`
  }

  async findByContact(orgId: string, contactId: string): Promise<IInvoice[]> {
    return this.model.find({ orgId, contactId }).sort({ date: -1 }).exec()
  }

  async findByStatus(orgId: string, status: string): Promise<IInvoice[]> {
    return this.model.find({ orgId, status }).sort({ date: -1 }).exec()
  }

  async findByDateRange(orgId: string, startDate: Date, endDate: Date): Promise<IInvoice[]> {
    return this.model
      .find({ orgId, date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .exec()
  }

  async findOverdue(orgId: string): Promise<IInvoice[]> {
    return this.model
      .find({
        orgId,
        status: { $in: ['sent', 'partially_paid'] },
        dueDate: { $lt: new Date() },
      })
      .sort({ dueDate: 1 })
      .exec()
  }

  async findByType(orgId: string, type: string): Promise<IInvoice[]> {
    return this.model.find({ orgId, type }).sort({ date: -1 }).exec()
  }
}

export const invoiceDao = new InvoiceDao()
