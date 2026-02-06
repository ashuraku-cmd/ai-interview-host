// 深度访谈分析报告 - 专业版
// 采用专业、简洁、高级感的设计风格

import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Typography,
  Empty,
  Spin,
  Alert,
  message,
  Tag,
  Divider,
  Space,
  Checkbox,
  Progress,
  Steps,
  Badge,
  Row,
  Col,
  Timeline,
  Statistic,
  Tooltip,
  Collapse,
  Avatar,
} from 'antd'
import {
  FileTextOutlined,
  DownloadOutlined,
  MessageOutlined,
  UserOutlined,
  BookOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  AimOutlined,
  PieChartOutlined,
  GlobalOutlined,
  ReadOutlined,
  FireOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import {
  MessageSquareQuote,
  Sparkles,
  TrendingUp,
  Users,
  Target,
  Layers,
  Lightbulb,
  BookOpen,
  Quote,
} from 'lucide-react'
import { useInterviewStore } from '../store/interviewStore'
import {
  analyzeMultipleInterviews,
  exportReportToMarkdown,
  type ThemeAnalysisResult,
  type ThemeDetail,
  type BreakdownPoint,
  type AnalysisProgress,
} from '../services/analysisService'

const { Title, Text, Paragraph } = Typography
const { Step } = Steps
const { Panel } = Collapse

// 配色方案 - 专业蓝灰色调
const COLORS = {
  primary: '#1a365d',      // 深海蓝
  secondary: '#2d3748',    // 石墨灰
  accent: '#3182ce',       // 科技蓝
  success: '#38a169',      // 翡翠绿
  warning: '#d69e2e',      // 琥珀金
  background: '#f7fafc',   // 浅灰背景
  card: '#ffffff',         // 纯白卡片
  text: '#2d3748',         // 主文字
  textSecondary: '#718096', // 次要文字
  border: '#e2e8f0',       // 边框
}

export default function ReportAnalysis() {
  const { sessionList } = useInterviewStore()
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])
  const [analysisResult, setAnalysisResult] = useState<ThemeAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const completedSessions = sessionList.filter((s) => s.messages.length > 1)

  const handleSelectSession = (sessionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSessions([...selectedSessions, sessionId])
    } else {
      setSelectedSessions(selectedSessions.filter(id => id !== sessionId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSessions(completedSessions.map(s => s.id))
    } else {
      setSelectedSessions([])
    }
  }

  const handleAnalyze = async () => {
    if (selectedSessions.length === 0) {
      message.warning('请至少选择一个访谈进行分析')
      return
    }

    setLoading(true)
    setError(null)
    setAnalysisResult(null)
    setProgress(null)
    setCurrentStep(0)

    const sessions = completedSessions.filter(s => selectedSessions.includes(s.id))

    try {
      const result = await analyzeMultipleInterviews(
        sessions,
        (progressUpdate) => {
          setProgress(progressUpdate)
          setCurrentStep(progressUpdate.currentStep)
        }
      )

      setAnalysisResult(result)
      setCurrentStep(4)
      message.success(`分析完成！共提炼 ${result.themeCount} 个关键主题`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '分析失败'
      setError(errorMsg)
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!analysisResult) return
    const sessionTitles = completedSessions
      .filter(s => selectedSessions.includes(s.id))
      .map(s => s.outlineTitle)
      .join('_')
    exportReportToMarkdown(analysisResult, sessionTitles)
    message.success('报告已导出')
  }

  if (completedSessions.length === 0) {
    return (
      <div className="report-analysis">
        <div className="page-header">
          <div className="header-content">
            <div className="header-icon">
              <BarChartOutlined />
            </div>
            <div className="header-text">
              <Title level={3} className="page-title">深度访谈分析</Title>
              <Text className="page-subtitle">基于多份访谈记录生成综合分析报告</Text>
            </div>
          </div>
        </div>
        <Card className="empty-state">
          <Empty description="暂无已完成的访谈记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      </div>
    )
  }

  return (
    <div className="report-analysis">
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">
            <BarChartOutlined />
          </div>
          <div className="header-text">
            <Title level={3} className="page-title">深度访谈分析</Title>
            <Text className="page-subtitle">基于多份访谈记录生成综合分析报告</Text>
          </div>
        </div>
      </div>

      {/* 访谈选择 */}
      {!analysisResult && !loading && (
        <Card className="selection-card" bordered={false}>
          <div className="card-header">
            <div className="card-title-wrapper">
              <TeamOutlined className="card-icon" />
              <span className="card-title">选择要分析的访谈</span>
            </div>
            <Checkbox
              checked={selectedSessions.length === completedSessions.length && completedSessions.length > 0}
              indeterminate={selectedSessions.length > 0 && selectedSessions.length < completedSessions.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="select-all"
            >
              全选 ({selectedSessions.length}/{completedSessions.length})
            </Checkbox>
          </div>

          <div className="sessions-list">
            {completedSessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${selectedSessions.includes(session.id) ? 'selected' : ''}`}
                onClick={() => handleSelectSession(session.id, !selectedSessions.includes(session.id))}
              >
                <Checkbox
                  checked={selectedSessions.includes(session.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    handleSelectSession(session.id, e.target.checked)
                  }}
                />
                <div className="session-content">
                  <div className="session-title-row">
                    <Text strong className="session-title">{session.outlineTitle}</Text>
                  </div>
                  <div className="session-meta">
                    <Tag className="meta-tag">
                      <ClockCircleOutlined /> {new Date(session.createdAt).toLocaleDateString()}
                    </Tag>
                    <Tag className="meta-tag">
                      <MessageOutlined /> {session.messages.length} 条对话
                    </Tag>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Divider className="section-divider" />

          <Button
            type="primary"
            size="large"
            icon={<Sparkles size={18} />}
            onClick={handleAnalyze}
            disabled={selectedSessions.length === 0}
            block
            className="analyze-btn"
          >
            开始分析 {selectedSessions.length > 0 && `(${selectedSessions.length} 份访谈)`}
          </Button>
        </Card>
      )}

      {/* 分析进度 */}
      {loading && (
        <Card className="progress-card" bordered={false}>
          <div className="progress-content">
            <Spin size="large" className="progress-spinner" />

            <Steps
              current={currentStep}
              direction="vertical"
              size="small"
              className="progress-steps"
            >
              <Step
                title="数据预处理"
                description="整合访谈记录..."
                icon={currentStep === 0 ? <Spin size="small" /> : currentStep > 0 ? <CheckCircleOutlined /> : undefined}
              />
              <Step
                title="深度分析"
                description={progress?.batchInfo && progress.batchInfo.totalBatches > 1
                  ? `分批处理中 (${progress.batchInfo.currentBatch}/${progress.batchInfo.totalBatches})`
                  : "提炼关键主题..."
                }
                icon={currentStep === 1 || currentStep === 2 ? <Spin size="small" /> : currentStep > 2 ? <CheckCircleOutlined /> : undefined}
              />
              <Step
                title="生成报告"
                description="整合分析结果..."
                icon={currentStep === 3 ? <Spin size="small" /> : currentStep > 3 ? <CheckCircleOutlined /> : undefined}
              />
            </Steps>

            {progress && (
              <div className="progress-detail">
                <Text type="secondary">{progress.message}</Text>
                <Progress
                  percent={progress.percent}
                  size="small"
                  status="active"
                  strokeColor={{ from: COLORS.accent, to: COLORS.success }}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert
          message="分析失败"
          description={error}
          type="error"
          showIcon
          className="error-alert"
          action={<Button size="small" onClick={() => setError(null)}>重试</Button>}
        />
      )}

      {/* 分析结果 */}
      {analysisResult && (
        <div className="results-container">
          {/* 结果头部 */}
          <Card className="results-header" bordered={false}>
            <div className="results-header-content">
              <div className="results-title-section">
                <Title level={4} className="results-title">
                  <FileTextOutlined /> 综合分析报告
                </Title>
                <Space className="results-tags">
                  <Tag color="blue" icon={<BulbOutlined />}>
                    {analysisResult.themeCount} 个主题
                  </Tag>
                  <Tag color="green" icon={<TeamOutlined />}>
                    {selectedSessions.length} 份访谈
                  </Tag>
                  {analysisResult.statistics?.batchCount && analysisResult.statistics.batchCount > 1 && (
                    <Tag color="orange" icon={<Layers size={14} />}>
                      {analysisResult.statistics.batchCount} 批处理
                    </Tag>
                  )}
                </Space>
              </div>
              <Space>
                <Button onClick={() => { setAnalysisResult(null); setSelectedSessions([]); setCurrentStep(0); }}>
                  重新选择
                </Button>
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                  导出报告
                </Button>
              </Space>
            </div>
          </Card>

          {/* 统计概览 */}
          <Row gutter={16} className="stats-row">
            <Col span={6}>
              <Card className="stat-card" bordered={false}>
                <Statistic
                  title="关键主题"
                  value={analysisResult.themeCount}
                  prefix={<Lightbulb size={20} />}
                  valueStyle={{ color: COLORS.accent }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card" bordered={false}>
                <Statistic
                  title="分析访谈"
                  value={selectedSessions.length}
                  prefix={<Users size={20} />}
                  valueStyle={{ color: COLORS.success }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card" bordered={false}>
                <Statistic
                  title="对话总数"
                  value={analysisResult.statistics?.totalMessages || 0}
                  prefix={<MessageOutlined />}
                  valueStyle={{ color: COLORS.warning }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card" bordered={false}>
                <Statistic
                  title="洞察深度"
                  value="高"
                  prefix={<Target size={20} />}
                  valueStyle={{ color: COLORS.primary }}
                />
              </Card>
            </Col>
          </Row>

          {/* 研究概述 */}
          <Card className="summary-card" bordered={false}>
            <div className="section-header">
              <BookOpen size={20} className="section-icon" />
              <Title level={5} className="section-title">研究概述</Title>
            </div>
            <Paragraph className="summary-text">{analysisResult.summary}</Paragraph>
          </Card>

          {/* 主题分析 */}
          <div className="themes-section">
            <div className="section-header">
              <Layers size={20} className="section-icon" />
              <Title level={5} className="section-title">主题深度分析</Title>
            </div>

            <Collapse
              defaultActiveKey={['0']}
              className="themes-collapse"
              expandIconPosition="end"
              bordered={false}
            >
              {analysisResult.themes.map((theme, index) => (
                <Panel
                  header={<ThemePanelHeader theme={theme} index={index} />}
                  key={index}
                  className="theme-panel"
                >
                  <ThemeDetailView theme={theme} />
                </Panel>
              ))}
            </Collapse>
          </div>
        </div>
      )}

      {/* 样式 */}
      <style>{`
        .report-analysis {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          background: ${COLORS.background};
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
        }

        .page-title {
          margin: 0 !important;
          color: ${COLORS.primary} !important;
          font-weight: 600;
        }

        .page-subtitle {
          color: ${COLORS.textSecondary};
          font-size: 14px;
        }

        .empty-state {
          padding: 64px 0;
          text-align: center;
        }

        .selection-card {
          background: ${COLORS.card};
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid ${COLORS.border};
        }

        .card-title-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-icon {
          color: ${COLORS.accent};
          font-size: 18px;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: ${COLORS.text};
        }

        .select-all {
          color: ${COLORS.textSecondary};
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .session-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          border: 2px solid ${COLORS.border};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .session-item:hover {
          border-color: ${COLORS.accent};
          background: rgba(49, 130, 206, 0.02);
        }

        .session-item.selected {
          border-color: ${COLORS.accent};
          background: rgba(49, 130, 206, 0.05);
        }

        .session-content {
          flex: 1;
        }

        .session-title-row {
          margin-bottom: 8px;
        }

        .session-title {
          font-size: 15px;
          color: ${COLORS.text};
        }

        .session-meta {
          display: flex;
          gap: 8px;
        }

        .meta-tag {
          background: ${COLORS.background};
          border: none;
          color: ${COLORS.textSecondary};
          font-size: 12px;
        }

        .section-divider {
          margin: 24px 0;
        }

        .analyze-btn {
          height: 48px;
          font-size: 15px;
          font-weight: 500;
          background: linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.primary} 100%);
          border: none;
        }

        .progress-card {
          padding: 48px;
          text-align: center;
          background: ${COLORS.card};
          border-radius: 12px;
        }

        .progress-content {
          max-width: 480px;
          margin: 0 auto;
        }

        .progress-spinner {
          margin-bottom: 32px;
        }

        .progress-steps {
          text-align: left;
          margin-bottom: 32px;
        }

        .progress-detail {
          margin-top: 24px;
        }

        .error-alert {
          margin-bottom: 16px;
          border-radius: 8px;
        }

        .results-container {
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .results-header {
          margin-bottom: 16px;
          background: ${COLORS.card};
          border-radius: 12px;
        }

        .results-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .results-title-section {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .results-title {
          margin: 0 !important;
          color: ${COLORS.primary} !important;
        }

        .stats-row {
          margin-bottom: 16px;
        }

        .stat-card {
          text-align: center;
          background: ${COLORS.card};
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .summary-card {
          margin-bottom: 16px;
          background: ${COLORS.card};
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .section-icon {
          color: ${COLORS.accent};
        }

        .section-title {
          margin: 0 !important;
          color: ${COLORS.text} !important;
          font-weight: 600;
        }

        .summary-text {
          font-size: 15px;
          line-height: 1.8;
          color: ${COLORS.text};
          margin: 0 !important;
        }

        .themes-section {
          margin-top: 24px;
        }

        .themes-collapse {
          background: transparent;
        }

        .theme-panel {
          margin-bottom: 12px;
          background: ${COLORS.card};
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .theme-panel .ant-collapse-header {
          padding: 20px 24px !important;
        }

        .theme-panel .ant-collapse-content {
          border-top: 1px solid ${COLORS.border};
        }
      `}</style>
    </div>
  )
}

// 主题面板头部
function ThemePanelHeader({ theme, index }: { theme: ThemeDetail; index: number }) {
  return (
    <div className="theme-header">
      <div className="theme-number">{index + 1}</div>
      <div className="theme-header-content">
        <Text strong className="theme-title-text">{theme.title}</Text>
        <div className="theme-tags">
          {theme.mentionCount && (
            <Tag className="mention-tag">
              <FireOutlined /> 提及 {theme.mentionCount} 次
            </Tag>
          )}
          {theme.demographics?.ageGroups && (
            <Tag className="demo-tag">
              <UserOutlined /> {theme.demographics.ageGroups.join(', ')}
            </Tag>
          )}
        </div>
      </div>
      <style>{`
        .theme-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .theme-number {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.primary} 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }
        .theme-header-content {
          flex: 1;
        }
        .theme-title-text {
          font-size: 16px;
          color: ${COLORS.text};
          display: block;
          margin-bottom: 6px;
        }
        .theme-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .mention-tag {
          background: rgba(214, 158, 46, 0.1);
          color: ${COLORS.warning};
          border: none;
          font-size: 12px;
        }
        .demo-tag {
          background: rgba(49, 130, 206, 0.1);
          color: ${COLORS.accent};
          border: none;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

// 主题详情
function ThemeDetailView({ theme }: { theme: ThemeDetail }) {
  return (
    <div className="theme-detail">
      {/* 核心结论 */}
      <div className="conclusion-section">
        <div className="subsection-header">
          <Lightbulb size={18} className="subsection-icon" />
          <Text strong className="subsection-title">核心结论</Text>
        </div>
        <Card className="conclusion-card" bordered={false}>
          <Paragraph className="conclusion-text">{theme.coreConclusion}</Paragraph>
        </Card>
      </div>

      {/* 结论拆解与证据 */}
      {theme.breakdown?.length > 0 && (
        <div className="breakdown-section">
          <div className="subsection-header">
            <Target size={18} className="subsection-icon" />
            <Text strong className="subsection-title">结论拆解与证据</Text>
          </div>
          <div className="breakdown-list">
            {theme.breakdown.map((item, idx) => (
              <BreakdownCard key={idx} item={item} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* 多维度分析 */}
      {theme.multiDimensionalAnalysis && (
        <div className="multidim-section">
          <div className="subsection-header">
            <PieChartOutlined className="subsection-icon" />
            <Text strong className="subsection-title">多维度分析</Text>
          </div>
          <MultiDimAnalysisView analysis={theme.multiDimensionalAnalysis} />
        </div>
      )}

      {/* 典型故事 */}
      {theme.story && (
        <div className="story-section">
          <div className="subsection-header">
            <BookOpen size={18} className="subsection-icon" />
            <Text strong className="subsection-title">典型故事</Text>
          </div>
          <Card className="story-card" bordered={false}>
            <Paragraph className="story-text">{theme.story}</Paragraph>
          </Card>
        </div>
      )}

      <style>{`
        .theme-detail {
          padding: 8px 0 16px;
        }

        .conclusion-section {
          margin-bottom: 24px;
        }

        .subsection-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .subsection-icon {
          color: ${COLORS.accent};
        }

        .subsection-title {
          font-size: 15px;
          color: ${COLORS.text};
        }

        .conclusion-card {
          background: linear-gradient(135deg, rgba(56, 161, 105, 0.05) 0%, rgba(56, 161, 105, 0.02) 100%);
          border-left: 3px solid ${COLORS.success};
        }

        .conclusion-text {
          font-size: 15px;
          line-height: 1.8;
          color: ${COLORS.text};
          margin: 0 !important;
        }

        .breakdown-section {
          margin-bottom: 24px;
        }

        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .multidim-section {
          margin-bottom: 24px;
        }

        .story-section {
          margin-bottom: 16px;
        }

        .story-card {
          background: linear-gradient(135deg, rgba(49, 130, 206, 0.05) 0%, rgba(49, 130, 206, 0.02) 100%);
          border-left: 3px solid ${COLORS.accent};
        }

        .story-text {
          font-size: 14px;
          line-height: 1.9;
          color: ${COLORS.text};
          margin: 0 !important;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  )
}

// 结论拆解卡片
function BreakdownCard({ item, index }: { item: BreakdownPoint; index: number }) {
  return (
    <Card className="breakdown-card" bordered={false}>
      <div className="breakdown-header">
        <Badge count={index + 1} className="breakdown-badge" />
        <div className="breakdown-title-section">
          <Text strong className="breakdown-point">{item.point}</Text>
          <Tag className="mention-count-tag">
            <FireOutlined /> 提及 {item.mentionCount} 次
          </Tag>
        </div>
      </div>

      <Paragraph className="breakdown-detail">{item.detail}</Paragraph>

      {item.evidence && (
        <div className="evidence-block">
          <Text type="secondary" className="evidence-label">
            <AimOutlined /> 证据摘要
          </Text>
          <Text className="evidence-text">{item.evidence}</Text>
        </div>
      )}

      {item.quotes?.length > 0 && (
        <div className="quotes-block">
          <Text type="secondary" className="quotes-label">
            <MessageOutlined /> 被访者原话
          </Text>
          <div className="quotes-list">
            {item.quotes.map((quote, idx) => (
              <div key={idx} className="quote-item">
                <div className="quote-text">"{quote.text}"</div>
                <div className="quote-meta">
                  <Avatar size="small" icon={<UserOutlined />} className="quote-avatar" />
                  <Text type="secondary" className="quote-speaker">{quote.speaker}</Text>
                  <Text type="secondary" className="quote-context">| {quote.context}</Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.demographics && (
        <div className="demographics-block">
          <Text type="secondary" className="demo-label">
            <TeamOutlined /> 提及人群
          </Text>
          <div className="demo-tags">
            {item.demographics.ageGroups?.map((age, i) => (
              <Tag key={i} className="demo-item">{age}</Tag>
            ))}
            {item.demographics.occupations?.map((occ, i) => (
              <Tag key={i} className="demo-item">{occ}</Tag>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .breakdown-card {
          background: ${COLORS.background};
          border-radius: 8px;
        }

        .breakdown-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .breakdown-badge .ant-badge-count {
          background: ${COLORS.accent};
          min-width: 24px;
          height: 24px;
          line-height: 24px;
          font-size: 12px;
          font-weight: 600;
        }

        .breakdown-title-section {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .breakdown-point {
          font-size: 15px;
          color: ${COLORS.text};
        }

        .mention-count-tag {
          background: rgba(214, 158, 46, 0.1);
          color: ${COLORS.warning};
          border: none;
          font-size: 12px;
        }

        .breakdown-detail {
          margin: 0 0 16px 36px !important;
          color: ${COLORS.textSecondary};
          line-height: 1.7;
          font-size: 14px;
        }

        .evidence-block {
          margin: 0 0 16px 36px;
          padding: 12px 16px;
          background: rgba(49, 130, 206, 0.05);
          border-radius: 6px;
          border-left: 2px solid ${COLORS.accent};
        }

        .evidence-label {
          display: block;
          font-size: 12px;
          margin-bottom: 4px;
          color: ${COLORS.accent};
        }

        .evidence-text {
          font-size: 13px;
          color: ${COLORS.text};
        }

        .quotes-block {
          margin: 0 0 16px 36px;
        }

        .quotes-label {
          display: block;
          font-size: 12px;
          margin-bottom: 8px;
          color: ${COLORS.success};
        }

        .quotes-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .quote-item {
          padding: 12px 16px;
          background: rgba(56, 161, 105, 0.05);
          border-radius: 6px;
          border-left: 2px solid ${COLORS.success};
        }

        .quote-text {
          font-style: italic;
          font-size: 14px;
          color: ${COLORS.text};
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .quote-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .quote-avatar {
          background: ${COLORS.accent};
        }

        .quote-speaker {
          font-size: 12px;
          font-weight: 500;
        }

        .quote-context {
          font-size: 12px;
        }

        .demographics-block {
          margin-left: 36px;
        }

        .demo-label {
          display: block;
          font-size: 12px;
          margin-bottom: 8px;
          color: ${COLORS.textSecondary};
        }

        .demo-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .demo-item {
          background: ${COLORS.background};
          border: 1px solid ${COLORS.border};
          color: ${COLORS.textSecondary};
          font-size: 12px;
        }
      `}</style>
    </Card>
  )
}

// 多维度分析视图
function MultiDimAnalysisView({ analysis }: { analysis: { overall: string; byDemographics: Array<{ group: string; view: string; insight: string }>; byMarket: string } }) {
  return (
    <div className="multidim-content">
      {/* 整体视角 */}
      <div className="dim-section">
        <div className="dim-header">
          <EyeOutlined className="dim-icon" />
          <Text strong className="dim-title">整体视角</Text>
        </div>
        <Paragraph className="dim-text">{analysis.overall}</Paragraph>
      </div>

      {/* 人群差异 */}
      {analysis.byDemographics?.length > 0 && (
        <div className="dim-section">
          <div className="dim-header">
            <TeamOutlined className="dim-icon" />
            <Text strong className="dim-title">人群差异</Text>
          </div>
          <div className="demographics-list">
            {analysis.byDemographics.map((demo, idx) => (
              <Card key={idx} className="demo-card" bordered={false} size="small">
                <div className="demo-header">
                  <Avatar size="small" icon={<UserOutlined />} className="demo-avatar" />
                  <Text strong className="demo-group">{demo.group}</Text>
                </div>
                <Paragraph className="demo-view">{demo.view}</Paragraph>
                <div className="demo-insight">
                  <BulbOutlined className="insight-icon" />
                  <Text type="secondary" className="insight-text">{demo.insight}</Text>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 市场洞察 */}
      {analysis.byMarket && (
        <div className="dim-section">
          <div className="dim-header">
            <GlobalOutlined className="dim-icon" />
            <Text strong className="dim-title">市场洞察</Text>
          </div>
          <Paragraph className="dim-text">{analysis.byMarket}</Paragraph>
        </div>
      )}

      <style>{`
        .multidim-content {
          background: ${COLORS.background};
          border-radius: 8px;
          padding: 16px;
        }

        .dim-section {
          margin-bottom: 20px;
        }

        .dim-section:last-child {
          margin-bottom: 0;
        }

        .dim-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .dim-icon {
          color: ${COLORS.accent};
          font-size: 14px;
        }

        .dim-title {
          font-size: 14px;
          color: ${COLORS.text};
        }

        .dim-text {
          margin: 0 !important;
          font-size: 14px;
          line-height: 1.7;
          color: ${COLORS.textSecondary};
          padding-left: 22px;
        }

        .demographics-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-left: 22px;
        }

        .demo-card {
          background: ${COLORS.card};
          border-radius: 6px;
        }

        .demo-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .demo-avatar {
          background: ${COLORS.accent};
        }

        .demo-group {
          font-size: 13px;
          color: ${COLORS.text};
        }

        .demo-view {
          margin: 0 0 8px 0 !important;
          font-size: 13px;
          color: ${COLORS.textSecondary};
          line-height: 1.6;
        }

        .demo-insight {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 8px;
          background: rgba(49, 130, 206, 0.05);
          border-radius: 4px;
        }

        .insight-icon {
          color: ${COLORS.accent};
          font-size: 12px;
          margin-top: 3px;
        }

        .insight-text {
          font-size: 12px;
          line-height: 1.5;
          flex: 1;
        }
      `}</style>
    </div>
  )
}
