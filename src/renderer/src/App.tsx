/**
 * @author Harriol
 */
import { useEffect } from 'react';
import { Layout, Menu } from 'antd';
import {
  PlusOutlined,
  UnorderedListOutlined,
  PieChartOutlined,
  AppstoreOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import RecordExpense from './pages/RecordExpense';
import ExpenseList from './pages/ExpenseList';
import Statistics from './pages/Statistics';
import CategoryManagement from './pages/CategoryManagement';
import SnakeGame from './pages/SnakeGame';
import { useStore, PageKey } from './store/useStore';

const { Sider, Content } = Layout;

const menuItems = [
  { key: 'record', icon: <PlusOutlined />, label: '记一笔' },
  { key: 'list', icon: <UnorderedListOutlined />, label: '账本' },
  { key: 'statistics', icon: <PieChartOutlined />, label: '统计' },
  { key: 'categories', icon: <AppstoreOutlined />, label: '分类' },
  { key: 'snake', icon: <RocketOutlined />, label: '贪吃蛇' },
];

function App(): JSX.Element {
  const currentPage = useStore((s) => s.currentPage);
  const navigateTo = useStore((s) => s.navigateTo);
  const fetchExpenses = useStore((s) => s.fetchExpenses);
  const fetchRecords = useStore((s) => s.fetchRecords);
  const fetchCategories = useStore((s) => s.fetchCategories);

  useEffect(() => {
    fetchExpenses();
    fetchRecords();
    fetchCategories();
    // zustand action 引用稳定，仅在挂载时初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPage = (): JSX.Element => {
    switch (currentPage) {
      case 'record':
        return <RecordExpense />;
      case 'list':
        return <ExpenseList />;
      case 'statistics':
        return <Statistics />;
      case 'categories':
        return <CategoryManagement />;
      case 'snake':
        return <SnakeGame />;
      default:
        return <RecordExpense />;
    }
  };

  return (
    <Layout style={{ height: '100vh', flexDirection: 'row' }}>
      {/* Desktop Sidebar */}
      <Sider
        width={200}
        style={{
          background: '#fff',
          borderRight: '1px solid #e8e8e8',
        }}
        breakpoint="md"
        collapsedWidth="0"
        trigger={null}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: '#1677ff', letterSpacing: 2 }}>
            🦁 里奥记账
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          onClick={({ key }) => navigateTo(key as PageKey)}
          items={menuItems}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      {/* Mobile bottom navigation */}
      <div className="mobile-bottom-nav">
        {menuItems.map((item) => (
          <div
            key={item.key}
            onClick={() => navigateTo(item.key as PageKey)}
            className={`mobile-nav-item ${currentPage === item.key ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <Layout style={{ background: '#f5f5f5' }}>
        <Content
          style={{
            padding: 24,
            overflow: 'auto',
            height: '100vh',
            paddingBottom: 80,
          }}
        >
          {renderPage()}
        </Content>
      </Layout>

      {/* Mobile responsive styles */}
      <style>{`
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: #fff;
          border-top: 1px solid #e8e8e8;
          z-index: 1000;
          justify-content: space-around;
          align-items: center;
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          padding: 4px 16px;
          color: #999;
          transition: color 0.2s;
        }
        .mobile-nav-item.active {
          color: #1677ff;
        }
        .mobile-nav-icon {
          font-size: 20px;
        }
        .mobile-nav-label {
          font-size: 11px;
          margin-top: 2px;
        }
        @media (max-width: 768px) {
          .ant-layout-sider {
            display: none !important;
          }
          .mobile-bottom-nav {
            display: flex !important;
          }
        }
      `}
      </style>
    </Layout>
  );
}

export default App;
