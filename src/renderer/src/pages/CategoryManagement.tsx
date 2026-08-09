import { useState, useMemo } from 'react'
import {
  Card,
  Button,
  Modal,
  Input,
  Collapse,
  Select,
  Space,
  Popconfirm,
  message,
  Empty,
  Spin,
  Tag,
  Segmented,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { categories } from '../data/categories'
import { incomeCategories } from '../data/incomeCategories'
import { useStore } from '../store/useStore'
import type { CustomCategory } from '../../../preload/index'

const EMOJI_GROUPS = [
  {
    label: '餐饮',
    emojis: ['🍜', '🍔', '🍕', '🍣', '🍰', '🍩', '🍺', '☕', '🍵', '🥤', '🍱', '🍲', '🥗', '🍿', '🧋'],
  },
  {
    label: '交通',
    emojis: ['🚗', '🚌', '🚇', '✈️', '🚲', '🚢', '🚕', '🛴', '🏍️', '⛽', '🚄', '🅿️', '🚶', '🛵'],
  },
  {
    label: '购物',
    emojis: ['🛒', '👗', '👟', '💄', '👜', '💻', '📱', '⌚', '🪑', '🛏️', '🖥️', '🎧', '🧴'],
  },
  {
    label: '居家',
    emojis: ['🏠', '💡', '🔧', '📡', '🔑', '🪴', '🧹', '🛁', '🪜', '🔌', '🪟'],
  },
  {
    label: '娱乐',
    emojis: ['🎮', '🎬', '🎵', '🏀', '⚽', '🎤', '🎯', '🧩', '🎨', '🎪', '🐶', '🐱', '🎳'],
  },
  {
    label: '生活',
    emojis: ['🏥', '💊', '📚', '✏️', '🎁', '💝', '💰', '📦', '💇', '📋', '🔖', '🧧', '🎓', '💳'],
  },
]

function CategoryManagement(): JSX.Element {
  const store = useStore()
  const {
    customCategories, categoriesLoading, currentMode,
    addCategory, updateCategory, deleteCategory,
    setMode,
  } = store

  const isExpense = currentMode === 'expense'

  // Filter custom categories by type
  const filteredCustomCats = useMemo(
    () => customCategories.filter(c =>
      isExpense ? c.category_type !== 'income' : c.category_type === 'income'
    ),
    [isExpense, customCategories]
  )

  // Current preset categories
  const presetCategories = isExpense ? categories : incomeCategories

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null)
  const [modalName, setModalName] = useState('')
  const [modalEmoji, setModalEmoji] = useState('📌')
  const [modalParent, setModalParent] = useState<string | null>(null)
  const [modalIsL1, setModalIsL1] = useState(true)
  const [modalSubmitting, setModalSubmitting] = useState(false)

  // Group custom L2s by parent_value
  const customL2ByParent = useMemo(() => {
    const map: Record<string, CustomCategory[]> = {}
    for (const cc of filteredCustomCats) {
      if (cc.parent_value !== null) {
        if (!map[cc.parent_value]) map[cc.parent_value] = []
        map[cc.parent_value].push(cc)
      }
    }
    return map
  }, [filteredCustomCats])

  // Custom L1 categories
  const customL1s = useMemo(
    () => filteredCustomCats.filter(c => c.parent_value === null),
    [filteredCustomCats]
  )

  const handleModeChange = (val: string | number): void => {
    setMode(val as 'expense' | 'income')
  }

  const handleAddL1 = (): void => {
    setEditingCategory(null)
    setModalName('')
    setModalEmoji('📌')
    setModalParent(null)
    setModalIsL1(true)
    setModalOpen(true)
  }

  const handleAddL2 = (parentValue: string): void => {
    setEditingCategory(null)
    setModalName('')
    setModalEmoji('📌')
    setModalParent(parentValue)
    setModalIsL1(false)
    setModalOpen(true)
  }

  const handleEdit = (cat: CustomCategory): void => {
    setEditingCategory(cat)
    setModalName(cat.label)
    setModalEmoji(cat.icon)
    setModalParent(cat.parent_value)
    setModalIsL1(cat.parent_value === null)
    setModalOpen(true)
  }

  const handleModalOk = async (): Promise<void> => {
    if (!modalName.trim()) {
      message.warning('请输入分类名称')
      return
    }

    setModalSubmitting(true)
    try {
      if (editingCategory) {
        const result = await updateCategory({
          id: editingCategory.id,
          label: modalName.trim(),
          icon: modalEmoji,
        })
        if (result.success) {
          message.success('分类已更新')
          setModalOpen(false)
        } else {
          message.error(result.error || '更新失败')
        }
      } else {
        const result = await addCategory({
          label: modalName.trim(),
          icon: modalEmoji,
          parent_value: modalIsL1 ? null : modalParent,
          category_type: isExpense ? 'expense' : 'income',
        })
        if (result.success) {
          message.success('分类已添加')
          setModalOpen(false)
        } else {
          message.error(result.error || '添加失败')
        }
      }
    } catch (err) {
      message.error('操作失败，请重试')
      console.error(err)
    } finally {
      setModalSubmitting(false)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    const result = await deleteCategory(id)
    if (result.success) {
      message.success('分类已删除')
    } else {
      message.error(result.error || '删除失败')
    }
  }

  // All L1 options for parent selector
  const allL1Options = useMemo(() => {
    const options: { label: string; value: string }[] = []
    for (const c of presetCategories) {
      options.push({ label: `${c.icon} ${c.label}`, value: c.value })
    }
    for (const c of customL1s) {
      options.push({ label: `${c.icon} ${c.label}`, value: c.value })
    }
    return options
  }, [presetCategories, customL1s])

  // Build merged list for Collapse
  const allL1Categories = useMemo(() => {
    const list: { label: string; value: string; icon: string; isPreset: boolean; l2List: { label: string; value: string; isPreset: boolean; customId?: string; customIcon?: string }[] }[] = []

    for (const cat of presetCategories) {
      const presetL2s = cat.children.map(sub => ({
        label: sub.label,
        value: sub.value,
        isPreset: true,
      }))
      const customL2s = (customL2ByParent[cat.value] || []).map(cc => ({
        label: cc.label,
        value: cc.value,
        isPreset: false,
        customId: cc.id,
        customIcon: cc.icon,
      }))
      list.push({
        label: cat.label,
        value: cat.value,
        icon: cat.icon,
        isPreset: true,
        l2List: [...presetL2s, ...customL2s],
      })
    }

    for (const cc of customL1s) {
      const customL2s = (customL2ByParent[cc.value] || []).map(l2 => ({
        label: l2.label,
        value: l2.value,
        isPreset: false,
        customId: l2.id,
        customIcon: l2.icon,
      }))
      list.push({
        label: cc.label,
        value: cc.value,
        icon: cc.icon,
        isPreset: false,
        l2List: customL2s,
      })
    }

    return list
  }, [presetCategories, customL1s, customL2ByParent])

  const presetLabel = isExpense ? '预设支出' : '预设收入'
  const customLabel = isExpense ? '自定义支出' : '自定义收入'

  return (
    <div className="category-management-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          <AppstoreOutlined style={{ marginRight: 8 }} />
          管理分类
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddL1}>
            新增一级分类
          </Button>
        </Space>
      </div>

      <Card>
        {categoriesLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : allL1Categories.length === 0 ? (
          <Empty description="暂无分类" />
        ) : (
          <Collapse
            expandIconPosition="end"
            items={allL1Categories.map(l1 => ({
              key: l1.value,
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{l1.icon}</span>
                  <span style={{ fontWeight: 500 }}>{l1.label}</span>
                  {l1.isPreset ? (
                    <Tag icon={<LockOutlined />} color="default" style={{ marginLeft: 4 }}>{presetLabel}</Tag>
                  ) : (
                    <Tag color="blue" style={{ marginLeft: 4 }}>{customLabel}</Tag>
                  )}
                </div>
              ),
              extra: (
                <Space onClick={e => e.stopPropagation()}>
                  {!l1.isPreset && (
                    <>
                      <Button
                        type="text" size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          const cat = customL1s.find(c => c.value === l1.value)
                          if (cat) handleEdit(cat)
                        }}
                      />
                      <Popconfirm
                        title="确定删除此分类？"
                        description="其下所有二级分类也将被删除。已有记账记录不受影响。"
                        onConfirm={() => {
                          const cat = customL1s.find(c => c.value === l1.value)
                          if (cat) handleDelete(cat.id)
                        }}
                        okText="删除" cancelText="取消"
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </>
                  )}
                  <Button type="link" size="small" icon={<PlusOutlined />}
                    onClick={() => handleAddL2(l1.value)}
                  >
                    添加小类
                  </Button>
                </Space>
              ),
              children: (
                <div>
                  {l1.l2List.length === 0 ? (
                    <div style={{ color: '#999', fontSize: 13, padding: '8px 0' }}>
                      暂无二级分类，点击右上角"添加小类"创建
                    </div>
                  ) : (
                    <div className="category-l2-grid">
                      {l1.l2List.map(l2 => (
                        <div key={l2.value} className={`category-l2-tag ${!l2.isPreset ? 'custom' : ''}`}>
                          {l2.isPreset ? (
                            <>
                              <LockOutlined style={{ fontSize: 11, color: '#bbb' }} />
                              <span>{l2.label}</span>
                            </>
                          ) : (
                            <>
                              <span>{l2.customIcon || '📌'}</span>
                              <span>{l2.label}</span>
                              <span className="tag-actions">
                                <Button type="text" size="small"
                                  icon={<EditOutlined style={{ fontSize: 11 }} />}
                                  onClick={() => {
                                    const cat = (customL2ByParent[l1.value] || []).find(c => c.id === l2.customId)
                                    if (cat) handleEdit(cat)
                                  }}
                                  style={{ padding: '0 2px', height: 20 }}
                                />
                                <Popconfirm
                                  title="确定删除？"
                                  onConfirm={() => l2.customId && handleDelete(l2.customId)}
                                  okText="删除" cancelText="取消"
                                >
                                  <Button type="text" size="small" danger
                                    icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                                    style={{ padding: '0 2px', height: 20 }}
                                  />
                                </Popconfirm>
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalSubmitting}
        okText="确定" cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>分类级别</div>
          <Select
            value={modalIsL1 ? 'l1' : 'l2'}
            onChange={(val) => {
              setModalIsL1(val === 'l1')
              if (val === 'l1') setModalParent(null)
            }}
            disabled={!!editingCategory}
            style={{ width: '100%' }}
            options={[
              { label: '一级分类（大类）', value: 'l1' },
              { label: '二级分类（小类）', value: 'l2' },
            ]}
          />
        </div>

        {!modalIsL1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>所属一级分类</div>
            <Select
              value={modalParent}
              onChange={setModalParent}
              placeholder="选择上级分类"
              style={{ width: '100%' }}
              disabled={!!editingCategory}
              options={allL1Options}
            />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>分类名称</div>
          <Input
            value={modalName}
            onChange={e => setModalName(e.target.value)}
            placeholder="例如：外卖"
            maxLength={10}
          />
        </div>

        <div>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>选择图标</div>
          <div className="emoji-picker-grid">
            {EMOJI_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>{group.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.emojis.map(emoji => (
                    <div
                      key={emoji}
                      onClick={() => setModalEmoji(emoji)}
                      className={`emoji-item ${modalEmoji === emoji ? 'selected' : ''}`}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CategoryManagement
