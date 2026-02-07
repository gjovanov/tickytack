import { Account, JournalEntry, type IJournalEntry } from 'db/src/models'
import { accountDao } from '../dao/accounting/account.dao'
import { journalEntryDao } from '../dao/accounting/journal-entry.dao'

// Debit-normal accounts: asset, expense (debit increases balance)
// Credit-normal accounts: liability, equity, revenue (credit increases balance)
const DEBIT_NORMAL_TYPES = ['asset', 'expense']

export async function postJournalEntry(entryId: string): Promise<IJournalEntry> {
  const entry = await journalEntryDao.findById(entryId)
  if (!entry) throw new Error('Journal entry not found')
  if (entry.status === 'posted') throw new Error('Journal entry already posted')
  if (entry.status === 'voided') throw new Error('Cannot post a voided journal entry')

  // Validate balanced entry
  let totalDebits = 0
  let totalCredits = 0
  for (const line of entry.lines) {
    totalDebits += line.debit
    totalCredits += line.credit
  }
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error('Journal entry is not balanced')
  }

  // Update account balances
  for (const line of entry.lines) {
    const account = await accountDao.findById(String(line.accountId))
    if (!account) throw new Error(`Account ${line.accountId} not found`)

    let balanceChange: number
    if (DEBIT_NORMAL_TYPES.includes(account.type)) {
      balanceChange = line.debit - line.credit
    } else {
      balanceChange = line.credit - line.debit
    }

    await Account.findByIdAndUpdate(account._id, {
      $inc: { balance: balanceChange },
    })
  }

  const updated = await JournalEntry.findByIdAndUpdate(
    entryId,
    { $set: { status: 'posted', postedAt: new Date() } },
    { new: true },
  )

  return updated!
}

export async function voidJournalEntry(entryId: string): Promise<IJournalEntry> {
  const entry = await journalEntryDao.findById(entryId)
  if (!entry) throw new Error('Journal entry not found')
  if (entry.status === 'draft') throw new Error('Cannot void a draft journal entry')
  if (entry.status === 'voided') throw new Error('Journal entry already voided')

  // Reverse account balance adjustments
  for (const line of entry.lines) {
    const account = await accountDao.findById(String(line.accountId))
    if (!account) throw new Error(`Account ${line.accountId} not found`)

    let balanceChange: number
    if (DEBIT_NORMAL_TYPES.includes(account.type)) {
      balanceChange = -(line.debit - line.credit)
    } else {
      balanceChange = -(line.credit - line.debit)
    }

    await Account.findByIdAndUpdate(account._id, {
      $inc: { balance: balanceChange },
    })
  }

  const updated = await JournalEntry.findByIdAndUpdate(
    entryId,
    { $set: { status: 'voided', voidedAt: new Date() } },
    { new: true },
  )

  return updated!
}

export interface TrialBalanceEntry {
  accountId: string
  accountCode: string
  accountName: string
  accountType: string
  debit: number
  credit: number
}

export async function getTrialBalance(
  orgId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<TrialBalanceEntry[]> {
  const accounts = await accountDao.findByOrgId(orgId)

  // If date range specified, compute balances from posted entries in range
  let entries: IJournalEntry[] = []
  if (startDate && endDate) {
    entries = (await journalEntryDao.findByDateRange(orgId, startDate, endDate))
      .filter(e => e.status === 'posted')
  }

  const result: TrialBalanceEntry[] = []

  for (const account of accounts) {
    let netBalance = account.balance

    // If filtering by period, calculate balance from entries instead
    if (startDate && endDate) {
      netBalance = 0
      for (const entry of entries) {
        for (const line of entry.lines) {
          if (String(line.accountId) === String(account._id)) {
            if (DEBIT_NORMAL_TYPES.includes(account.type)) {
              netBalance += line.debit - line.credit
            } else {
              netBalance += line.credit - line.debit
            }
          }
        }
      }
    }

    if (netBalance === 0) continue

    const debit = netBalance > 0 && DEBIT_NORMAL_TYPES.includes(account.type) ? netBalance
      : netBalance < 0 && !DEBIT_NORMAL_TYPES.includes(account.type) ? Math.abs(netBalance)
      : netBalance > 0 && !DEBIT_NORMAL_TYPES.includes(account.type) ? 0
      : 0
    const credit = netBalance > 0 && !DEBIT_NORMAL_TYPES.includes(account.type) ? netBalance
      : netBalance < 0 && DEBIT_NORMAL_TYPES.includes(account.type) ? Math.abs(netBalance)
      : netBalance > 0 && DEBIT_NORMAL_TYPES.includes(account.type) ? 0
      : 0

    result.push({
      accountId: String(account._id),
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      debit: debit || Math.abs(Math.min(netBalance, 0)),
      credit: credit || Math.abs(Math.min(netBalance, 0)),
    })
  }

  return result
}

export interface ProfitLossResult {
  revenue: { accountId: string; accountName: string; amount: number }[]
  expenses: { accountId: string; accountName: string; amount: number }[]
  totalRevenue: number
  totalExpenses: number
  netIncome: number
}

export async function getProfitLoss(
  orgId: string,
  startDate: Date,
  endDate: Date,
): Promise<ProfitLossResult> {
  const entries = (await journalEntryDao.findByDateRange(orgId, startDate, endDate))
    .filter(e => e.status === 'posted')

  const accounts = await accountDao.findByOrgId(orgId)
  const accountMap = new Map(accounts.map(a => [String(a._id), a]))

  // Accumulate amounts per account
  const accountAmounts = new Map<string, number>()

  for (const entry of entries) {
    for (const line of entry.lines) {
      const accountId = String(line.accountId)
      const account = accountMap.get(accountId)
      if (!account) continue
      if (account.type !== 'revenue' && account.type !== 'expense') continue

      const current = accountAmounts.get(accountId) || 0
      if (account.type === 'revenue') {
        accountAmounts.set(accountId, current + (line.credit - line.debit))
      } else {
        accountAmounts.set(accountId, current + (line.debit - line.credit))
      }
    }
  }

  const revenue: ProfitLossResult['revenue'] = []
  const expenses: ProfitLossResult['expenses'] = []

  for (const [accountId, amount] of accountAmounts) {
    const account = accountMap.get(accountId)!
    if (account.type === 'revenue') {
      revenue.push({ accountId, accountName: account.name, amount })
    } else {
      expenses.push({ accountId, accountName: account.name, amount })
    }
  }

  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
  }
}
