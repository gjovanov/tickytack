import { StockLevel, StockMovement, type IStockMovement } from 'db/src/models'
import { stockLevelDao } from '../dao/warehouse/stock-level.dao'
import { stockMovementDao } from '../dao/warehouse/stock-movement.dao'

export async function adjustStock(
  orgId: string,
  productId: string,
  warehouseId: string,
  quantityChange: number,
  unitCost: number,
): Promise<void> {
  let stockLevel = await stockLevelDao.findByProductAndWarehouse(orgId, productId, warehouseId)

  if (!stockLevel) {
    // Create new stock level
    await StockLevel.create({
      productId,
      warehouseId,
      quantity: quantityChange,
      availableQty: quantityChange,
      reservedQty: 0,
      avgCost: unitCost,
      orgId,
    })
    return
  }

  // Weighted average cost calculation
  const oldTotal = stockLevel.quantity * stockLevel.avgCost
  const newQty = stockLevel.quantity + quantityChange

  let newAvgCost = stockLevel.avgCost
  if (quantityChange > 0 && newQty > 0) {
    newAvgCost = (oldTotal + quantityChange * unitCost) / newQty
  }

  await StockLevel.findByIdAndUpdate(stockLevel._id, {
    $set: {
      quantity: newQty,
      availableQty: newQty - stockLevel.reservedQty,
      avgCost: newAvgCost,
    },
  })
}

export async function confirmMovement(movementId: string): Promise<IStockMovement> {
  const movement = await stockMovementDao.findById(movementId)
  if (!movement) throw new Error('Stock movement not found')
  if (movement.status !== 'draft') throw new Error('Can only confirm draft movements')

  const orgId = String(movement.orgId)

  for (const line of movement.lines) {
    const productId = String(line.productId)

    // Decrease source warehouse stock
    if (movement.sourceWarehouseId) {
      await adjustStock(orgId, productId, String(movement.sourceWarehouseId), -line.quantity, line.unitCost)
    }

    // Increase destination warehouse stock
    if (movement.destinationWarehouseId) {
      await adjustStock(orgId, productId, String(movement.destinationWarehouseId), line.quantity, line.unitCost)
    }
  }

  const updated = await StockMovement.findByIdAndUpdate(
    movementId,
    { $set: { status: 'completed' } },
    { new: true },
  )

  return updated!
}

export interface StockValuationEntry {
  productId: string
  totalQty: number
  avgCost: number
  totalValue: number
}

export async function getStockValuation(orgId: string): Promise<{
  items: StockValuationEntry[]
  totalValue: number
}> {
  // Aggregate stock levels across all warehouses per product
  const result = await StockLevel.aggregate([
    { $match: { orgId: { $toObjectId: orgId } } },
    {
      $group: {
        _id: '$productId',
        totalQty: { $sum: '$quantity' },
        avgCost: { $avg: '$avgCost' },
      },
    },
  ])

  const items: StockValuationEntry[] = result.map((r: any) => ({
    productId: String(r._id),
    totalQty: r.totalQty,
    avgCost: r.avgCost,
    totalValue: r.totalQty * r.avgCost,
  }))

  const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0)

  return { items, totalValue }
}
