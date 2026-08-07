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
} from 'antd'
import { Pie, Column } from '@ant-design/charts'
import dayjs, { Dayjs } from 'dayjs'
import { getCategoryIcon } from '../data/categories'
import { useStore } from '../store/useStore'

function Statistics(): JSX.Element {
  const {
    monthlySummary,
    monthlyTotals,
    monthlyCount,
    statsLoading,
    statsError,
    fetchMonthlySummary,
    fetchMonthlyTotals,
    fetchMonthlyCount,
  } = useStore()

  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs())

  useEffect(() => {
    const year = selectedMonth.year()
    const month = selectedMonth.month() + 1
    fetchMonthlySummary(year, month)
    fetchMonthlyCount(year, month)
  }, [selectedMonth, fetchMonthlySummary, fetchMonthlyCount])

  useEffect(() => {
    fetchMonthlyTotals(12)
  }, [fetchMonthlyTotals])

  const handleMonthChange = (date: Dayjs | null): void => {
    if (date) setSelectedMonth(date)
  }

  // Calculate total for selected month
  const monthTotal = useMemo(
    () => monthlySummary.reduce((sum, item) => sum + item.total, 0),
    [monthlySummary]
  )

  // Daily average
  const dailyAvg = useMemo(
    () => monthTotal > 0 ? monthTotal / Math.max(1, selectedMonth.daysInMonth()) : 0,
    [monthTotal, selectedMonth]
  )

  // Prepare pie chart data
  const pieData = useMemo(
    () => monthlySummary.map(item => ({
      type: item.category_l1,
      value: item.total,
      icon: getCategoryIcon(item.category_l1),
    })),
    [monthlySummary]
  )

  // Prepare bar chart data (oldest first for time-series display)
  const barData = useMemo(
    () => [...monthlyTotals].reverse().map(item => ({
      month: item.month,
      amount: item.total,
    })),
    [monthlyTotals]
  )

  const hasPieData = pieData.length > 0
  const hasBarData = barData.length > 0

  // Pie chart config
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

  // Bar chart config
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
    color: '#1677ff',
  }

  return (
    <div className="statistics-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          📊 统计
        </h2>
        <DatePicker
          picker="month"
          value={selectedMonth}
          onChange={handleMonthChange}
          allowClear={false}
        />
      </div>

      {/* Error banner */}
      {statsError && (
        <Alert
          message={statsError}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card loading={statsLoading}>
            <Statistic
              title="本月总支出"
              value={monthTotal}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#ff4d4f', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={statsLoading}>
            <Statistic
              title="本月笔数"
              value={monthlyCount}
              suffix="笔"
              valueStyle={{ fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={statsLoading}>
            <Statistic
              title="日均支出"
              value={dailyAvg}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1677ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Pie Chart - Category Distribution */}
      <Card title="📈 本月支出构成" style={{ marginBottom: 24 }}>
        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : !hasPieData ? (
          <Empty description="本月暂无支出记录" style={{ padding: '40px 0' }} />
        ) : (
          <div style={{ height: 400 }}>
            <Pie {...pieConfig} />
          </div>
        )}
      </Card>

      {/* Bar Chart - Monthly Trend */}
      <Card title="📉 近12个月支出趋势">
        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : !hasBarData ? (
          <Empty description="暂无支出记录" style={{ padding: '40px 0' }} />
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
