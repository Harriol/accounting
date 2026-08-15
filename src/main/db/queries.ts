/**
 * @author Harriol
 */
// ============ 纯查询构建函数（不依赖 Electron / better-sqlite3，可独立单元测试） ============

/** 生成 YYYY-MM 格式的月份前缀，用于 date LIKE 查询 */
export function monthPrefix(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** 可选的日期 / 分类筛选条件 */
export interface DateFilter {
  startDate?: string;
  endDate?: string;
  category_l1?: string;
}

/** 根据筛选条件构建 WHERE 条件片段与对应参数 */
export function buildDateFilter(filters?: DateFilter): { conditions: string[]; params: string[] } {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.startDate) {
    conditions.push('date >= ?');
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    conditions.push('date <= ?');
    params.push(filters.endDate);
  }
  if (filters?.category_l1) {
    conditions.push('category_l1 = ?');
    params.push(filters.category_l1);
  }

  return { conditions, params };
}

/** 构建单表列表查询（expenses 或 incomes），保持与历史实现一致的 SQL 结构 */
export function buildListQuery(
  table: 'expenses' | 'incomes',
  filters?: DateFilter,
): { query: string; params: string[] } {
  const { conditions, params } = buildDateFilter(filters);
  let query = `SELECT * FROM ${table} WHERE 1=1`;
  for (const condition of conditions) {
    query += ` AND ${condition}`;
  }
  query += ' ORDER BY date DESC, created_at DESC';
  return { query, params };
}

/** 构建统一账本（expenses + incomes 合并）查询；UNION ALL 时参数需翻倍 */
export function buildRecordQuery(filters?: {
  type?: 'expense' | 'income';
  startDate?: string;
  endDate?: string;
  category_l1?: string;
}): { query: string; params: string[] } {
  const { conditions, params } = buildDateFilter(filters);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  if (filters?.type === 'expense') {
    return {
      query: `SELECT *, 'expense' as record_type FROM expenses ${whereClause} ORDER BY created_at DESC`,
      params,
    };
  }
  if (filters?.type === 'income') {
    return {
      query: `SELECT *, 'income' as record_type FROM incomes ${whereClause} ORDER BY created_at DESC`,
      params,
    };
  }
  // UNION ALL：每个 SELECT 都需要一份参数
  return {
    query: `SELECT *, 'expense' as record_type FROM expenses ${whereClause} UNION ALL SELECT *, 'income' as record_type FROM incomes ${whereClause} ORDER BY created_at DESC`,
    params: [...params, ...params],
  };
}
