/**
 * @author Harriol
 */
import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { monthPrefix, buildListQuery, buildRecordQuery } from './db/queries';

// ============ 数据库初始化 ============
let db: Database.Database;

function initDatabase(): void {
  const userDataPath = app.getPath('userData');
  const dbPath = join(userDataPath, 'leo-accounting.db');
  db = new Database(dbPath);

  // 开启 WAL 模式，提升并发读写性能
  db.pragma('journal_mode = WAL');

  // 支出表
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      category_l1 TEXT NOT NULL,
      category_l2 TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 支出表索引（按日期 / 分类查询）
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category_l1 ON expenses(category_l1);
  `);

  // 自定义分类表（用户自建分类）
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      value TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '📌',
      parent_value TEXT,
      is_preset INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_custom_categories_parent ON custom_categories(parent_value);
  `);

  // 为旧数据库补充 category_type 列（区分支出/收入）
  try {
    db.exec('ALTER TABLE custom_categories ADD COLUMN category_type TEXT DEFAULT \'expense\'');
  } catch {
    // 列已存在则忽略
  }

  // 收入表（结构与支出表一致）
  db.exec(`
    CREATE TABLE IF NOT EXISTS incomes (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      category_l1 TEXT NOT NULL,
      category_l2 TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
    CREATE INDEX IF NOT EXISTS idx_incomes_category_l1 ON incomes(category_l1);
  `);
}

// ============ IPC 处理器 ============

// 单条记录的新增 / 更新入参（支出 / 收入共用）
interface RecordInput {
  amount: number;
  category_l1: string;
  category_l2: string;
  date: string;
  note?: string;
}

// 为支出 / 收入表注册结构完全一致的一组 CRUD + 统计 handler，消除重复代码
function registerRecordHandlers(prefix: 'expense' | 'income', table: 'expenses' | 'incomes'): void {
  // 新增记录
  ipcMain.handle(`${prefix}:add`, (_event, input: RecordInput) => {
    try {
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      const stmt = db.prepare(
        `INSERT INTO ${table} (id, amount, category_l1, category_l2, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      stmt.run(id, input.amount, input.category_l1, input.category_l2, input.date, input.note || '', createdAt);
      return { id, ...input, note: input.note || '', created_at: createdAt };
    } catch (err) {
      console.error(`${prefix}:add error:`, err);
      throw new Error(`Failed to add ${prefix}`);
    }
  });

  // 查询全部（按日期 / 分类筛选）
  ipcMain.handle(`${prefix}:getAll`, (_event, filters?: {
    startDate?: string;
    endDate?: string;
    category_l1?: string;
  }) => {
    try {
      const { query, params } = buildListQuery(table, filters);
      return db.prepare(query).all(...params);
    } catch (err) {
      console.error(`${prefix}:getAll error:`, err);
      return [];
    }
  });

  // 当月笔数（统计用，忽略筛选）
  ipcMain.handle(`${prefix}:getMonthlyCount`, (_event, year: number, month: number) => {
    try {
      const prefixStr = monthPrefix(year, month);
      const row = db.prepare(
        `SELECT COUNT(*) as count FROM ${table} WHERE date LIKE ?`,
      ).get(`${prefixStr}%`) as { count: number };
      return row.count;
    } catch (err) {
      console.error(`${prefix}:getMonthlyCount error:`, err);
      return 0;
    }
  });

  // 删除记录
  ipcMain.handle(`${prefix}:delete`, (_event, id: string) => {
    try {
      const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      return { success: result.changes > 0 };
    } catch (err) {
      console.error(`${prefix}:delete error:`, err);
      return { success: false };
    }
  });

  // 更新记录
  ipcMain.handle(`${prefix}:update`, (_event, input: RecordInput & { id: string }) => {
    try {
      const stmt = db.prepare(
        `UPDATE ${table} SET amount = ?, category_l1 = ?, category_l2 = ?, date = ?, note = ? WHERE id = ?`,
      );
      const result = stmt.run(input.amount, input.category_l1, input.category_l2, input.date, input.note || '', input.id);
      return { success: result.changes > 0 };
    } catch (err) {
      console.error(`${prefix}:update error:`, err);
      return { success: false };
    }
  });

  // 当月分类汇总（统计饼图）
  ipcMain.handle(`${prefix}:getMonthlySummary`, (_event, year: number, month: number) => {
    try {
      const prefixStr = monthPrefix(year, month);
      return db.prepare(`
        SELECT category_l1, SUM(amount) as total
        FROM ${table}
        WHERE date LIKE ?
        GROUP BY category_l1
        ORDER BY total DESC
      `).all(`${prefixStr}%`);
    } catch (err) {
      console.error(`${prefix}:getMonthlySummary error:`, err);
      return [];
    }
  });

  // 近 N 月月度趋势（趋势图）
  ipcMain.handle(`${prefix}:getMonthlyTotals`, (_event, months = 12) => {
    try {
      return db.prepare(`
        SELECT substr(date, 1, 7) as month, SUM(amount) as total
        FROM ${table}
        GROUP BY month
        ORDER BY month DESC
        LIMIT ?
      `).all(months);
    } catch (err) {
      console.error(`${prefix}:getMonthlyTotals error:`, err);
      return [];
    }
  });
}

function setupIPC(): void {
  // 支出与收入表结构一致，复用同一组 handler
  registerRecordHandlers('expense', 'expenses');
  registerRecordHandlers('income', 'incomes');

  // ============ 统一账本（支出 + 收入合并） ============

  // 查询所有记录（支出 + 收入合并，按类型 / 分类 / 日期筛选）
  ipcMain.handle('record:getAll', (_event, filters?: {
    type?: 'expense' | 'income';
    category_l1?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const { query, params } = buildRecordQuery(filters);
      return db.prepare(query).all(...params);
    } catch (err) {
      console.error('record:getAll error:', err);
      return [];
    }
  });

  // 当月每日汇总（每日对比图）
  ipcMain.handle('record:getDailyTotals', (_event, params: {
    type: 'expense' | 'income';
    year: number;
    month: number;
  }) => {
    try {
      const prefixStr = monthPrefix(params.year, params.month);
      // 表名仅由 type 的固定两值决定，无注入风险
      const table = params.type === 'expense' ? 'expenses' : 'incomes';
      const rows = db.prepare(`
        SELECT date, SUM(amount) as total
        FROM ${table}
        WHERE date LIKE ?
        GROUP BY date
        ORDER BY date ASC
      `).all(`${prefixStr}%`);
      return rows;
    } catch (err) {
      console.error('record:getDailyTotals error:', err);
      return [];
    }
  });

  // ============ 分类处理器 ============

  // 查询所有自定义分类（可选按 category_type 过滤）
  ipcMain.handle('category:getAll', (_event, categoryType?: string) => {
    try {
      if (categoryType) {
        return db.prepare(
          'SELECT * FROM custom_categories WHERE category_type = ? ORDER BY sort_order, created_at',
        ).all(categoryType);
      }
      return db.prepare(
        'SELECT * FROM custom_categories ORDER BY sort_order, created_at',
      ).all();
    } catch (err) {
      console.error('category:getAll error:', err);
      return [];
    }
  });

  // 新增自定义分类
  ipcMain.handle('category:add', (_event, input: {
    label: string;
    icon: string;
    parent_value: string | null;
    category_type?: string;
  }) => {
    try {
      const id = uuidv4();
      const value = `custom_${id.substring(0, 8)}`;
      const categoryType = input.category_type || 'expense';

      // 同一父级 + 同一类型下查重
      const existing = db.prepare(
        'SELECT id FROM custom_categories WHERE label = ? AND parent_value IS ? AND category_type = ?',
      ).get(input.label, input.parent_value, categoryType);
      if (existing) {
        return { success: false, error: '同名分类已存在' };
      }

      const stmt = db.prepare(
        'INSERT INTO custom_categories (id, label, value, icon, parent_value, category_type) VALUES (?, ?, ?, ?, ?, ?)',
      );
      stmt.run(id, input.label, value, input.icon, input.parent_value, categoryType);

      const created = db.prepare('SELECT * FROM custom_categories WHERE id = ?').get(id);
      return { success: true, data: created };
    } catch (err) {
      console.error('category:add error:', err);
      return { success: false, error: '添加分类失败' };
    }
  });

  // 更新自定义分类（名称 / 图标）
  ipcMain.handle('category:update', (_event, input: {
    id: string;
    label: string;
    icon: string;
  }) => {
    try {
      // 预设分类不可修改
      const cat = db.prepare('SELECT * FROM custom_categories WHERE id = ?').get(input.id) as { is_preset: number } | undefined;
      if (!cat) {
        return { success: false, error: '分类不存在' };
      }
      if (cat.is_preset === 1) {
        return { success: false, error: '预设分类不可修改' };
      }

      const stmt = db.prepare('UPDATE custom_categories SET label = ?, icon = ? WHERE id = ?');
      const result = stmt.run(input.label, input.icon, input.id);
      return { success: result.changes > 0 };
    } catch (err) {
      console.error('category:update error:', err);
      return { success: false };
    }
  });

  // 删除自定义分类
  ipcMain.handle('category:delete', (_event, id: string) => {
    try {
      const cat = db.prepare('SELECT * FROM custom_categories WHERE id = ?').get(id) as { is_preset: number; parent_value: string | null } | undefined;
      if (!cat) {
        return { success: false, error: '分类不存在' };
      }
      if (cat.is_preset === 1) {
        return { success: false, error: '预设分类不可删除' };
      }

      // 一级分类级联删除其下所有二级子分类
      if (cat.parent_value === null) {
        const l1Cat = db.prepare('SELECT value FROM custom_categories WHERE id = ?').get(id) as { value: string };
        db.prepare('DELETE FROM custom_categories WHERE parent_value = ?').run(l1Cat.value);
      }

      const result = db.prepare('DELETE FROM custom_categories WHERE id = ?').run(id);
      return { success: result.changes > 0 };
    } catch (err) {
      console.error('category:delete error:', err);
      return { success: false };
    }
  });
}

// ============ 窗口创建 ============
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '里奥记账',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 外部链接交由系统默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 开发模式加载 dev server，生产模式加载本地文件
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ============ 应用生命周期 ============
app.whenReady().then(() => {
  initDatabase();
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
