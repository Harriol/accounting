import { useState } from 'react'
import {
  Card,
  Form,
  InputNumber,
  DatePicker,
  Input,
  Button,
  message,
  Row,
  Col,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { categories, getSubCategories } from '../data/categories'
import { useStore } from '../store/useStore'

function RecordExpense(): JSX.Element {
  const [form] = Form.useForm()
  const [selectedL1, setSelectedL1] = useState<string | null>(null)
  const [selectedL2, setSelectedL2] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const addExpense = useStore(s => s.addExpense)

  const handleL1Select = (value: string): void => {
    setSelectedL1(value)
    setSelectedL2(null)
    form.setFieldsValue({ category_l1: value, category_l2: undefined })
  }

  const handleL2Select = (value: string): void => {
    setSelectedL2(value)
    form.setFieldsValue({ category_l2: value })
  }

  const handleSubmit = async (values: {
    amount: number
    date: Dayjs
    note?: string
  }): Promise<void> => {
    if (!selectedL1 || !selectedL2) {
      message.warning('请选择支出分类')
      return
    }

    setSubmitting(true)
    try {
      await addExpense({
        amount: values.amount,
        category_l1: selectedL1,
        category_l2: selectedL2,
        date: values.date.format('YYYY-MM-DD'),
        note: values.note || '',
      })
      message.success('记账成功！')

      // Reset form
      form.resetFields()
      form.setFieldsValue({ date: dayjs() })
      setSelectedL1(null)
      setSelectedL2(null)
    } catch (err) {
      message.error('记账失败，请重试')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const subCategories = selectedL1 ? getSubCategories(selectedL1) : []
  const selectedCategory = categories.find(c => c.value === selectedL1)

  return (
    <div className="record-page">
      <h2 style={{ marginBottom: 24, fontSize: 22, fontWeight: 600 }}>
        <PlusOutlined style={{ marginRight: 8 }} />
        记一笔
      </h2>

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
            label="金额（元）"
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
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} allowClear={false} />
          </Form.Item>

          {/* Category Selection */}
          <Form.Item label="支出分类" required>
            {/* Level 1 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>一级分类</div>
              <div className="category-grid">
                {categories.map(cat => (
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

            {/* Level 2 */}
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

          {/* Hidden form fields to store category values */}
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
            >
              记一笔
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default RecordExpense
