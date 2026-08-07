import { contextBridge, ipcRenderer } from 'electron'

export interface Expense {
  id: string
  amount: number
  category_l1: string
  category_l2: string
  date: string
  note: string
  created_at: string
}

export interface ExpenseInput {
  amount: number
  category_l1: string
  category_l2: string
  date: string
  note?: string
}

export interface MonthlySummary {
  category_l1: string
  total: number
}

export interface MonthlyTotal {
  month: string
  total: number
}

const api = {
  addExpense: (expense: ExpenseInput): Promise<Expense> =>
    ipcRenderer.invoke('expense:add', expense),

  getExpenses: (filters?: { startDate?: string; endDate?: string; category_l1?: string }): Promise<Expense[]> =>
    ipcRenderer.invoke('expense:getAll', filters),

  deleteExpense: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('expense:delete', id),

  updateExpense: (expense: ExpenseInput & { id: string }): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('expense:update', expense),

  getMonthlySummary: (year: number, month: number): Promise<MonthlySummary[]> =>
    ipcRenderer.invoke('expense:getMonthlySummary', year, month),

  getMonthlyTotals: (months?: number): Promise<MonthlyTotal[]> =>
    ipcRenderer.invoke('expense:getMonthlyTotals', months),

  getMonthlyCount: (year: number, month: number): Promise<number> =>
    ipcRenderer.invoke('expense:getMonthlyCount', year, month)
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
