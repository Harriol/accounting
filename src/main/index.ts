import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

// ============ Database Setup ============
let db: Database.Database

function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'leo-accounting.db')
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')

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
  `)

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category_l1 ON expenses(category_l1);
  `)
}

// ============ IPC Handlers ============
function setupIPC(): void {
  // Add expense
  ipcMain.handle('expense:add', (_event, expense: {
    amount: number
    category_l1: string
    category_l2: string
    date: string
    note?: string
  }) => {
    try {
      const id = uuidv4()
      const createdAt = new Date().toISOString()
      const stmt = db.prepare(
        'INSERT INTO expenses (id, amount, category_l1, category_l2, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      stmt.run(id, expense.amount, expense.category_l1, expense.category_l2, expense.date, expense.note || '', createdAt)
      return { id, ...expense, note: expense.note || '', created_at: createdAt }
    } catch (err) {
      console.error('expense:add error:', err)
      throw new Error('Failed to add expense')
    }
  })

  // Get all expenses
  ipcMain.handle('expense:getAll', (_event, filters?: {
    startDate?: string
    endDate?: string
    category_l1?: string
  }) => {
    try {
      let query = 'SELECT * FROM expenses WHERE 1=1'
      const params: (string | number)[] = []

      if (filters?.startDate) {
        query += ' AND date >= ?'
        params.push(filters.startDate)
      }
      if (filters?.endDate) {
        query += ' AND date <= ?'
        params.push(filters.endDate)
      }
      if (filters?.category_l1) {
        query += ' AND category_l1 = ?'
        params.push(filters.category_l1)
      }

      query += ' ORDER BY date DESC, created_at DESC'
      return db.prepare(query).all(...params)
    } catch (err) {
      console.error('expense:getAll error:', err)
      return []
    }
  })

  // Get expense count for a specific month (unfiltered — for statistics)
  ipcMain.handle('expense:getMonthlyCount', (_event, year: number, month: number) => {
    try {
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      const row = db.prepare(
        'SELECT COUNT(*) as count FROM expenses WHERE date LIKE ?'
      ).get(`${prefix}%`) as { count: number }
      return row.count
    } catch (err) {
      console.error('expense:getMonthlyCount error:', err)
      return 0
    }
  })

  // Delete expense
  ipcMain.handle('expense:delete', (_event, id: string) => {
    try {
      const stmt = db.prepare('DELETE FROM expenses WHERE id = ?')
      const result = stmt.run(id)
      return { success: result.changes > 0 }
    } catch (err) {
      console.error('expense:delete error:', err)
      return { success: false }
    }
  })

  // Update expense
  ipcMain.handle('expense:update', (_event, expense: {
    id: string
    amount: number
    category_l1: string
    category_l2: string
    date: string
    note?: string
  }) => {
    try {
      const stmt = db.prepare(
        'UPDATE expenses SET amount = ?, category_l1 = ?, category_l2 = ?, date = ?, note = ? WHERE id = ?'
      )
      const result = stmt.run(expense.amount, expense.category_l1, expense.category_l2, expense.date, expense.note || '', expense.id)
      return { success: result.changes > 0 }
    } catch (err) {
      console.error('expense:update error:', err)
      return { success: false }
    }
  })

  // Get monthly summary for statistics
  ipcMain.handle('expense:getMonthlySummary', (_event, year: number, month: number) => {
    try {
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      const rows = db.prepare(`
        SELECT category_l1, SUM(amount) as total
        FROM expenses
        WHERE date LIKE ?
        GROUP BY category_l1
        ORDER BY total DESC
      `).all(`${prefix}%`)
      return rows
    } catch (err) {
      console.error('expense:getMonthlySummary error:', err)
      return []
    }
  })

  // Get monthly totals for trend chart
  ipcMain.handle('expense:getMonthlyTotals', (_event, months: number = 12) => {
    try {
      const rows = db.prepare(`
        SELECT substr(date, 1, 7) as month, SUM(amount) as total
        FROM expenses
        GROUP BY month
        ORDER BY month DESC
        LIMIT ?
      `).all(months)
      return rows
    } catch (err) {
      console.error('expense:getMonthlyTotals error:', err)
      return []
    }
  })
}

// ============ Window Creation ============
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '里奥记账',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ============ App Lifecycle ============
app.whenReady().then(() => {
  initDatabase()
  setupIPC()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (db) {
    db.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
