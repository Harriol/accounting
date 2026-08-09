export interface SubCategory {
  label: string
  value: string
}

export interface Category {
  label: string
  value: string
  icon: string
  children: SubCategory[]
}

export const incomeCategories: Category[] = [
  {
    label: '工资收入',
    value: '工资收入',
    icon: '💼',
    children: [
      { label: '月薪', value: '月薪' },
      { label: '奖金', value: '奖金' },
      { label: '补贴', value: '补贴' },
      { label: '年终奖', value: '年终奖' },
    ]
  },
  {
    label: '投资收益',
    value: '投资收益',
    icon: '💰',
    children: [
      { label: '股票基金', value: '股票基金' },
      { label: '理财收益', value: '理财收益' },
      { label: '股息分红', value: '股息分红' },
      { label: '房产租金', value: '房产租金' },
    ]
  },
  {
    label: '副业兼职',
    value: '副业兼职',
    icon: '🔧',
    children: [
      { label: '外包接单', value: '外包接单' },
      { label: '咨询顾问', value: '咨询顾问' },
      { label: '内容创作', value: '内容创作' },
      { label: '自媒体', value: '自媒体' },
    ]
  },
  {
    label: '红包礼金',
    value: '红包礼金',
    icon: '🎁',
    children: [
      { label: '微信红包', value: '微信红包' },
      { label: '转账收款', value: '转账收款' },
      { label: '婚礼礼金', value: '婚礼礼金' },
      { label: '节日红包', value: '节日红包' },
    ]
  },
  {
    label: '退款报销',
    value: '退款报销',
    icon: '💳',
    children: [
      { label: '购物退款', value: '购物退款' },
      { label: '公司报销', value: '公司报销' },
      { label: '保险理赔', value: '保险理赔' },
      { label: '押金退还', value: '押金退还' },
    ]
  },
  {
    label: '其他收入',
    value: '其他收入',
    icon: '🔄',
    children: [
      { label: '二手出售', value: '二手出售' },
      { label: '兼职日结', value: '兼职日结' },
      { label: '佣金返利', value: '佣金返利' },
      { label: '其他', value: '其他' },
    ]
  },
]

/** Merge preset income categories with user-created custom income categories */
export function mergeIncomeCategories(customCategories: { id: string; label: string; value: string; icon: string; parent_value: string | null; is_preset: number }[]): Category[] {
  // Deep clone the preset categories
  const merged: Category[] = incomeCategories.map(cat => ({
    ...cat,
    children: [...cat.children],
  }))

  // Group custom categories by parent
  const customL1: typeof customCategories = []
  const customL2ByParent: Record<string, SubCategory[]> = {}

  for (const cc of customCategories) {
    if (cc.parent_value === null) {
      customL1.push(cc)
    } else {
      if (!customL2ByParent[cc.parent_value]) {
        customL2ByParent[cc.parent_value] = []
      }
      customL2ByParent[cc.parent_value].push({
        label: cc.label,
        value: cc.value,
      })
    }
  }

  // Append custom L2 subcategories to their parent L1
  for (const cat of merged) {
    const customChildren = customL2ByParent[cat.value]
    if (customChildren) {
      cat.children.push(...customChildren)
    }
  }

  // Add custom L1 categories
  for (const l1 of customL1) {
    const children = customL2ByParent[l1.value] || []
    merged.push({
      label: l1.label,
      value: l1.value,
      icon: l1.icon,
      children,
    })
  }

  return merged
}
