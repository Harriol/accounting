import { useState, useMemo } from 'react'
import {
  Card,
  Form,
  InputNumber,
  DatePicker,
  Input,
  Button,
  message,
  Segmented,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { mergeCategories } from '../data/categories'
import { mergeIncomeCategories } from '../data/incomeCategories'
import { useStore } from '../store/useStore'

function RecordExpense(): JSX.Element {
  const [form] = Form.useForm()
  const [selectedL1, setSelectedL1] = useState<string | null>(null)
  const [selectedL2, setSelectedL2] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const addExpense = useStore(s => s.addExpense)
  const addIncome = useStore(s => s.addIncome)
  const customCategories = useStore(s => s.customCategories)
  const currentMode = useStore(s => s.currentMode)
  const setMode = useStore(s => s.setMode)

  // Pick the right merger and categories based on mode
  const isExpense = currentMode === 'expense'

  // Filter custom categories by type
  const expenseCustomCategories = useMemo(
    () => customCategories.filter(c => c.category_type !== 'income'),
    [customCategories]
  )
  const incomeCustomCategories = useMemo(
    () => customCategories.filter(c => c.category_type === 'income'),
    [customCategories]
  )

  // Merge preset + custom for display
  const mergedCategories = useMemo(
    () => isExpense
      ? mergeCategories(expenseCustomCategories)
      : mergeIncomeCategories(incomeCustomCategories),
    [isExpense, expenseCustomCategories, incomeCustomCategories]
  )

  const handleL1Select = (value: string): void => {
    setSelectedL1(value)
    setSelectedL2(null)
    form.setFieldsValue({ category_l1: value, category_l2: undefined })
  }

  const handleL2Select = (value: string): void => {
    setSelectedL2(value)
    form.setFieldsValue({ category_l2: value })
  }

  const handleModeChange = (val: string | number): void => {
    setMode(val as 'expense' | 'income')
    setSelectedL1(null)
    setSelectedL2(null)
    form.resetFields()
    form.setFieldsValue({ date: dayjs() })
  }

  const handleSubmit = async (values: {
    amount: number
    date: Dayjs
    note?: string
  }): Promise<void> => {
    if (!selectedL1 || !selectedL2) {
      message.warning(isExpense ? '请选择支出分类' : '请选择收入分类')
      return
    }

    setSubmitting(true)
    try {
      const data = {
        amount: values.amount,
        category_l1: selectedL1,
        category_l2: selectedL2,
        date: values.date.format('YYYY-MM-DD'),
        note: values.note || '',
      }
      if (isExpense) {
        await addExpense(data)
        message.success('记账成功！')
      } else {
        await addIncome(data)
        message.success('收入记录成功！')
      }

      form.resetFields()
      form.setFieldsValue({ date: dayjs() })
      setSelectedL1(null)
      setSelectedL2(null)
    } catch (err) {
      message.error(isExpense ? '记账失败，请重试' : '收入记录失败，请重试')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const subCategories = useMemo(() => {
    if (!selectedL1) return []
    const cat = mergedCategories.find(c => c.value === selectedL1)
    return cat?.children || []
  }, [selectedL1, mergedCategories])

  const selectedCategory = mergedCategories.find(c => c.value === selectedL1)
  const pageTitle = isExpense ? '记一笔' : '记收入'
  const amountColor = isExpense ? '#ff4d4f' : '#52c41a'

  return (
    <div className="record-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          <PlusOutlined style={{ marginRight: 8 }} />
          {pageTitle}
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

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ date: dayjs() }}
          size="large"
        >
          <Form.Item
            name="amount"
            label={isExpense ? '金额（元）' : '收入金额（元）'}
            rules={[
              { required: true, message: '请输入金额' },
              { type: 'number', min: 0.01, message: '金额必须大于0' },
            ]}
          >
            <InputNumber
              placeholder="0.00"
              style={{ width: '100%' }}
              precision={2}
              prefix="¥"
              controls={false}
              addonAfter="CNY"
              styles={{ prefix: { color: amountColor } }}
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} allowClear={false} />
          </Form.Item>

          <Form.Item label={isExpense ? '支出分类' : '收入分类'} required>
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>一级分类</div>
              <div className="category-grid">
                {mergedCategories.map(cat => (
                  <div
                    key={cat.value}
                    className={`category-tag ${selectedL1 === cat.value ? 'active' : ''}`}
                    onClick={() => handleL1Select(cat.value)}
                  >
                    {cat.icon} {cat.label}
                  </div>
                ))}
              </div>
            </div>

            {selectedL1 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
                  二级分类
                  {selectedCategory && (
                    <span style={{ color: '#1677ff' }}>
                      {' '}— {selectedCategory.icon} {selectedCategory.label}
                    </span>
                  )}
                </div>
                <div className="category-grid">
                  {subCategories.map(sub => (
                    <div
                      key={sub.value}
                      className={`category-tag ${selectedL2 === sub.value ? 'active' : ''}`}
                      onClick={() => handleL2Select(sub.value)}
                    >
                      {sub.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Form.Item>

          <Form.Item name="category_l1" hidden>
            <input type="hidden" />
          </Form.Item>
          <Form.Item name="category_l2" hidden>
            <input type="hidden" />
          </Form.Item>

          <Form.Item name="note" label="备注（可选）">
            <Input.TextArea
              placeholder="例如：和同事一起午餐"
              rows={2}
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              block
              size="large"
              icon={<PlusOutlined />}
              style={isExpense ? {} : { background: '#52c41a', borderColor: '#52c41a' }}
            >
              {isExpense ? '记一笔' : '记录收入'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default RecordExpense
