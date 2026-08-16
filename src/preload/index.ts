/**
 * @author Harriol
 */
import { contextBridge, ipcRenderer } from 'electron';

export interface Expense {
  id: string;
  amount: number;
  category_l1: string;
  category_l2: string;
  date: string;
  note: string;
  created_at: string;
}

export interface ExpenseInput {
  amount: number;
  category_l1: string;
  category_l2: string;
  date: string;
  note?: string;
}

export interface Income {
  id: string;
  amount: number;
  category_l1: string;
  category_l2: string;
  date: string;
  note: string;
  created_at: string;
}

export interface IncomeInput {
  amount: number;
  category_l1: string;
  category_l2: string;
  date: string;
  note?: string;
}

// 记账模式：支出 / 收入（多文件共用，避免内联重复）
export type Mode = 'expense' | 'income';

export interface MonthlySummary {
  category_l1: string;
  total: number;
}

export interface MonthlyTotal {
  month: string;
  total: number;
}

export interface UnifiedRecord {
  id: string;
  record_type: Mode;
  amount: number;
  category_l1: string;
  category_l2: string;
  date: string;
  note: string;
  created_at: string;
}

export interface DailyTotal {
  date: string;
  total: number;
}

export interface CustomCategory {
  id: string;
  label: string;
  value: string;
  icon: string;
  parent_value: string | null;
  is_preset: number;
  sort_order: number;
  category_type: string;
  created_at: string;
}

export interface CustomCategoryInput {
  label: string;
  icon: string;
  parent_value: string | null;
  category_type?: string;
}

const api = {
  addExpense: (expense: ExpenseInput): Promise<Expense> =>
    ipcRenderer.invoke('expense:add', expense),

  getExpenses: (filters?: {
    startDate?: string;
    endDate?: string;
    category_l1?: string;
  }): Promise<Expense[]> =>
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
    ipcRenderer.invoke('expense:getMonthlyCount', year, month),

  // Income API
  addIncome: (income: IncomeInput): Promise<Income> =>
    ipcRenderer.invoke('income:add', income),

  getIncomes: (filters?: {
    startDate?: string;
    endDate?: string;
    category_l1?: string;
  }): Promise<Income[]> =>
    ipcRenderer.invoke('income:getAll', filters),

  deleteIncome: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('income:delete', id),

  updateIncome: (income: IncomeInput & { id: string }): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('income:update', income),

  getIncomeMonthlySummary: (year: number, month: number): Promise<MonthlySummary[]> =>
    ipcRenderer.invoke('income:getMonthlySummary', year, month),

  getIncomeMonthlyTotals: (months?: number): Promise<MonthlyTotal[]> =>
    ipcRenderer.invoke('income:getMonthlyTotals', months),

  getIncomeMonthlyCount: (year: number, month: number): Promise<number> =>
    ipcRenderer.invoke('income:getMonthlyCount', year, month),

  // Category API
  getCategories: (categoryType?: string): Promise<CustomCategory[]> =>
    ipcRenderer.invoke('category:getAll', categoryType),

  // Unified records (expenses + incomes combined)
  getRecords: (filters?: {
    type?: Mode;
    category_l1?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<UnifiedRecord[]> =>
    ipcRenderer.invoke('record:getAll', filters),

  // Daily totals within a month
  getDailyTotals: (params: { type: Mode; year: number; month: number }): Promise<DailyTotal[]> =>
    ipcRenderer.invoke('record:getDailyTotals', params),

  addCategory: (input: CustomCategoryInput): Promise<{
    success: boolean;
    data?: CustomCategory;
    error?: string;
  }> =>
    ipcRenderer.invoke('category:add', input),

  updateCategory: (input: {
    id: string;
    label: string;
    icon: string;
  }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('category:update', input),

  deleteCategory: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('category:delete', id),
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
