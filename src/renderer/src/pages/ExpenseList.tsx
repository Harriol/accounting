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
} from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { categories, getCategoryIcon } from '../data/categories'
import { useStore } from '../store/useStore'
import type { Expense } from '../../../preload/index'

function ExpenseList(): JSX.Element {
  const { expenses, expensesLoading, expensesError, filterMonth, filterCategory, fetchExpenses, setFilterMonth, setFilterCategory, deleteExpense, navigateTo } = useStore()

  useEffect(() => {
    fetchExpenses()
  }, [])

  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  )

  const handleMonthChange = (date: Dayjs | null): void => {
    setFilterMonth(date ? date.format('YYYY-MM') : null)
  }

  const handleCategoryChange = (value: string | undefined): void => {
    setFilterCategory(value || null)
  }

  const handleDelete = async (id: string): Promise<void> => {
    const ok = await deleteExpense(id)
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

  return (
    <div className="expense-list-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          📋 账本
        </h2>
        <Space>
          <Select
            placeholder="全部分类"
            allowClear
            style={{ width: 140 }}
            onChange={handleCategoryChange}
            value={filterCategory}
            options={categories.map(c => ({
              label: `${c.icon} ${c.label}`,
              value: c.value,
            }))}
          />
          <DatePicker
            picker="month"
            placeholder="选择月份"
            allowClear
            onChange={handleMonthChange}
            value={filterMonth ? dayjs(filterMonth) : null}
          />
        </Space>
      </div>

      <Card>
        {/* Error banner */}
        {expensesError && (
          <Alert
            message={expensesError}
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Summary */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0 16px',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 8,
        }}>
          <span style={{ color: '#666', fontSize: 14 }}>
            共 {expenses.length} 笔支出
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#ff4d4f' }}>
            ¥{totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Expense List */}
        {expenses.length === 0 ? (
          <Empty
            description="暂无记账记录"
            style={{ padding: '40px 0' }}
          >
            <Button type="primary" onClick={() => navigateTo('record')}>
              去记一笔
            </Button>
          </Empty>
        ) : (
          <List
            loading={expensesLoading}
            dataSource={expenses}
            renderItem={(item: Expense) => (
              <div className="expense-item">
                <div className="expense-left">
                  <div className="expense-icon">
                    {getCategoryIcon(item.category_l1)}
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
                  <span className="expense-amount">
                    -¥{item.amount.toFixed(2)}
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
