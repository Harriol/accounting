# 🦁 里奥记账

> 轻量、易用的跨平台个人记账桌面应用 — 数据 100% 本地存储，隐私无忧

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/electron-31.x-47848f)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/react-18.x-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.5-3178c6)](https://www.typescriptlang.org/)
[![Ant Design](https://img.shields.io/badge/antd-5.x-0170fe)](https://ant.design/)

---

## 📸 界面预览

| 记一笔 | 账本 | 统计 | 分类管理 |
|:---:|:---:|:---:|:---:|
| 收入 / 支出统一记账 | 合并列表 + 多维筛选 | 饼图 · 排行 · 趋势 · 日对比 | 预设 + 自定义分类 |

---

## ✨ 功能特性

### 记账
- 💸 **支出记录** — 10 大类 44 小类，覆盖日常消费场景
- 💰 **收入记录** — 6 大类 24 小类，管理各类收入来源
- 📝 支持金额、分类、日期、备注
- 🎨 统一页面 + 模式切换，支出一键切换收入

### 账本
- 📋 **支出收入合并列表**，按时间倒序排列
- 🔍 **多维筛选** — 全部 / 支出 / 收入 + 一级分类 + 年/月/日 时间粒度
- 🏷️ 红绿标识区分收支类型
- 🗑️ 支持删除记录

### 统计
- 📈 **分类构成饼图** — 每月各分类占比一目了然
- 📊 **每日对比柱状图** — 当月每天支出/收入变化
- 🏆 **分类排行** — 按金额倒序，前三名高亮
- 📉 **近 12 个月趋势图** — 收支走向清晰可见

### 分类管理
- 🔒 **预设分类**不可修改（支出 10 大类 + 收入 6 大类）
- ✏️ **自定义分类** — 支持新增、编辑、删除
- 😀 **Emoji 图标选择器**（80+ 图标）
- 📂 两级分类体系，支持在任意大类的任意大类下添加小类

### 隐私与安全
- 🔐 **数据 100% 本地存储**（SQLite），无需联网
- 🚫 不采集任何用户数据，不连接远程服务器

---

## 🛠 技术栈

| 技术 | 说明 |
|------|------|
| [Electron](https://www.electronjs.org/) 31 | 跨平台桌面框架 |
| [React](https://react.dev/) 18 + [TypeScript](https://www.typescriptlang.org/) 5.5 | 前端框架 |
| [electron-vite](https://electron-vite.org/) | 构建工具（Vite 驱动，毫秒级 HMR） |
| [Ant Design](https://ant.design/) 5 | UI 组件库 |
| [@ant-design/charts](https://charts.ant.design/) | 数据可视化（基于 G2 v5） |
| [Zustand](https://github.com/pmndrs/zustand) | 轻量状态管理（< 2KB） |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 本地 SQLite 数据库 |
| [dayjs](https://day.js.org/) | 日期处理 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **Windows 10/11** 或 **macOS 12+**

### 安装与运行

```bash
# 1. 克隆项目
git clone <repo-url>
cd 里奥记账APP

# 2. 安装依赖（首次安装会自动 rebuild better-sqlite3）
npm install

# 3. 启动开发模式
npm run dev
```

### 打包发布

```bash
# Windows
npm run package:win

# macOS
npm run package:mac

# 全平台
npm run package:all
```

打包产物在 `release/` 目录下。

---

## 📁 项目结构

```
里奥记账APP/
├── src/
│   ├── main/              # Electron 主进程
│   │   └── index.ts       # 数据库初始化 + IPC handlers
│   ├── preload/           # 预加载脚本（contextBridge）
│   │   └── index.ts       # 类型定义 + API 桥接
│   └── renderer/          # 渲染进程（前端）
│       └── src/
│           ├── App.tsx              # 根布局 + 侧边栏导航
│           ├── store/
│           │   └── useStore.ts      # Zustand 状态管理
│           ├── data/
│           │   ├── categories.ts        # 支出预设分类
│           │   └── incomeCategories.ts  # 收入预设分类
│           ├── pages/
│           │   ├── RecordExpense.tsx       # 记一笔
│           │   ├── ExpenseList.tsx        # 账本
│           │   ├── Statistics.tsx         # 统计
│           │   └── CategoryManagement.tsx # 分类管理
│           └── styles/
│               └── global.css
├── CLAUDE.md             # AI 开发规范文档
├── package.json
├── tsconfig.json
└── electron-builder.yml  # 打包配置
```

---

## 🏗 架构说明

### 数据流

```
用户操作 (React 组件)
  → Zustand Store (状态 + 动作)
    → Preload API (contextBridge)
      → IPC (ipcMain.handle)
        → better-sqlite3 (SQLite)
          → 返回数据 → 更新 Store → 组件重渲染
```

### 数据库

- **expenses** — 支出记录表
- **incomes** — 收入记录表
- **custom_categories** — 用户自定义分类（通过 `category_type` 字段区分支出/收入）

所有数据存储在用户数据目录：
- Windows: `%APPDATA%/leo-accounting/leo-accounting.db`
- macOS: `~/Library/Application Support/leo-accounting/leo-accounting.db`

---

## 📝 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（HMR 热更新） |
| `npm run build` | 编译构建 |
| `npm run preview` | 预览构建产物 |
| `npm run package:win` | 打包 Windows 安装包 |
| `npm run package:mac` | 打包 macOS 安装包 |
| `npm run package:all` | 打包全平台安装包 |

---

## 📄 License

MIT © 里奥记账
