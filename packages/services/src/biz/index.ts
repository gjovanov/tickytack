export {
  calculatePayroll,
  approvePayroll,
} from './payroll.service'

export {
  postJournalEntry,
  voidJournalEntry,
  getTrialBalance,
  getProfitLoss,
  type TrialBalanceEntry,
  type ProfitLossResult,
} from './accounting.service'

export {
  adjustStock,
  confirmMovement,
  getStockValuation,
  type StockValuationEntry,
} from './warehouse.service'

export {
  calculateInvoiceTotals,
  recordPayment,
  sendInvoice,
  checkOverdueInvoices,
} from './invoicing.service'

export {
  convertLead,
  moveDealStage,
  getPipelineSummary,
  type PipelineSummary,
} from './crm.service'

export {
  submitLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
} from './hr.service'

export {
  openPosSession,
  closePosSession,
  createPosTransaction,
  startProduction,
  completeProduction,
} from './erp.service'
