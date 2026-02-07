import { Employee, PayrollRun, Payslip, type IPayrollRun } from 'db/src/models'
import { employeeDao } from '../dao/payroll/employee.dao'
import { payrollRunDao } from '../dao/payroll/payroll-run.dao'
import { payslipDao } from '../dao/payroll/payslip.dao'

export async function calculatePayroll(payrollRunId: string): Promise<IPayrollRun> {
  const run = await payrollRunDao.findById(payrollRunId)
  if (!run) throw new Error('Payroll run not found')
  if (run.status !== 'draft') throw new Error('Can only calculate draft payroll runs')

  const employees = await employeeDao.findByStatus(String(run.orgId), 'active')

  let totalGross = 0
  let totalDeductions = 0
  let totalNet = 0
  let totalEmployerContributions = 0

  for (const emp of employees) {
    const grossPay = emp.baseSalary

    // Calculate deductions from the run's deduction config
    let empDeductions = 0
    for (const ded of run.deductions) {
      if (ded.type === 'percentage') {
        empDeductions += grossPay * (ded.value / 100)
      } else {
        empDeductions += ded.value
      }
    }

    // Calculate employer contributions from the run's contribution config
    let empContributions = 0
    for (const contrib of run.employerContributions) {
      if (contrib.type === 'percentage') {
        empContributions += grossPay * (contrib.value / 100)
      } else {
        empContributions += contrib.value
      }
    }

    const netPay = grossPay - empDeductions

    totalGross += grossPay
    totalDeductions += empDeductions
    totalNet += netPay
    totalEmployerContributions += empContributions
  }

  // Update deduction amounts on the run
  const updatedDeductions = run.deductions.map(ded => {
    let amount = 0
    for (const emp of employees) {
      if (ded.type === 'percentage') {
        amount += emp.baseSalary * (ded.value / 100)
      } else {
        amount += ded.value
      }
    }
    return { ...ded.toObject ? ded.toObject() : ded, amount }
  })

  const updatedContributions = run.employerContributions.map(contrib => {
    let amount = 0
    for (const emp of employees) {
      if (contrib.type === 'percentage') {
        amount += emp.baseSalary * (contrib.value / 100)
      } else {
        amount += contrib.value
      }
    }
    return { ...contrib.toObject ? contrib.toObject() : contrib, amount }
  })

  const updated = await PayrollRun.findByIdAndUpdate(
    payrollRunId,
    {
      $set: {
        status: 'calculated',
        employeeCount: employees.length,
        totalGross,
        totalDeductions,
        totalNet,
        totalEmployerContributions,
        deductions: updatedDeductions,
        employerContributions: updatedContributions,
        calculatedAt: new Date(),
      },
    },
    { new: true },
  )

  return updated!
}

export async function approvePayroll(payrollRunId: string): Promise<IPayrollRun> {
  const run = await payrollRunDao.findById(payrollRunId)
  if (!run) throw new Error('Payroll run not found')
  if (run.status !== 'calculated') throw new Error('Can only approve calculated payroll runs')

  const employees = await employeeDao.findByStatus(String(run.orgId), 'active')

  // Generate payslips for each employee
  for (const emp of employees) {
    const grossPay = emp.baseSalary

    const earnings = [{ name: 'Base Salary', amount: grossPay }]

    const deductions = run.deductions.map(ded => {
      const amount = ded.type === 'percentage'
        ? grossPay * (ded.value / 100)
        : ded.value
      return { name: ded.name, amount }
    })

    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
    const netPay = grossPay - totalDeductions

    await payslipDao.create({
      payrollRunId: run._id,
      employeeId: emp._id,
      grossPay,
      netPay,
      earnings,
      deductions,
      orgId: run.orgId,
    } as any)
  }

  const updated = await PayrollRun.findByIdAndUpdate(
    payrollRunId,
    { $set: { status: 'approved', approvedAt: new Date() } },
    { new: true },
  )

  return updated!
}
