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
  Progress,
  Tag,
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
    // Daily totals
    dailyTotals, dailyTotalsLoading,
    // Common
    customCategories, currentMode,
    // Actions
    fetchMonthlySummary, fetchMonthlyTotals, fetchMonthlyCount,
    fetchIncomeMonthlySummary, fetchIncomeMonthlyTotals, fetchIncomeMonthlyCount,
    fetchDailyTotals,
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
    fetchDailyTotals(isExpense ? 'expense' : 'income', year, month)
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

  // ============ Pie Chart Data ============
  const pieData = useMemo(
    () => summary.map(item => ({
      type: item.category_l1,
      value: item.total,
      icon: iconMap[item.category_l1] || '📌',
    })),
    [summary, iconMap]
  )

  // ============ 12-Month Trend Data ============
  const barData = useMemo(
    () => [...totals].reverse().map(item => ({
      month: item.month,
      amount: item.total,
    })),
    [totals]
  )

  // ============ Daily Comparison Data ============
  const dailyData = useMemo(() => {
    const year = selectedMonth.year()
    const month = selectedMonth.month() + 1
    const daysInMonth = selectedMonth.daysInMonth()

    // Build a map of date -> total
    const totalMap: Record<string, number> = {}
    for (const d of dailyTotals) {
      totalMap[d.date] = d.total
    }

    // Pad all days of the month
    const result: { day: string; amount: number }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      result.push({
        day: `${d}日`,
        amount: totalMap[dateStr] || 0,
      })
    }
    return result
  }, [dailyTotals, selectedMonth])

  const hasPieData = pieData.length > 0
  const hasBarData = barData.length > 0
  const hasDailyData = dailyData.some(d => d.amount > 0)

  // ============ Chart Configs ============

  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    height: 400,
    radius: 0.8,
    innerRadius: 0.6,
    legend: {
      color: {
        position: 'bottom',
        layout: { justifyContent: 'center' },
      },
    },
  }

  const barConfig = {
    data: barData,
    xField: 'month',
    yField: 'amount',
    height: 340,
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
    },
    axis: {
      y: {
        labelFormatter: (v: string) => `¥${Number(v).toFixed(0)}`,
      },
    },
    color: isExpense ? '#1677ff' : '#52c41a',
  }

  const dailyConfig = {
    data: dailyData,
    xField: 'day',
    yField: 'amount',
    height: 300,
    axis: {
      y: {
        labelFormatter: (v: string) => `¥${Number(v).toFixed(0)}`,
      },
    },
    color: isExpense ? '#ff7875' : '#73d13d',
  }

  // ============ Ranking Data ============
  const rankingData = useMemo(
    () => [...summary].sort((a, b) => b.total - a.total),
    [summary]
  )
  const rankMaxTotal = rankingData.length > 0 ? rankingData[0].total : 1

  const amountColor = isExpense ? '#ff4d4f' : '#52c41a'
  const amountTitle = isExpense ? '本月总支出' : '本月总收入'
  const pieTitle = isExpense ? '📈 支出构成' : '📈 收入构成'
  const barTitle = isExpense ? '📉 近12个月支出趋势' : '📉 近12个月收入趋势'
  const dailyTitle = isExpense ? '📊 每日支出对比' : '📊 每日收入对比'
  const rankTitle = isExpense ? '🏆 支出排行' : '🏆 收入排行'
  const emptyPieText = isExpense ? '本月暂无支出记录' : '本月暂无收入记录'
  const emptyBarText = isExpense ? '暂无支出记录' : '暂无收入记录'

  return (
    <div className="statistics-page">
      {/* Header */}
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

      {/* Summary Cards */}
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

      {/* Daily Comparison Chart */}
      <Card title={dailyTitle} style={{ marginBottom: 24 }}>
        {dailyTotalsLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : !hasDailyData ? (
          <Empty description={emptyBarText} style={{ padding: '40px 0' }} />
        ) : (
          <div style={{ height: 300 }}>
            <Column {...dailyConfig} />
          </div>
        )}
      </Card>

      {/* Pie Chart — full width */}
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

      {/* Ranking List */}
      <Card title={rankTitle} style={{ marginBottom: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : rankingData.length === 0 ? (
          <Empty description={emptyPieText} style={{ padding: '40px 0' }} />
        ) : (
          <Row gutter={[16, 16]}>
            {rankingData.map((item, index) => {
              const pct = rankMaxTotal > 0 ? (item.total / rankMaxTotal) * 100 : 0
              const rankColors = ['#ff4d4f', '#ff7a45', '#ffa940', '#1677ff']
              const rankColor = index < 3 ? rankColors[index] : '#999'
              return (
                <Col xs={24} sm={12} md={8} key={item.category_l1}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Space size={8}>
                        <Tag color={index < 3 ? (isExpense ? 'red' : 'green') : 'default'} style={{ borderRadius: 10, minWidth: 28, textAlign: 'center' }}>
                          {index + 1}
                        </Tag>
                        <span style={{ fontSize: 14 }}>
                          {iconMap[item.category_l1] || '📌'} {item.category_l1}
                        </span>
                      </Space>
                      <span style={{ fontSize: 14, fontWeight: 600, color: amountColor }}>
                        ¥{item.total.toFixed(2)}
                      </span>
                    </div>
                    <Progress
                      percent={pct}
                      showInfo={false}
                      strokeColor={rankColor}
                      trailColor="#f0f0f0"
                      size="small"
                    />
                  </div>
                </Col>
              )
            })}
          </Row>
        )}
      </Card>

      {/* 12-Month Trend */}
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
