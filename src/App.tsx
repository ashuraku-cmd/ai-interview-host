import { Layout, Tabs, ConfigProvider, theme } from 'antd'
import {
  FileTextOutlined,
  MessageOutlined,
  HistoryOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import OutlineManager from './components/OutlineManager'
import InterviewChat from './components/InterviewChat'
import InterviewHistory from './components/InterviewHistory'
import ReportAnalysis from './components/ReportAnalysis'
import AliyunConfig from './components/AliyunConfig'
import { useInterviewStore } from './store/interviewStore'
import './App.css'

const { Sider, Content } = Layout

// Tab配置
const tabs = [
  {
    key: 'outline',
    label: '大纲管理',
    icon: <FileTextOutlined />,
    component: OutlineManager,
  },
  {
    key: 'interview',
    label: 'AI访谈',
    icon: <MessageOutlined />,
    component: InterviewChat,
  },
  {
    key: 'history',
    label: '访谈记录',
    icon: <HistoryOutlined />,
    component: InterviewHistory,
  },
  {
    key: 'report',
    label: '报告分析',
    icon: <BarChartOutlined />,
    component: ReportAnalysis,
  },
  {
    key: 'settings',
    label: '语音配置',
    icon: <SettingOutlined />,
    component: AliyunConfig,
  },
]

function App() {
  const { activeTab, setActiveTab } = useInterviewStore()

  // 获取当前组件
  const ActiveComponent = tabs.find(tab => tab.key === activeTab)?.component || OutlineManager

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* 左侧导航 */}
        <Sider
          width={200}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
          }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2563eb' }}>
              AI 访谈主持人
            </h1>
          </div>
          <Tabs
            tabPosition="left"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabs.map(tab => ({
              key: tab.key,
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {tab.icon}
                  {tab.label}
                </span>
              ),
            }))}
            style={{ height: 'calc(100% - 60px)' }}
          />
        </Sider>

        {/* 主内容区 */}
        <Layout>
          <Content style={{ padding: '24px', background: '#f5f5f5' }}>
            <ActiveComponent />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

export default App
