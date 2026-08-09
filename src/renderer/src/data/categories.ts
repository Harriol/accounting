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

export const categories: Category[] = [
  {
    label: '餐饮美食',
    value: '餐饮美食',
    icon: '🍜',
    children: [
      { label: '三餐', value: '三餐' },
      { label: '零食小吃', value: '零食小吃' },
      { label: '饮品', value: '饮品' },
      { label: '聚餐宴请', value: '聚餐宴请' },
    ]
  },
  {
    label: '交通出行',
    value: '交通出行',
    icon: '🚗',
    children: [
      { label: '公共交通', value: '公共交通' },
      { label: '出租车/网约车', value: '出租车/网约车' },
      { label: '燃油/充电', value: '燃油/充电' },
      { label: '停车费', value: '停车费' },
      { label: '航空/铁路', value: '航空/铁路' },
    ]
  },
  {
    label: '购物消费',
    value: '购物消费',
    icon: '🛒',
    children: [
      { label: '服装鞋帽', value: '服装鞋帽' },
      { label: '数码产品', value: '数码产品' },
      { label: '家居用品', value: '家居用品' },
      { label: '个护美妆', value: '个护美妆' },
      { label: '日用百货', value: '日用百货' },
    ]
  },
  {
    label: '住房生活',
    value: '住房生活',
    icon: '🏠',
    children: [
      { label: '房租/房贷', value: '房租/房贷' },
      { label: '水电燃气', value: '水电燃气' },
      { label: '物业费', value: '物业费' },
      { label: '网络通讯', value: '网络通讯' },
      { label: '维修保养', value: '维修保养' },
    ]
  },
  {
    label: '休闲娱乐',
    value: '休闲娱乐',
    icon: '🎮',
    children: [
      { label: '影视音乐', value: '影视音乐' },
      { label: '运动健身', value: '运动健身' },
      { label: '游戏充值', value: '游戏充值' },
      { label: '旅游度假', value: '旅游度假' },
      { label: '宠物花费', value: '宠物花费' },
    ]
  },
  {
    label: '医疗健康',
    value: '医疗健康',
    icon: '🏥',
    children: [
      { label: '门诊医疗', value: '门诊医疗' },
      { label: '药品购买', value: '药品购买' },
      { label: '体检保健', value: '体检保健' },
      { label: '牙科眼科', value: '牙科眼科' },
    ]
  },
  {
    label: '教育学习',
    value: '教育学习',
    icon: '📚',
    children: [
      { label: '培训课程', value: '培训课程' },
      { label: '书籍教材', value: '书籍教材' },
      { label: '考试报名', value: '考试报名' },
      { label: '文具用品', value: '文具用品' },
    ]
  },
  {
    label: '人情往来',
    value: '人情往来',
    icon: '🎁',
    children: [
      { label: '送礼红包', value: '送礼红包' },
      { label: '孝敬父母', value: '孝敬父母' },
      { label: '婚礼份子', value: '婚礼份子' },
      { label: '慈善捐款', value: '慈善捐款' },
    ]
  },
  {
    label: '金融保险',
    value: '金融保险',
    icon: '💰',
    children: [
      { label: '保险费', value: '保险费' },
      { label: '贷款利息', value: '贷款利息' },
      { label: '投资理财', value: '投资理财' },
      { label: '手续费用', value: '手续费用' },
    ]
  },
  {
    label: '其他支出',
    value: '其他支出',
    icon: '🔧',
    children: [
      { label: '快递邮寄', value: '快递邮寄' },
      { label: '美容美发', value: '美容美发' },
      { label: '会员订阅', value: '会员订阅' },
      { label: '其他杂项', value: '其他杂项' },
    ]
  },
]

/** Get icon for a category by value */
export function getCategoryIcon(categoryValue: string): string {
  const cat = categories.find(c => c.value === categoryValue)
  return cat?.icon || '📌'
}

/** Get all flat sub-categories for a given category */
export function getSubCategories(categoryValue: string): SubCategory[] {
  const cat = categories.find(c => c.value === categoryValue)
  return cat?.children || []
}

/** Merge preset categories with user-created custom categories */
export function mergeCategories(customCategories: { id: string; label: string; value: string; icon: string; parent_value: string | null; is_preset: number }[]): Category[] {
  // Deep clone the preset categories so we don't mutate the original
  const merged: Category[] = categories.map(cat => ({
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

  // Also check custom L1 categories that have L2 children
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
