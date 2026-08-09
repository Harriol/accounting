import { useEffect, useState, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  DatePicker,
  Statistic,
  Spin,
  Empty,
  Alert,
  Segmented,
  Space,
} from 'antd'
import { Pie, Column } from '@ant-design/charts'
import dayjs, { Dayjs } from 'dayjs'
import { categories } from '../data/categories'
import { incomeCategories } from '../data/incomeCategories'
import { useStore } from '../store/useStore'

function Statistics(): JSX.Element {
  const store = useStore()
  const {
    // Expense stats
    monthlySummary, monthlyTotals, monthlyCount,
    statsLoading, statsError,
    // Income stats
    incomeMonthlySummary, incomeMonthlyTotals, incomeMonthlyCount,
    incomeStatsLoading, incomeStatsError,
    // Common
    customCategories, currentMode,
    // Actions
    fetchMonthlySummary, fetchMonthlyTotals, fetchMonthlyCount,
    fetchIncomeMonthlySummary, fetchIncomeMonthlyTotals, fetchIncomeMonthlyCount,
    setMode,
  } = store

  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs())
  const isExpense = currentMode === 'expense'

  useEffect(() => {
    const year = selectedMonth.year()
    const month = selectedMonth.month() + 1
    if (isExpense) {
      fetchMonthlySummary(year, month)
      fetchMonthlyCount(year, month)
    } else {
      fetchIncomeMonthlySummary(year, month)
      fetchIncomeMonthlyCount(year, month)
    }
  }, [selectedMonth, isExpense])

  useEffect(() => {
    if (isExpense) {
      fetchMonthlyTotals(12)
    } else {
      fetchIncomeMonthlyTotals(12)
    }
  }, [isExpense])

  const handleMonthChange = (date: Dayjs | null): void => {
    if (date) setSelectedMonth(date)
  }

  const handleModeChange = (val: string | number): void => {
    setMode(val as 'expense' | 'income')
  }

  // Mode-specific data
  const summary = isExpense ? monthlySummary : incomeMonthlySummary
  const totals = isExpense ? monthlyTotals : incomeMonthlyTotals
  const count = isExpense ? monthlyCount : incomeMonthlyCount
  const loading = isExpense ? statsLoading : incomeStatsLoading
  const error = isExpense ? statsError : incomeStatsError

  // Filter custom categories by type
  const customCats = useMemo(
    () => customCategories.filter(c =>
      isExpense ? c.category_type !== 'income' : c.category_type === 'income'
    ),
    [isExpense, customCategories]
  )

  // Icon map
  const iconMap = useMemo(() => {
    const map: Record<string, string> = {}
    const cats = isExpense ? categories : incomeCategories
    for (const c of cats) map[c.value] = c.icon
    for (const c of customCats) map[c.value] = c.icon
    return map
  }, [isExpense, customCats])

  const monthTotal = useMemo(
    () => summary.reduce((sum, item) => sum + item.total, 0),
    [summary]
  )

  const dailyAvg = useMemo(
    () => monthTotal > 0 ? monthTotal / Math.max(1, selectedMonth.daysInMonth()) : 0,
    [monthTotal, selectedMonth]
  )

  const pieData = useMemo(
    () => summary.map(item => ({
      type: item.category_l1,
      value: item.total,
      icon: iconMap[item.category_l1] || '📌',
    })),
    [summary, iconMap]
  )

  const barData = useMemo(
    () => [...totals].reverse().map(item => ({
      month: item.month,
      amount: item.total,
    })),
    [totals]
  )

  const hasPieData = pieData.length > 0
  const hasBarData = barData.length > 0

  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      type: 'outer' as const,
      content: '{name}\n¥{value}',
    },
    legend: {
      position: 'bottom' as const,
      layout: 'horizontal' as const,
    },
    tooltip: {
      formatter: (datum: { type: string; value: number }) => ({
        name: datum.type,
        value: `¥${datum.value.toFixed(2)}`,
      }),
    },
    interactions: [{ type: 'element-active' }],
  }

  const barConfig = {
    data: barData,
    xField: 'month',
    yField: 'amount',
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    label: {
      position: 'top' as const,
      formatter: (v: { amount: number }) => `¥${v.amount.toFixed(0)}`,
      style: {
        fill: '#666',
        fontSize: 12,
      },
    },
    tooltip: {
      formatter: (datum: { month: string; amount: number }) => ({
        name: datum.month,
        value: `¥${datum.amount.toFixed(2)}`,
      }),
    },
    xAxis: {
      label: { autoRotate: false },
    },
    yAxis: {
      label: {
        formatter: (v: string) => `¥${Number(v).toFixed(0)}`,
      },
    },
    color: isExpense ? '#1677ff' : '#52c41a',
  }

  const amountColor = isExpense ? '#ff4d4f' : '#52c41a'
  const amountTitle = isExpense ? '本月总支出' : '本月总收入'
  const pieTitle = isExpense ? '📈 本月支出构成' : '📈 本月收入构成'
  const barTitle = isExpense ? '📉 近12个月支出趋势' : '📉 近12个月收入趋势'
  const emptyPieText = isExpense ? '本月暂无支出记录' : '本月暂无收入记录'
  const emptyBarText = isExpense ? '暂无支出记录' : '暂无收入记录'

  return (
    <div className="statistics-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          📊 统计
        </h2>
        <Space>
          <Segmented
            value={currentMode}
            onChange={handleModeChange}
            options={[
              { label: '💸 支出', value: 'expense' },
              { label: '💰 收入', value: 'income' },
            ]}
          />
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            allowClear={false}
          />
        </Space>
      </div>

      {error && (
        <Alert
          message={error}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title={amountTitle}
              value={monthTotal}
              precision={2}
              prefix="¥"
              valueStyle={{ color: amountColor, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="本月笔数"
              value={count}
              suffix="笔"
              valueStyle={{ fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="日均"
              value={dailyAvg}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1677ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={pieTitle} style={{ marginBottom: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : !hasPieData ? (
          <Empty description={emptyPieText} style={{ padding: '40px 0' }} />
        ) : (
          <div style={{ height: 400 }}>
            <Pie {...pieConfig} />
          </div>
        )}
      </Card>

      <Card title={barTitle}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : !hasBarData ? (
          <Empty description={emptyBarText} style={{ padding: '40px 0' }} />
        ) : (
          <div style={{ height: 340 }}>
            <Column {...barConfig} />
          </div>
        )}
      </Card>
    </div>
  )
}

export default Statistics
