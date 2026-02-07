import { LeaveRequest, LeaveBalance, type ILeaveRequest } from 'db/src/models'
import { leaveRequestDao } from '../dao/hr/leave-request.dao'
import { leaveBalanceDao } from '../dao/hr/leave-balance.dao'

export async function submitLeaveRequest(data: {
  employeeId: string
  leaveTypeId: string
  startDate: Date
  endDate: Date
  days: number
  reason?: string
  orgId: string
}): Promise<ILeaveRequest> {
  const year = data.startDate.getFullYear()
  const balance = await leaveBalanceDao.findOne(data.orgId, data.employeeId, data.leaveTypeId, year)

  if (!balance) throw new Error('Leave balance not found for this type and year')
  if (balance.remaining < data.days) throw new Error('Insufficient leave balance')

  // Create leave request
  const request = await LeaveRequest.create({
    employeeId: data.employeeId,
    leaveTypeId: data.leaveTypeId,
    startDate: data.startDate,
    endDate: data.endDate,
    days: data.days,
    reason: data.reason,
    status: 'pending',
    orgId: data.orgId,
  })

  // Update balance: increment pending
  await LeaveBalance.findByIdAndUpdate(balance._id, {
    $inc: { pending: data.days },
    $set: { remaining: balance.remaining - data.days },
  })

  return request
}

export async function approveLeaveRequest(
  requestId: string,
  approvedBy: string,
): Promise<ILeaveRequest> {
  const request = await leaveRequestDao.findById(requestId)
  if (!request) throw new Error('Leave request not found')
  if (request.status !== 'pending') throw new Error('Can only approve pending requests')

  const year = request.startDate.getFullYear()
  const balance = await leaveBalanceDao.findOne(
    String(request.orgId),
    String(request.employeeId),
    String(request.leaveTypeId),
    year,
  )
  if (!balance) throw new Error('Leave balance not found')

  // Update balance: decrement pending, increment taken, recalculate remaining
  await LeaveBalance.findByIdAndUpdate(balance._id, {
    $inc: { pending: -request.days, taken: request.days },
  })

  const updated = await LeaveRequest.findByIdAndUpdate(
    requestId,
    { $set: { status: 'approved', approvedBy } },
    { new: true },
  )

  return updated!
}

export async function rejectLeaveRequest(
  requestId: string,
  reason: string,
): Promise<ILeaveRequest> {
  const request = await leaveRequestDao.findById(requestId)
  if (!request) throw new Error('Leave request not found')
  if (request.status !== 'pending') throw new Error('Can only reject pending requests')

  const year = request.startDate.getFullYear()
  const balance = await leaveBalanceDao.findOne(
    String(request.orgId),
    String(request.employeeId),
    String(request.leaveTypeId),
    year,
  )
  if (!balance) throw new Error('Leave balance not found')

  // Restore pending in balance
  await LeaveBalance.findByIdAndUpdate(balance._id, {
    $inc: { pending: -request.days },
    $set: { remaining: balance.remaining + request.days },
  })

  const updated = await LeaveRequest.findByIdAndUpdate(
    requestId,
    { $set: { status: 'rejected', rejectionReason: reason } },
    { new: true },
  )

  return updated!
}
