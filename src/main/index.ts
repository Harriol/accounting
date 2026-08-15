/**
 * @author Harriol
 */
import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { monthPrefix, buildListQuery, buildRecordQuery } from './db/queries';

// ============ Database Setup ============
let db: Database.Database;

function initDatabase(): void {
  const userDataPath = app.getPath('userData');
  const dbPath = join(userDataPath, 'leo-accounting.db');
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables
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

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category_l1 ON expenses(category_l1);
  `);

  // Custom categories table (user-created categories)
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

  // Add category_type column for existing databases (expense/income distinction)
  try {
    db.exec('ALTER TABLE custom_categories ADD COLUMN category_type TEXT DEFAULT \'expense\'');
  } catch {
    // Column already exists, ignore
  }

  // Incomes table
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

// ============ IPC Handlers ============
function setupIPC(): void {
  // Add expense
  ipcMain.handle('expense:add', (_event, expense: {
    amount: number;
    category_l1: string;
    category_l2: string;
    date: string;
    note?: string;
  }) => {
    try {
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      const stmt = db.prepare(
        'INSERT INTO expenses (id, amount, category_l1, category_l2, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      stmt.run(id, expense.amount, expense.category_l1, expense.category_l2, expense.date, expense.note || '', createdAt);
      return { id, ...expense, note: expense.note || '', created_at: createdAt };
    } catch (err) {
      console.error('expense:add error:', err);
      throw new Error('Failed to add expense');
    }
  });

  // Get all expenses
  ipcMain.handle('expense:getAll', (_event, filters?: {
    startDate?: string;
    endDate?: string;
    category_l1?: string;
  }) => {
    try {
      const { query, params } = buildListQuery('expenses', filters);
      return db.prepare(query).all(...params);
    } catch (err) {
      console.error('expense:getAll error:', err);
      return [];
    }
  });

  // Get expense count for a specific month (unfiltered — for statistics)
  ipcMain.handle('expense:getMonthlyCount', (_event, year: number, month: number) => {
    try {
      const prefix = monthPrefix(year, month);
      const row = db.prepare(
        'SELECT COUNT(*) as count FROM expenses WHERE date LIKE ?',
      ).get(`${prefix}%`) as { count: number };
      return row.count;
    } catch (err) {
      console.error('expense:getMonthlyCount error:', err);
      return 0;
    }
  });

  // Delete expense
  ipcMain.handle('expense:delete', (_event, id: string) => {
    try {
      const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
      const result = stmt.run(id);
      return { success: result.changes > 0 };
    } catch (err) {
      console.error('expense:delete error:', err);
      return { success: false };
    }
  });

  // Update expense
  ipcMain.handle('expense:update', (_event, expense: {
    id: string;
    amount: number;
    category_l1: string;
    category_l2: string;
    date: string;
    note?: string;
  }) => {
    try {
      const stmt = db.prepare(
        'UPDATE expenses SET amount = ?, category_l1 = ?, category_l2 = ?, date = ?, note = ? WHERE id = ?',
      );
      const result = stmt.run(expense.amount, expense.category_l1, expense.category_l2, expense.date, expense.note || '', expense.id);
      return { success: result.changes > 0 };
    } catch (err) {
      console.error('expense:update error:', err);
      return { success: false };
    }
  });

  // Get monthly summary for statistics
  ipcMain.handle('expense:getMonthlySummary', (_event, year: number, month: number) => {
    try {
      const prefix = monthPrefix(year, month);
      const rows = db.prepare(`
        SELECT category_l1, SUM(amount) as total
        FROM expenses
        WHERE date LIKE ?
        GROUP BY category_l1
        ORDER BY total DESC
      `).all(`${prefix}%`);
      return rows;
    } catch (err) {
      console.error('expense:getMonthlySummary error:', err);
      return [];
    }
  });

  // Get monthly totals for trend chart
  ipcMain.handle('expense:getMonthlyTotals', (_event, months = 12) => {
    try {
      const rows = db.prepare(`
        SELECT substr(date, 1, 7) as month, SUM(amount) as total
        FROM expenses
        GROUP BY month
        ORDER BY month DESC
        LIMIT ?
      `).all(months);
      return rows;
    } catch (err) {
      console.error('expense:getMonthlyTotals error:', err);
      return [];
    }
  });

  // ============ Income IPC Handlers ============

  // Add income
  ipcMain.handle('income:add', (_event, income: {
    amount: number;
    category_l1: string;
    category_l2: string;
    date: string;
    note?: string;
  }) => {
    try {
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      const stmt = db.prepare(
        'INSERT INTO incomes (id, amount, category_l1, category_l2, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      stmt.run(id, income.amount, income.category_l1, income.category_l2, income.date, income.note || '', createdAt);
      return { id, ...income, note: income.note || '', created_at: createdAt };
    } catch (err) {
      console.error('income:add error:', err);
      throw new Error('Failed to add income');
    }
  });

  // Get all incomes
  ipcMain.handle('income:getAll', (_event, filters?: {
    startDate?: string;
    endDate?: string;
    category_l1?: string;
  }) => {
    try {
      const { query, params } = buildListQuery('incomes', filters);
      return db.prepare(query).all(...params);
    } catch (err) {
      console.error('income:getAll error:', err);
      return [];
    }
  });

  // Get income count for a specific month
  ipcMain.handle('income:getMonthlyCount', (_event, year: number, month: number) => {
    try {
      const prefix = monthPrefix(year, month);
      const row = db.prepare(
        'SELECT COUNT(*) as count FROM incomes WHERE date LIKE ?',
      ).get(`${prefix}%`) as { count: number };
      return row.count;
    } catch (err) {
      console.error('income:getMonthlyCount error:', err);
      return 0;
    }
  });

  // Delete income
  ipcMain.handle('income:delete', (_event, id: string) => {
    try {
      const stmt = db.prepare('DELETE FROM incomes WHERE id = ?');
      const result = stmt.run(id);
      return { success: result.changes > 0 };
    } catch (err) {
      console.error('income:delete error:', err);
      return { success: false };
    }
  });

  // Update income
  ipcMain.handle('income:update', (_event, income: {
    id: string;
    amount: number;
    category_l1: string;
    category_l2: string;
    date: string;
    note?: string;
  }) => {
    try {
      const stmt = db.prepare(
        'UPDATE incomes SET amount = ?, category_l1 = ?, category_l2 = ?, date = ?, note = ? WHERE id = ?',
      );
      const result = stmt.run(income.amount, income.category_l1, income.category_l2, income.date, income.note || '', income.id);
      return { success: result.changes > 0 };
    } catch (err) {
      console.error('income:update error:', err);
      return { success: false };
    }
  });

  // Get monthly income summary for statistics
  ipcMain.handle('income:getMonthlySummary', (_event, year: number, month: number) => {
    try {
      const prefix = monthPrefix(year, month);
      const rows = db.prepare(`
        SELECT category_l1, SUM(amount) as total
        FROM incomes
        WHERE date LIKE ?
        GROUP BY category_l1
        ORDER BY total DESC
      `).all(`${prefix}%`);
      return rows;
    } catch (err) {
      console.error('income:getMonthlySummary error:', err);
      return [];
    }
  });

  // Get monthly income totals for trend chart
  ipcMain.handle('income:getMonthlyTotals', (_event, months = 12) => {
    try {
      const rows = db.prepare(`
        SELECT substr(date, 1, 7) as month, SUM(amount) as total
        FROM incomes
        GROUP BY month
        ORDER BY month DESC
        LIMIT ?
      `).all(months);
      return rows;
    } catch (err) {
      console.error('income:getMonthlyTotals error:', err);
      return [];
    }
  });

  // ============ Unified Records ============

  // Get all records (expenses + incomes combined)
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

  // Get daily totals within a month (for daily comparison chart)
  ipcMain.handle('record:getDailyTotals', (_event, params: {
    type: 'expense' | 'income';
    year: number;
    month: number;
  }) => {
    try {
      const prefix = monthPrefix(params.year, params.month);
      const table = params.type === 'expense' ? 'expenses' : 'incomes';
      const rows = db.prepare(`
        SELECT date, SUM(amount) as total
        FROM ${table}
        WHERE date LIKE ?
        GROUP BY date
        ORDER BY date ASC
      `).all(`${prefix}%`);
      return rows;
    } catch (err) {
      console.error('record:getDailyTotals error:', err);
      return [];
    }
  });

  // ============ Category IPC Handlers ============

  // Get all custom categories (optionally filtered by category_type)
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

  // Add a custom category
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

      // Check for duplicate name under the same parent and type
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

  // Update a custom category (name and/or icon)
  ipcMain.handle('category:update', (_event, input: {
    id: string;
    label: string;
    icon: string;
  }) => {
    try {
      // Only allow updating non-preset categories
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

  // Delete a custom category
  ipcMain.handle('category:delete', (_event, id: string) => {
    try {
      const cat = db.prepare('SELECT * FROM custom_categories WHERE id = ?').get(id) as { is_preset: number; parent_value: string | null } | undefined;
      if (!cat) {
        return { success: false, error: '分类不存在' };
      }
      if (cat.is_preset === 1) {
        return { success: false, error: '预设分类不可删除' };
      }

      // If it's a L1 category, cascade delete all its L2 children
      if (cat.parent_value === null) {
        // Find the L1's value to identify its children
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

// ============ Window Creation ============
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

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ============ App Lifecycle ============
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
