import {
  PosSession,
  PosTransaction,
  ProductionOrder,
  StockLevel,
  type IPosSession,
  type IPosTransaction,
  type IProductionOrder,
} from 'db/src/models'
import { posSessionDao } from '../dao/erp/pos-session.dao'
import { posTransactionDao } from '../dao/erp/pos-transaction.dao'
import { productionOrderDao } from '../dao/erp/production-order.dao'
import { bomDao } from '../dao/erp/bom.dao'
import { adjustStock } from './warehouse.service'

// POS Session management

export async function openPosSession(data: {
  warehouseId: string
  cashierId: string
  openingBalance: number
  orgId: string
}): Promise<IPosSession> {
  // Check for existing open session for this cashier
  const existing = await posSessionDao.findOpenByCashier(data.orgId, data.cashierId)
  if (existing) throw new Error('Cashier already has an open session')

  const sessionNumber = await posSessionDao.getNextSessionNumber(data.orgId)

  const session = await PosSession.create({
    sessionNumber,
    warehouseId: data.warehouseId,
    cashierId: data.cashierId,
    openingBalance: data.openingBalance,
    expectedBalance: data.openingBalance,
    status: 'open',
    openedAt: new Date(),
    orgId: data.orgId,
  })

  return session
}

export async function closePosSession(
  sessionId: string,
  closingBalance: number,
): Promise<IPosSession> {
  const session = await posSessionDao.findById(sessionId)
  if (!session) throw new Error('POS session not found')
  if (session.status === 'closed') throw new Error('Session already closed')

  const expectedBalance = session.openingBalance + session.totalCash - session.totalReturns
  const difference = closingBalance - expectedBalance

  const updated = await PosSession.findByIdAndUpdate(
    sessionId,
    {
      $set: {
        status: 'closed',
        closingBalance,
        expectedBalance,
        difference,
        closedAt: new Date(),
      },
    },
    { new: true },
  )

  return updated!
}

export async function createPosTransaction(data: {
  sessionId: string
  type: 'sale' | 'return'
  lines: { productId: string; quantity: number; unitPrice: number; discount: number; lineTotal: number }[]
  subtotal: number
  taxTotal: number
  total: number
  paymentMethod: string
  orgId: string
}): Promise<IPosTransaction> {
  const session = await posSessionDao.findById(data.sessionId)
  if (!session) throw new Error('POS session not found')
  if (session.status === 'closed') throw new Error('Cannot add transactions to a closed session')

  const transactionNumber = await posTransactionDao.getNextTransactionNumber(data.orgId)

  const transaction = await PosTransaction.create({
    transactionNumber,
    sessionId: data.sessionId,
    type: data.type,
    lines: data.lines,
    subtotal: data.subtotal,
    taxTotal: data.taxTotal,
    total: data.total,
    paymentMethod: data.paymentMethod,
    orgId: data.orgId,
  })

  // Update session totals
  const updateFields: Record<string, number> = {
    transactionCount: 1,
  }

  if (data.type === 'sale') {
    updateFields.totalSales = data.total
    if (data.paymentMethod === 'cash') {
      updateFields.totalCash = data.total
    } else {
      updateFields.totalCard = data.total
    }
  } else {
    updateFields.totalReturns = data.total
  }

  await PosSession.findByIdAndUpdate(data.sessionId, { $inc: updateFields })

  return transaction
}

// Production Order management

export async function startProduction(orderId: string): Promise<IProductionOrder> {
  const order = await productionOrderDao.findById(orderId)
  if (!order) throw new Error('Production order not found')
  if (order.status !== 'planned') throw new Error('Can only start planned production orders')

  const updated = await ProductionOrder.findByIdAndUpdate(
    orderId,
    { $set: { status: 'in_progress', actualStartDate: new Date() } },
    { new: true },
  )

  return updated!
}

export async function completeProduction(orderId: string): Promise<IProductionOrder> {
  const order = await productionOrderDao.findById(orderId)
  if (!order) throw new Error('Production order not found')
  if (order.status !== 'in_progress') throw new Error('Can only complete in-progress production orders')

  const orgId = String(order.orgId)

  // Get BOM to consume materials
  const bom = await bomDao.findById(String(order.bomId))
  if (!bom) throw new Error('BOM not found')

  // Consume materials from warehouse
  for (const material of bom.materials) {
    await adjustStock(
      orgId,
      String(material.productId),
      String(order.warehouseId),
      -(material.quantity * order.quantity),
      material.unitCost,
    )
  }

  // Add finished product to warehouse
  await adjustStock(
    orgId,
    String(order.productId),
    String(order.warehouseId),
    order.quantity,
    bom.totalCost,
  )

  const updated = await ProductionOrder.findByIdAndUpdate(
    orderId,
    { $set: { status: 'completed', completedDate: new Date() } },
    { new: true },
  )

  return updated!
}
