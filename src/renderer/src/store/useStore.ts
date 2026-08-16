/**
 * @author Harriol
 */
import { create } from 'zustand';
import type { Expense, ExpenseInput, Income, IncomeInput, CustomCategory, CustomCategoryInput, UnifiedRecord, DailyTotal, Mode } from '../../../preload/index';

export type PageKey = 'record' | 'list' | 'statistics' | 'categories' | 'snake';

interface AppState {
  // 页面导航
  currentPage: PageKey;
  navigateTo: (page: PageKey) => void;

  // 记账模式（支出 / 收入）
  currentMode: Mode;
  setMode: (mode: Mode) => void;

  // 支出数据
  expenses: Expense[];
  expensesLoading: boolean;
  expensesError: string | null;

  // 收入数据
  incomes: Income[];
  incomesLoading: boolean;
  incomesError: string | null;

  // 支出筛选条件
  filterMonth: string | null;
  filterCategory: string | null;
  incomeFilterMonth: string | null;
  incomeFilterCategory: string | null;

  // 支出操作
  fetchExpenses: () => Promise<void>;
  addExpense: (input: ExpenseInput) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<boolean>;
  updateExpense: (input: ExpenseInput & { id: string }) => Promise<boolean>;

  // 收入操作
  fetchIncomes: () => Promise<void>;
  addIncome: (input: IncomeInput) => Promise<Income>;
  deleteIncome: (id: string) => Promise<boolean>;
  updateIncome: (input: IncomeInput & { id: string }) => Promise<boolean>;

  // 支出筛选操作
  setFilterMonth: (month: string | null) => void;
  setFilterCategory: (category: string | null) => void;
  setIncomeFilterMonth: (month: string | null) => void;
  setIncomeFilterCategory: (category: string | null) => void;

  // 支出统计
  monthlySummary: Array<{ category_l1: string; total: number }>;
  monthlyTotals: Array<{ month: string; total: number }>;
  monthlyCount: number;
  statsLoading: boolean;
  statsError: string | null;
  fetchMonthlySummary: (year: number, month: number) => Promise<void>;
  fetchMonthlyTotals: (months?: number) => Promise<void>;
  fetchMonthlyCount: (year: number, month: number) => Promise<void>;

  // 收入统计
  incomeMonthlySummary: Array<{ category_l1: string; total: number }>;
  incomeMonthlyTotals: Array<{ month: string; total: number }>;
  incomeMonthlyCount: number;
  incomeStatsLoading: boolean;
  incomeStatsError: string | null;
  fetchIncomeMonthlySummary: (year: number, month: number) => Promise<void>;
  fetchIncomeMonthlyTotals: (months?: number) => Promise<void>;
  fetchIncomeMonthlyCount: (year: number, month: number) => Promise<void>;

  // 每日汇总（每日对比图用）
  dailyTotals: DailyTotal[];
  dailyTotalsLoading: boolean;
  fetchDailyTotals: (type: Mode, year: number, month: number) => Promise<void>;

  // 分类
  customCategories: CustomCategory[];
  categoriesLoading: boolean;
  fetchCategories: (categoryType?: string) => Promise<void>;
  addCategory: (input: CustomCategoryInput) => Promise<{ success: boolean; error?: string }>;
  updateCategory: (input: {
    id: string;
    label: string;
    icon: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;

  // 统一账本（支出 + 收入合并）
  records: UnifiedRecord[];
  recordsLoading: boolean;
  recordsError: string | null;
  listType: 'all' | 'expense' | 'income';
  listCategory: string | null;
  listDatePreset: 'all' | 'year' | 'month' | 'day';
  listYear: number | null;
  listMonth: number | null;
  listDay: number | null;
  fetchRecords: () => Promise<void>;
  setListType: (type: 'all' | 'expense' | 'income') => void;
  setListCategory: (category: string | null) => void;
  setListDatePreset: (preset: 'all' | 'year' | 'month' | 'day') => void;
  setListYear: (year: number | null) => void;
  setListMonth: (month: number | null) => void;
  setListDay: (day: number | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentPage: 'record' as PageKey,
  navigateTo: (page: PageKey) => set({ currentPage: page }),

  currentMode: 'expense' as Mode,
  setMode: (mode: Mode) => set({ currentMode: mode }),

  expenses: [],
  expensesLoading: false,
  expensesError: null,
  incomes: [],
  incomesLoading: false,
  incomesError: null,

  filterMonth: null,
  filterCategory: null,
  incomeFilterMonth: null,
  incomeFilterCategory: null,

  monthlySummary: [],
  monthlyTotals: [],
  monthlyCount: 0,
  statsLoading: false,
  statsError: null,

  incomeMonthlySummary: [],
  incomeMonthlyTotals: [],
  incomeMonthlyCount: 0,
  incomeStatsLoading: false,
  incomeStatsError: null,

  dailyTotals: [],
  dailyTotalsLoading: false,

  customCategories: [],
  categoriesLoading: false,

  // 统一账本初始状态
  records: [],
  recordsLoading: false,
  recordsError: null,
  listType: 'all',
  listCategory: null,
  listDatePreset: 'all',
  listYear: null,
  listMonth: null,
  listDay: null,

  fetchExpenses: async () => {
    set({ expensesLoading: true, expensesError: null });
    try {
      const { filterMonth, filterCategory } = get();
      const filters: { startDate?: string; endDate?: string; category_l1?: string } = {};

      if (filterMonth) {
        filters.startDate = `${filterMonth}-01`;
        const [year, month] = filterMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        filters.endDate = `${filterMonth}-${String(lastDay).padStart(2, '0')}`;
      }
      if (filterCategory) {
        filters.category_l1 = filterCategory;
      }

      const expenses = await window.api.getExpenses(filters);
      set({ expenses, expensesLoading: false });
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      set({ expensesLoading: false, expensesError: '加载数据失败，请重试' });
    }
  },

  addExpense: async (input: ExpenseInput) => {
    const expense = await window.api.addExpense(input);
    await get().fetchExpenses();
    return expense;
  },

  deleteExpense: async (id: string) => {
    try {
      const result = await window.api.deleteExpense(id);
      if (result.success) {
        await get().fetchExpenses();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to delete expense:', err);
      return false;
    }
  },

  updateExpense: async (input: ExpenseInput & { id: string }) => {
    try {
      const result = await window.api.updateExpense(input);
      if (result.success) {
        await get().fetchExpenses();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to update expense:', err);
      return false;
    }
  },

  setFilterMonth: (month: string | null) => {
    set({ filterMonth: month });
    get().fetchExpenses();
  },

  setFilterCategory: (category: string | null) => {
    set({ filterCategory: category });
    get().fetchExpenses();
  },

  // 收入增删改查
  fetchIncomes: async () => {
    set({ incomesLoading: true, incomesError: null });
    try {
      const { incomeFilterMonth, incomeFilterCategory } = get();
      const filters: { startDate?: string; endDate?: string; category_l1?: string } = {};

      if (incomeFilterMonth) {
        filters.startDate = `${incomeFilterMonth}-01`;
        const [year, month] = incomeFilterMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        filters.endDate = `${incomeFilterMonth}-${String(lastDay).padStart(2, '0')}`;
      }
      if (incomeFilterCategory) {
        filters.category_l1 = incomeFilterCategory;
      }

      const incomes = await window.api.getIncomes(filters);
      set({ incomes, incomesLoading: false });
    } catch (err) {
      console.error('Failed to fetch incomes:', err);
      set({ incomesLoading: false, incomesError: '加载数据失败，请重试' });
    }
  },

  addIncome: async (input: IncomeInput) => {
    const income = await window.api.addIncome(input);
    await get().fetchIncomes();
    return income;
  },

  deleteIncome: async (id: string) => {
    try {
      const result = await window.api.deleteIncome(id);
      if (result.success) {
        await get().fetchIncomes();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to delete income:', err);
      return false;
    }
  },

  updateIncome: async (input: IncomeInput & { id: string }) => {
    try {
      const result = await window.api.updateIncome(input);
      if (result.success) {
        await get().fetchIncomes();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to update income:', err);
      return false;
    }
  },

  // 收入筛选操作
  setIncomeFilterMonth: (month: string | null) => {
    set({ incomeFilterMonth: month });
    get().fetchIncomes();
  },

  setIncomeFilterCategory: (category: string | null) => {
    set({ incomeFilterCategory: category });
    get().fetchIncomes();
  },

  fetchMonthlySummary: async (year: number, month: number) => {
    set({ statsLoading: true, statsError: null });
    try {
      const summary = await window.api.getMonthlySummary(year, month);
      set({ monthlySummary: summary, statsLoading: false });
    } catch (err) {
      console.error('Failed to fetch monthly summary:', err);
      set({ statsLoading: false, statsError: '加载统计数据失败' });
    }
  },

  fetchMonthlyTotals: async (months = 12) => {
    set({ statsLoading: true, statsError: null });
    try {
      const totals = await window.api.getMonthlyTotals(months);
      set({ monthlyTotals: totals, statsLoading: false });
    } catch (err) {
      console.error('Failed to fetch monthly totals:', err);
      set({ statsLoading: false, statsError: '加载趋势数据失败' });
    }
  },

  fetchMonthlyCount: async (year: number, month: number) => {
    try {
      const count = await window.api.getMonthlyCount(year, month);
      set({ monthlyCount: count });
    } catch (err) {
      console.error('Failed to fetch monthly count:', err);
    }
  },

  // 收入统计
  fetchIncomeMonthlySummary: async (year: number, month: number) => {
    set({ incomeStatsLoading: true, incomeStatsError: null });
    try {
      const summary = await window.api.getIncomeMonthlySummary(year, month);
      set({ incomeMonthlySummary: summary, incomeStatsLoading: false });
    } catch (err) {
      console.error('Failed to fetch income monthly summary:', err);
      set({ incomeStatsLoading: false, incomeStatsError: '加载统计数据失败' });
    }
  },

  fetchIncomeMonthlyTotals: async (months = 12) => {
    set({ incomeStatsLoading: true, incomeStatsError: null });
    try {
      const totals = await window.api.getIncomeMonthlyTotals(months);
      set({ incomeMonthlyTotals: totals, incomeStatsLoading: false });
    } catch (err) {
      console.error('Failed to fetch income monthly totals:', err);
      set({ incomeStatsLoading: false, incomeStatsError: '加载趋势数据失败' });
    }
  },

  fetchIncomeMonthlyCount: async (year: number, month: number) => {
    try {
      const count = await window.api.getIncomeMonthlyCount(year, month);
      set({ incomeMonthlyCount: count });
    } catch (err) {
      console.error('Failed to fetch income monthly count:', err);
    }
  },

  fetchDailyTotals: async (type: Mode, year: number, month: number) => {
    set({ dailyTotalsLoading: true });
    try {
      const totals = await window.api.getDailyTotals({ type, year, month });
      set({ dailyTotals: totals, dailyTotalsLoading: false });
    } catch (err) {
      console.error('Failed to fetch daily totals:', err);
      set({ dailyTotalsLoading: false });
    }
  },

  fetchCategories: async (categoryType?: string) => {
    set({ categoriesLoading: true });
    try {
      const categories = await window.api.getCategories(categoryType);
      set({ customCategories: categories, categoriesLoading: false });
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      set({ categoriesLoading: false });
    }
  },

  addCategory: async (input: CustomCategoryInput) => {
    const result = await window.api.addCategory(input);
    if (result.success) {
      await get().fetchCategories();
    }
    return result;
  },

  updateCategory: async (input: { id: string; label: string; icon: string }) => {
    const result = await window.api.updateCategory(input);
    if (result.success) {
      await get().fetchCategories();
    }
    return result;
  },

  deleteCategory: async (id: string) => {
    const result = await window.api.deleteCategory(id);
    if (result.success) {
      await get().fetchCategories();
    }
    return result;
  },

  // 统一账本操作
  fetchRecords: async () => {
    set({ recordsLoading: true, recordsError: null });
    try {
      const { listType, listCategory, listDatePreset, listYear, listMonth, listDay } = get();
      const filters: {
        type?: Mode;
        category_l1?: string;
        startDate?: string;
        endDate?: string;
      } = {};

      // 类型筛选
      if (listType !== 'all') {
        filters.type = listType;
      }

      // 分类筛选
      if (listCategory) {
        filters.category_l1 = listCategory;
      }

      // 按日期预设（年/月/日）换算为起止日期区间
      if (listDatePreset === 'year' && listYear) {
        // 按年：当年 1 月 1 日 至 12 月 31 日
        const y = String(listYear);
        filters.startDate = `${y}-01-01`;
        filters.endDate = `${y}-12-31`;
      } else if (listDatePreset === 'month' && listYear && listMonth) {
        // 按月：当月 1 日 至 月末；new Date(y, m, 0) 会回退到上月最后一天，取其日期即当月天数
        const y = String(listYear);
        const m = String(listMonth).padStart(2, '0');
        const lastDay = new Date(listYear, listMonth, 0).getDate();
        filters.startDate = `${y}-${m}-01`;
        filters.endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      } else if (listDatePreset === 'day' && listYear && listMonth && listDay) {
        // 按日：起止均为当天
        const y = String(listYear);
        const m = String(listMonth).padStart(2, '0');
        const d = String(listDay).padStart(2, '0');
        filters.startDate = `${y}-${m}-${d}`;
        filters.endDate = `${y}-${m}-${d}`;
      }

      const records = await window.api.getRecords(filters);
      set({ records, recordsLoading: false });
    } catch (err) {
      console.error('Failed to fetch records:', err);
      set({ recordsLoading: false, recordsError: '加载数据失败，请重试' });
    }
  },

  setListType: (type) => {
    set({ listType: type });
    get().fetchRecords();
  },

  setListCategory: (category) => {
    set({ listCategory: category });
    get().fetchRecords();
  },

  setListDatePreset: (preset) => {
    set({ listDatePreset: preset, listYear: null, listMonth: null, listDay: null });
    get().fetchRecords();
  },

  setListYear: (year) => {
    set({ listYear: year, listMonth: null, listDay: null });
    if (year !== null) get().fetchRecords();
  },

  setListMonth: (month) => {
    set({ listMonth: month, listDay: null });
    if (month !== null) get().fetchRecords();
  },

  setListDay: (day) => {
    set({ listDay: day });
    if (day !== null) get().fetchRecords();
  },
}));
