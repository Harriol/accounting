/**
 * @author Harriol
 */
import { useEffect, useMemo } from 'react';
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
  Segmented,
  Tag,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { categories } from '../data/categories';
import { incomeCategories } from '../data/incomeCategories';
import { useStore } from '../store/useStore';
import type { UnifiedRecord } from '../../../preload/index';

// 日期预设 → DatePicker picker 类型映射
const DATE_PICKER_TYPE: Record<string, 'year' | 'month' | 'date'> = {
  year: 'year',
  month: 'month',
  day: 'date',
};

function ExpenseList(): JSX.Element {
  const store = useStore();

  const {
    // Unified records
    records, recordsLoading, recordsError,
    listType, listCategory, listDatePreset, listYear, listMonth, listDay,
    // Custom categories
    customCategories,
    // Actions
    fetchRecords, setListType, setListCategory,
    setListDatePreset, setListYear, setListMonth, setListDay,
    deleteExpense, deleteIncome,
    navigateTo,
  } = store;

  useEffect(() => {
    fetchRecords();
    // zustand action 引用稳定，仅在挂载时初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate custom categories by type for icon lookups
  const expenseCustomCats = useMemo(
    () => customCategories.filter((c) => c.category_type !== 'income'),
    [customCategories],
  );
  const incomeCustomCats = useMemo(
    () => customCategories.filter((c) => c.category_type === 'income'),
    [customCategories],
  );

  // Build icon map covering both expense and income categories
  const iconMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.value] = c.icon;
    for (const c of incomeCategories) map[c.value] = c.icon;
    for (const c of expenseCustomCats) map[c.value] = c.icon;
    for (const c of incomeCustomCats) map[c.value] = c.icon;
    return map;
  }, [expenseCustomCats, incomeCustomCats]);

  // Build merged L1 category options for filter dropdown
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ label: string; value: string }> = [];
    for (const c of categories) {
      if (!seen.has(c.value)) {
        seen.add(c.value);
        options.push({ label: `${c.icon} ${c.label}`, value: c.value });
      }
    }
    for (const c of incomeCategories) {
      if (!seen.has(c.value)) {
        seen.add(c.value);
        options.push({ label: `${c.icon} ${c.label}`, value: c.value });
      }
    }
    for (const c of customCategories) {
      if (!seen.has(c.value) && c.parent_value === null) {
        seen.add(c.value);
        options.push({ label: `${c.icon} ${c.label}`, value: c.value });
      }
    }
    return options;
  }, [customCategories]);

  // Summary calculations
  const expenseTotal = useMemo(
    () => records
      .filter((r) => r.record_type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0),
    [records],
  );
  const incomeTotal = useMemo(
    () => records
      .filter((r) => r.record_type === 'income')
      .reduce((sum, r) => sum + r.amount, 0),
    [records],
  );

  // Date granularity options
  const datePresetOptions = [
    { label: '全部时间', value: 'all' },
    { label: '按年', value: 'year' },
    { label: '按月', value: 'month' },
    { label: '按日', value: 'day' },
  ];

  // DatePicker value based on current state
  const datePickerValue = useMemo(() => {
    if (listDatePreset === 'year' && listYear) return dayjs().year(listYear);
    if (listDatePreset === 'month' && listYear && listMonth) return dayjs().year(listYear).month(listMonth - 1);
    if (listDatePreset === 'day' && listYear && listMonth && listDay) return dayjs().year(listYear).month(listMonth - 1).date(listDay);
    return null;
  }, [listDatePreset, listYear, listMonth, listDay]);

  const handleDateChange = (date: Dayjs | null): void => {
    if (!date) {
      setListDatePreset('all');
      return;
    }
    if (listDatePreset === 'year') {
      setListYear(date.year());
    } else if (listDatePreset === 'month') {
      setListYear(date.year());
      setListMonth(date.month() + 1);
    } else if (listDatePreset === 'day') {
      setListYear(date.year());
      setListMonth(date.month() + 1);
      setListDay(date.date());
    }
  };

  const handleDelete = async (record: UnifiedRecord): Promise<void> => {
    let ok: boolean;
    if (record.record_type === 'expense') {
      ok = await deleteExpense(record.id);
    } else {
      ok = await deleteIncome(record.id);
    }
    if (ok) {
      message.success('删除成功');
    } else {
      message.error('删除失败，请重试');
    }
  };

  const formatDate = (dateStr: string): string => {
    const d = dayjs(dateStr);
    const today = dayjs();
    const yesterday = dayjs().subtract(1, 'day');
    if (d.isSame(today, 'day')) return '今天';
    if (d.isSame(yesterday, 'day')) return '昨天';
    return d.format('MM月DD日');
  };

  const formatWeekday = (dateStr: string): string => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[dayjs(dateStr).day()];
  };

  const countLabel = (() => {
    if (listType === 'expense') return '笔支出';
    if (listType === 'income') return '笔收入';
    return '条记录';
  })();

  return (
    <div className="expense-list-page">
      {/* Title + Type filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          📋 账本
        </h2>
        <Segmented
          value={listType}
          onChange={(val) => setListType(val as 'all' | 'expense' | 'income')}
          options={[
            { label: '全部', value: 'all' },
            { label: '💸 支出', value: 'expense' },
            { label: '💰 收入', value: 'income' },
          ]}
        />
      </div>

      {/* Filter toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <Select
            placeholder="全部分类"
            allowClear
            style={{ width: 150 }}
            onChange={(val) => setListCategory(val || null)}
            value={listCategory}
            options={categoryOptions}
          />
          <Select
            value={listDatePreset}
            onChange={(val) => setListDatePreset(val as 'all' | 'year' | 'month' | 'day')}
            style={{ width: 100 }}
            options={datePresetOptions}
          />
          {listDatePreset !== 'all' && (
            <DatePicker
              picker={DATE_PICKER_TYPE[listDatePreset]}
              value={datePickerValue}
              onChange={handleDateChange}
              allowClear={false}
            />
          )}
        </Space>
      </div>

      <Card>
        {recordsError && (
          <Alert
            message={recordsError}
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Summary bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0 16px',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 8,
        }}
        >
          <span style={{ color: '#666', fontSize: 14 }}>
            共 {records.length} {countLabel}
          </span>
          <Space size={24}>
            <span style={{ fontSize: 14, color: '#ff4d4f' }}>
              支出 ¥{expenseTotal.toFixed(2)}
            </span>
            <span style={{ fontSize: 14, color: '#52c41a' }}>
              收入 ¥{incomeTotal.toFixed(2)}
            </span>
          </Space>
        </div>

        {records.length === 0 ? (
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
            loading={recordsLoading}
            dataSource={records}
            renderItem={(item: UnifiedRecord) => {
              const isExpense = item.record_type === 'expense';
              const amountColor = isExpense ? '#ff4d4f' : '#52c41a';
              const amountPrefix = isExpense ? '-' : '+';

              return (
                <div className="expense-item">
                  <div className="expense-left">
                    <div className="expense-icon">
                      {iconMap[item.category_l1] || '📌'}
                    </div>
                    <div className="expense-info">
                      <div className="expense-category">
                        {listType === 'all' && (
                          <Tag
                            color={isExpense ? 'red' : 'green'}
                            style={{ marginRight: 4, fontSize: 11, lineHeight: '18px' }}
                          >
                            {isExpense ? '支出' : '收入'}
                          </Tag>
                        )}
                        {item.category_l1} · {item.category_l2}
                      </div>
                      <div className="expense-meta">
                        {formatDate(item.date)} {formatWeekday(item.date)}
                        {item.note && ` · ${item.note}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="expense-amount" style={{ color: amountColor }}>
                      {amountPrefix}¥{item.amount.toFixed(2)}
                    </span>
                    <Popconfirm
                      title="确定删除这条记录？"
                      onConfirm={() => handleDelete(item)}
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
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}

export default ExpenseList;
