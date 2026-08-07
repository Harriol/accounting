import { create } from 'zustand'
import type { Expense, ExpenseInput } from '../../../preload/index'

export type PageKey = 'record' | 'list' | 'statistics'

interface AppState {
  // Navigation
  currentPage: PageKey
  navigateTo: (page: PageKey) => void

  // Expenses
  expenses: Expense[]
  expensesLoading: boolean
  expensesError: string | null

  // Filters
  filterMonth: string | null
  filterCategory: string | null

  // Actions
  fetchExpenses: () => Promise<void>
  addExpense: (input: ExpenseInput) => Promise<Expense>
  deleteExpense: (id: string) => Promise<boolean>
  updateExpense: (input: ExpenseInput & { id: string }) => Promise<boolean>

  // Filter actions
  setFilterMonth: (month: string | null) => void
  setFilterCategory: (category: string | null) => void

  // Statistics
  monthlySummary: { category_l1: string; total: number }[]
  monthlyTotals: { month: string; total: number }[]
  monthlyCount: number
  statsLoading: boolean
  statsError: string | null
  fetchMonthlySummary: (year: number, month: number) => Promise<void>
  fetchMonthlyTotals: (months?: number) => Promise<void>
  fetchMonthlyCount: (year: number, month: number) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  currentPage: 'record' as PageKey,
  navigateTo: (page: PageKey) => set({ currentPage: page }),

  expenses: [],
  expensesLoading: false,
  expensesError: null,
  filterMonth: null,
  filterCategory: null,
  monthlySummary: [],
  monthlyTotals: [],
  monthlyCount: 0,
  statsLoading: false,
  statsError: null,

  fetchExpenses: async () => {
    set({ expensesLoading: true, expensesError: null })
    try {
      const { filterMonth, filterCategory } = get()
      const filters: { startDate?: string; endDate?: string; category_l1?: string } = {}

      if (filterMonth) {
        filters.startDate = `${filterMonth}-01`
        const [year, month] = filterMonth.split('-').map(Number)
        const lastDay = new Date(year, month, 0).getDate()
        filters.endDate = `${filterMonth}-${String(lastDay).padStart(2, '0')}`
      }
      if (filterCategory) {
        filters.category_l1 = filterCategory
      }

      const expenses = await window.api.getExpenses(filters)
      set({ expenses, expensesLoading: false })
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
      set({ expensesLoading: false, expensesError: '加载数据失败，请重试' })
    }
  },

  addExpense: async (input: ExpenseInput) => {
    const expense = await window.api.addExpense(input)
    await get().fetchExpenses()
    return expense
  },

  deleteExpense: async (id: string) => {
    try {
      const result = await window.api.deleteExpense(id)
      if (result.success) {
        await get().fetchExpenses()
      }
      return result.success
    } catch (err) {
      console.error('Failed to delete expense:', err)
      return false
    }
  },

  updateExpense: async (input: ExpenseInput & { id: string }) => {
    try {
      const result = await window.api.updateExpense(input)
      if (result.success) {
        await get().fetchExpenses()
      }
      return result.success
    } catch (err) {
      console.error('Failed to update expense:', err)
      return false
    }
  },

  setFilterMonth: (month: string | null) => {
    set({ filterMonth: month })
    get().fetchExpenses()
  },

  setFilterCategory: (category: string | null) => {
    set({ filterCategory: category })
    get().fetchExpenses()
  },

  fetchMonthlySummary: async (year: number, month: number) => {
    set({ statsLoading: true, statsError: null })
    try {
      const summary = await window.api.getMonthlySummary(year, month)
      set({ monthlySummary: summary, statsLoading: false })
    } catch (err) {
      console.error('Failed to fetch monthly summary:', err)
      set({ statsLoading: false, statsError: '加载统计数据失败' })
    }
  },

  fetchMonthlyTotals: async (months: number = 12) => {
    set({ statsLoading: true, statsError: null })
    try {
      const totals = await window.api.getMonthlyTotals(months)
      set({ monthlyTotals: totals, statsLoading: false })
    } catch (err) {
      console.error('Failed to fetch monthly totals:', err)
      set({ statsLoading: false, statsError: '加载趋势数据失败' })
    }
  },

  fetchMonthlyCount: async (year: number, month: number) => {
    try {
      const count = await window.api.getMonthlyCount(year, month)
      set({ monthlyCount: count })
    } catch (err) {
      console.error('Failed to fetch monthly count:', err)
    }
  },
}))
