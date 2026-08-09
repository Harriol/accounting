import { useEffect, useMemo } from 'react'
import {
  Card,
  Select,
  DatePicker,
  List,
  Popconfirm,
  Button,
  Empty,
  Space,
  Alert,
  message,
  Segmented,
} from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { categories, mergeCategories } from '../data/categories'
import { incomeCategories, mergeIncomeCategories } from '../data/incomeCategories'
import { useStore } from '../store/useStore'
import type { Expense, Income } from '../../../preload/index'

type RecordItem = Expense | Income

function ExpenseList(): JSX.Element {
  const store = useStore()

  const {
    // Expense state
    expenses, expensesLoading, expensesError,
    filterMonth, filterCategory,
    // Income state
    incomes, incomesLoading, incomesError,
    incomeFilterMonth, incomeFilterCategory,
    // Common
    customCategories, currentMode,
    // Actions
    fetchExpenses, setFilterMonth, setFilterCategory, deleteExpense,
    fetchIncomes, setIncomeFilterMonth, setIncomeFilterCategory, deleteIncome,
    navigateTo, setMode,
  } = store

  useEffect(() => {
    fetchExpenses()
    fetchIncomes()
  }, [])

  const isExpense = currentMode === 'expense'

  // Mode-specific data
  const records: RecordItem[] = isExpense ? expenses : incomes
  const loading = isExpense ? expensesLoading : incomesLoading
  const error = isExpense ? expensesError : incomesError
  const currentFilterMonth = isExpense ? filterMonth : incomeFilterMonth
  const currentFilterCategory = isExpense ? filterCategory : incomeFilterCategory

  // Filter custom categories by type
  const expenseCustomCats = useMemo(
    () => customCategories.filter(c => c.category_type !== 'income'),
    [customCategories]
  )
  const incomeCustomCats = useMemo(
    () => customCategories.filter(c => c.category_type === 'income'),
    [customCategories]
  )

  // Merge categories for filter dropdown
  const mergedCategories = useMemo(
    () => isExpense
      ? mergeCategories(expenseCustomCats)
      : mergeIncomeCategories(incomeCustomCats),
    [isExpense, expenseCustomCats, incomeCustomCats]
  )

  // Icon maps
  const iconMap = useMemo(() => {
    const map: Record<string, string> = {}
    const cats = isExpense ? categories : incomeCategories
    const customCats = isExpense ? expenseCustomCats : incomeCustomCats
    for (const c of cats) map[c.value] = c.icon
    for (const c of customCats) map[c.value] = c.icon
    return map
  }, [isExpense, expenseCustomCats, incomeCustomCats])

  const totalAmount = useMemo(
    () => records.reduce((sum, r) => sum + r.amount, 0),
    [records]
  )

  const handleModeChange = (val: string | number): void => {
    setMode(val as 'expense' | 'income')
  }

  const handleMonthChange = (date: Dayjs | null): void => {
    const val = date ? date.format('YYYY-MM') : null
    if (isExpense) setFilterMonth(val)
    else setIncomeFilterMonth(val)
  }

  const handleCategoryChange = (value: string | undefined): void => {
    const val = value || null
    if (isExpense) setFilterCategory(val)
    else setIncomeFilterCategory(val)
  }

  const handleDelete = async (id: string): Promise<void> => {
    const ok = isExpense ? await deleteExpense(id) : await deleteIncome(id)
    if (!ok) {
      message.error('删除失败，请重试')
    }
  }

  const formatDate = (dateStr: string): string => {
    const d = dayjs(dateStr)
    const today = dayjs()
    const yesterday = dayjs().subtract(1, 'day')
    if (d.isSame(today, 'day')) return '今天'
    if (d.isSame(yesterday, 'day')) return '昨天'
    return d.format('MM月DD日')
  }

  const formatWeekday = (dateStr: string): string => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[dayjs(dateStr).day()]
  }

  const amountColor = isExpense ? '#ff4d4f' : '#52c41a'
  const amountPrefix = isExpense ? '-' : '+'
  const countLabel = isExpense ? '笔支出' : '笔收入'
  const emptyText = isExpense ? '暂无记账记录' : '暂无收入记录'

  return (
    <div className="expense-list-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          📋 账本
        </h2>
        <Segmented
          value={currentMode}
          onChange={handleModeChange}
          options={[
            { label: '💸 支出', value: 'expense' },
            { label: '💰 收入', value: 'income' },
          ]}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Space>
          <Select
            placeholder="全部分类"
            allowClear
            style={{ width: 140 }}
            onChange={handleCategoryChange}
            value={currentFilterCategory}
            options={mergedCategories.map(c => ({
              label: `${c.icon} ${c.label}`,
              value: c.value,
            }))}
          />
          <DatePicker
            picker="month"
            placeholder="选择月份"
            allowClear
            onChange={handleMonthChange}
            value={currentFilterMonth ? dayjs(currentFilterMonth) : null}
          />
        </Space>
      </div>

      <Card>
        {error && (
          <Alert
            message={error}
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0 16px',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 8,
        }}>
          <span style={{ color: '#666', fontSize: 14 }}>
            共 {records.length} {countLabel}
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: amountColor }}>
            {amountPrefix}¥{totalAmount.toFixed(2)}
          </span>
        </div>

        {records.length === 0 ? (
          <Empty
            description={emptyText}
            style={{ padding: '40px 0' }}
          >
            <Button type="primary" onClick={() => navigateTo('record')}>
              {isExpense ? '去记一笔' : '去记收入'}
            </Button>
          </Empty>
        ) : (
          <List
            loading={loading}
            dataSource={records}
            renderItem={(item: RecordItem) => (
              <div className="expense-item">
                <div className="expense-left">
                  <div className="expense-icon">
                    {iconMap[item.category_l1] || '📌'}
                  </div>
                  <div className="expense-info">
                    <div className="expense-category">
                      {item.category_l1} · {item.category_l2}
                    </div>
                    <div className="expense-meta">
                      {formatDate(item.date)} {formatWeekday(item.date)}
                      {item.note && ` · ${item.note}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="expense-amount" style={{ color: amountColor }}>
                    {amountPrefix}¥{item.amount.toFixed(2)}
                  </span>
                  <Popconfirm
                    title="确定删除这条记录？"
                    onConfirm={() => handleDelete(item.id)}
                    okText="删除"
                    cancelText="取消"
                    placement="left"
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </div>
              </div>
            )}
          />
        )}
      </Card>
    </div>
  )
}

export default ExpenseList
