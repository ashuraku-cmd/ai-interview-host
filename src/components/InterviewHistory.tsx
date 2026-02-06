import { useState, useEffect, useRef } from 'react'
import {
  Card,
  Typography,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  message,
  Tooltip,
  Empty,
  Spin,
  Badge,
  Descriptions,
  Divider,
  Upload,
  Radio,
} from 'antd'
import {
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  MessageOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { useInterviewStore, type InterviewSession, type Message } from '../store/interviewStore'
import mammoth from 'mammoth'
import dayjs from 'dayjs'

const { Title, Text } = Typography

// 添加表格行点击样式
const tableRowClassName = () => 'interview-table-row'

// 访谈记录详情弹窗
interface DetailModalProps {
  session: InterviewSession | null
  visible: boolean
  onClose: () => void
}

function DetailModal({ session, visible, onClose }: DetailModalProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // 自动滚动到底部
  useEffect(() => {
    if (visible && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [visible, session])
  
  if (!session) return null

  // 渲染消息气泡
  const renderMessage = (msg: Message, index: number) => {
    const isAssistant = msg.role === 'assistant'
    return (
      <div
        key={msg.id || index}
        style={{
          display: 'flex',
          justifyContent: isAssistant ? 'flex-start' : 'flex-end',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            maxWidth: '75%',
            padding: '12px 16px',
            borderRadius: '12px',
            background: isAssistant ? '#f0f7ff' : '#2563eb',
            color: isAssistant ? '#1f2937' : '#fff',
            border: isAssistant ? '1px solid #dbeafe' : 'none',
          }}
        >
          {/* 头部：角色和时间 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '6px',
            fontSize: '12px',
            color: isAssistant ? '#6b7280' : 'rgba(255,255,255,0.8)'
          }}>
            <span style={{ fontWeight: 600 }}>
              {isAssistant ? 'AI主持人' : (msg.speaker || '受访者')}
            </span>
            <span>·</span>
            <span>{dayjs(msg.timestamp).format('HH:mm:ss')}</span>
            {isAssistant && msg.type && (
              <Tag size="small" style={{ fontSize: '10px', marginLeft: '4px' }}>
                {msg.type === 'question' && '问题'}
                {msg.type === 'follow_up' && '追问'}
                {msg.type === 'transition' && '过渡'}
                {msg.type === 'completed' && '结束'}
              </Tag>
            )}
            {!isAssistant && msg.speaker && (
              <Tag size="small" color="blue" style={{ fontSize: '10px', marginLeft: '4px' }}>
                {msg.speaker}
              </Tag>
            )}
          </div>
          
          {/* 消息内容 */}
          <div style={{ 
            fontSize: '14px', 
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {msg.content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      width={900}
      style={{ top: 20 }}
      bodyStyle={{ padding: 0, height: 'calc(100vh - 140px)' }}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => exportSession(session)}
        >
          导出记录
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', height: '100%' }}>
        {/* 左侧：对话流 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 对话头部 */}
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Title level={5} style={{ margin: 0, flex: 1 }}>
                {session.outlineTitle}
              </Title>
              <Tag color={session.currentState === 'completed' ? 'success' : 'processing'}>
                {session.currentState === 'completed' ? '已完成' : '进行中'}
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              共 {session.messages.length} 条消息 · 
              创建于 {dayjs(session.createdAt).format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
          
          {/* 对话内容 */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '20px',
            background: '#f8fafc'
          }}>
            {session.messages.map((msg, index) => renderMessage(msg, index))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* 右侧：统计信息 */}
        <div style={{ 
          width: '240px', 
          borderLeft: '1px solid #f0f0f0',
          padding: '20px',
          background: '#fff',
          overflow: 'auto'
        }}>
          <Title level={5} style={{ marginBottom: '16px' }}>访谈信息</Title>
          
          <Descriptions column={1} size="small">
            <Descriptions.Item label="访谈ID">
              <Text code style={{ fontSize: '11px' }}>{session.id.slice(0, 16)}...</Text>
            </Descriptions.Item>
            <Descriptions.Item label="大纲">
              {session.outlineTitle}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Badge 
                status={session.currentState === 'completed' ? 'success' : 'processing'} 
                text={session.currentState === 'completed' ? '已完成' : '进行中'}
              />
            </Descriptions.Item>
            <Descriptions.Item label="消息数">
              {session.messages.length} 条
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(session.createdAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(session.updatedAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
          
          <Divider style={{ margin: '16px 0' }} />
          
          <Title level={5} style={{ marginBottom: '12px' }}>消息统计</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">AI提问</Text>
              <Text strong>
                {session.messages.filter(m => m.role === 'assistant').length} 条
              </Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">用户回答</Text>
              <Text strong>
                {session.messages.filter(m => m.role === 'user').length} 条
              </Text>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// 导出单个访谈记录
function exportSession(session: InterviewSession) {
  const content = {
    访谈ID: session.id,
    大纲: session.outlineTitle,
    状态: session.currentState === 'completed' ? '已完成' : '进行中',
    创建时间: dayjs(session.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    更新时间: dayjs(session.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
    消息记录: session.messages.map((msg) => ({
      时间: dayjs(msg.timestamp).format('YYYY-MM-DD HH:mm:ss'),
      角色: msg.role === 'assistant' ? 'AI主持人' : '受访者',
      类型: msg.type || '对话',
      内容: msg.content,
    })),
  }

  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `访谈记录_${session.id}_${dayjs().format('YYYYMMDD')}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  message.success('导出成功')
}

// 批量导出为CSV
function exportToCSV(sessions: InterviewSession[]) {
  const headers = ['访谈ID', '大纲', '状态', '消息数', '创建时间', '更新时间']
  const rows = sessions.map((s) => [
    s.id,
    s.outlineTitle,
    s.currentState === 'completed' ? '已完成' : '进行中',
    s.messages.length,
    dayjs(s.createdAt).format('YYYY-MM-DD HH:mm'),
    dayjs(s.updatedAt).format('YYYY-MM-DD HH:mm'),
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `访谈记录列表_${dayjs().format('YYYYMMDD')}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  message.success('导出CSV成功')
}

// 从Word文档文本解析访谈记录
function parseWordTranscript(text: string): { title: string; messages: Message[] } | null {
  const lines = text.split('\n').filter(line => line.trim())
  const messages: Message[] = []
  let title = '导入的访谈记录'
  
  // 尝试提取标题（第一行或包含"访谈"、"调研"等的行）
  for (const line of lines.slice(0, 5)) {
    if (line.includes('访谈') || line.includes('调研') || line.includes('大纲') || line.includes('FGD')) {
      title = line.trim()
      break
    }
  }
  
  // 解析对话模式
  // 支持格式：
  // M：xxx 或 M: xxx （主持人）
  // 1：xxx 或 1: xxx （被访者1）
  // 2：xxx 或 2: xxx （被访者2）
  // 主持人：xxx
  // 受访者：xxx
  // Q: xxx
  // A: xxx
  
  let currentRole: 'assistant' | 'user' | null = null
  let currentContent = ''
  let currentSpeaker = ''
  
  const saveMessage = () => {
    if (currentRole && currentContent.trim()) {
      messages.push({
        id: `msg_${messages.length}`,
        role: currentRole,
        content: currentContent.trim(),
        timestamp: new Date().toISOString(),
        type: currentRole === 'assistant' ? 'question' : undefined,
        speaker: currentRole === 'user' ? currentSpeaker : undefined,
      })
    }
    currentContent = ''
    currentSpeaker = ''
  }
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // 检测主持人（M开头）
    if (/^M[：:]\s*/i.test(trimmedLine)) {
      saveMessage()
      currentRole = 'assistant'
      currentSpeaker = '主持人'
      currentContent = trimmedLine.replace(/^M[：:]\s*/i, '')
    }
    // 检测被访者（数字开头：1、2、3、4等）
    else if (/^(\d+)[：:]\s*/.test(trimmedLine)) {
      saveMessage()
      currentRole = 'user'
      const match = trimmedLine.match(/^(\d+)[：:]\s*/)
      currentSpeaker = `被访者${match ? match[1] : ''}`
      currentContent = trimmedLine.replace(/^(\d+)[：:]\s*/, '')
    }
    // 检测主持人/提问者（中文）
    else if (/^(主持人|访问者| interviewer|Q|问|访|AI|系统)[：:]/i.test(trimmedLine)) {
      saveMessage()
      currentRole = 'assistant'
      currentSpeaker = '主持人'
      currentContent = trimmedLine.replace(/^(主持人|访问者| interviewer|Q|问|访|AI|系统)[：:]\s*/i, '')
    }
    // 检测受访者/回答者（中文）
    else if (/^(受访者|被访者| interviewee|A|答|用户)[：:]/i.test(trimmedLine)) {
      saveMessage()
      currentRole = 'user'
      currentSpeaker = '受访者'
      currentContent = trimmedLine.replace(/^(受访者|被访者| interviewee|A|答|用户)[：:]\s*/i, '')
    }
    // 继续当前消息
    else if (currentRole) {
      currentContent += '\n' + trimmedLine
    }
  }
  
  saveMessage()
  
  if (messages.length === 0) {
    // 如果没有识别出标准格式，尝试按段落分割
    let isQuestion = true
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine.length > 10) {
        messages.push({
          id: `msg_${messages.length}`,
          role: isQuestion ? 'assistant' : 'user',
          content: trimmedLine,
          timestamp: new Date().toISOString(),
          type: isQuestion ? 'question' : undefined,
        })
        isQuestion = !isQuestion
      }
    }
  }
  
  if (messages.length === 0) {
    return null
  }
  
  return { title, messages }
}

// 导入访谈记录（支持JSON和Word）
async function importSession(file: File): Promise<InterviewSession | null> {
  const fileName = file.name.toLowerCase()
  
  // 处理Word文档 (.docx 格式)
  if (fileName.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      const text = result.value
      
      const parsed = parseWordTranscript(text)
      if (!parsed) {
        message.error(`无法从文件 "${file.name}" 中识别访谈记录格式`)
        return null
      }
      
      const sessionId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const session: InterviewSession = {
        id: sessionId,
        outlineId: sessionId,
        outlineTitle: parsed.title || file.name.replace(/\.docx?$/i, ''),
        messages: parsed.messages,
        currentState: 'completed',
        progress: {
          currentModule: 1,
          totalModules: 1,
          currentQuestion: Math.ceil(parsed.messages.length / 2),
          totalQuestions: Math.ceil(parsed.messages.length / 2),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      return session
    } catch (error) {
      console.error('解析Word文档失败:', error)
      message.error(`文件 "${file.name}" 解析失败，请确保是有效的 .docx 格式`)
      return null
    }
  }
  
  // 不支持旧版 .doc 格式
  if (fileName.endsWith('.doc')) {
    message.error(`文件 "${file.name}" 是旧版 .doc 格式，请转换为 .docx 格式后再导入`)
    return null
  }
  
  // 处理JSON文件
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        
        // 验证数据格式
        if (!data.访谈ID || !data.大纲 || !data.消息记录) {
          message.error(`文件 "${file.name}" 格式不正确`)
          resolve(null)
          return
        }

        const session: InterviewSession = {
          id: data.访谈ID,
          outlineId: data.访谈ID,
          outlineTitle: data.大纲,
          messages: data.消息记录.map((msg: any, index: number) => ({
            id: `msg_${index}`,
            role: msg.角色 === 'AI主持人' ? 'assistant' : 'user',
            content: msg.内容,
            timestamp: msg.时间 || new Date().toISOString(),
            type: msg.类型 === '问题' ? 'question' : 
                  msg.类型 === '追问' ? 'follow_up' : 
                  msg.类型 === '过渡' ? 'transition' : 
                  msg.类型 === '结束' ? 'completed' : undefined,
          })),
          currentState: data.状态 === '已完成' ? 'completed' : 'ongoing',
          progress: {
            currentModule: 1,
            totalModules: 1,
            currentQuestion: 1,
            totalQuestions: 1,
          },
          createdAt: data.创建时间 || new Date().toISOString(),
          updatedAt: data.更新时间 || new Date().toISOString(),
        }

        resolve(session)
      } catch (error) {
        console.error('解析文件失败:', error)
        message.error(`文件 "${file.name}" 解析失败，请检查文件格式`)
        resolve(null)
      }
    }
    reader.readAsText(file)
  })
}

export default function InterviewHistory() {
  const { sessionList, loadSession, deleteSession, deleteSessions, setActiveTab } = useInterviewStore()
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 表格列定义
  const columns = [
    {
      title: '访谈ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
      render: (id: string) => (
        <Tooltip title={id}>
          <Text code>{id.slice(0, 8)}...</Text>
        </Tooltip>
      ),
    },
    {
      title: '大纲',
      dataIndex: 'outlineTitle',
      key: 'outlineTitle',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'currentState',
      key: 'currentState',
      width: 100,
      render: (state: string) => (
        <Badge
          status={state === 'completed' ? 'success' : 'processing'}
          text={state === 'completed' ? '已完成' : '进行中'}
        />
      ),
    },
    {
      title: '消息数',
      dataIndex: 'messages',
      key: 'messageCount',
      width: 80,
      render: (messages: Message[]) => messages.length,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: InterviewSession, b: InterviewSession) =>
        dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: InterviewSession) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleViewDetail(record)
              }}
            />
          </Tooltip>
          <Tooltip title="导出记录">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                exportSession(record)
              }}
            />
          </Tooltip>
          <Tooltip title="继续访谈">
            <Button
              type="text"
              icon={<MessageOutlined />}
              disabled={record.currentState === 'completed'}
              onClick={(e) => {
                e.stopPropagation()
                handleContinue(record)
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(record)
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    },
  }

  // 查看详情
  const handleViewDetail = (session: InterviewSession) => {
    setSelectedSession(session)
    setDetailVisible(true)
  }

  // 继续访谈
  const handleContinue = async (session: InterviewSession) => {
    setLoading(true)
    await loadSession(session.id)
    setLoading(false)
    // 自动切换到AI访谈页面
    setActiveTab('interview')
    message.success('已加载访谈，正在进入AI访谈页面...')
  }

  // 删除单条记录
  const handleDelete = (session: InterviewSession) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除访谈记录 "${session.outlineTitle}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        deleteSession(session.id)
        message.success('删除成功')
      },
    })
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的记录')
      return
    }
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条记录吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        deleteSessions(selectedRowKeys as string[])
        setSelectedRowKeys([])
        message.success('批量删除成功')
      },
    })
  }

  // 处理文件导入（支持多文件）
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setImportLoading(true)
    const importedSessions: InterviewSession[] = []
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const session = await importSession(file)
      
      if (session) {
        importedSessions.push(session)
        successCount++
      } else {
        failCount++
      }
    }

    setImportLoading(false)

    // 批量添加到store
    if (importedSessions.length > 0) {
      useInterviewStore.setState((state) => ({
        sessionList: [...importedSessions, ...state.sessionList]
      }))
    }

    // 显示导入结果
    if (successCount > 0 && failCount === 0) {
      message.success(`成功导入 ${successCount} 个访谈记录`)
    } else if (successCount > 0 && failCount > 0) {
      message.warning(`导入完成：${successCount} 个成功，${failCount} 个失败`)
    } else {
      message.error('导入失败，请检查文件格式')
    }

    // 清空input，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 统计信息
  const stats = {
    total: sessionList.length,
    completed: sessionList.filter((s) => s.currentState === 'completed').length,
    ongoing: sessionList.filter((s) => s.currentState === 'ongoing').length,
    totalMessages: sessionList.reduce((acc, s) => acc + s.messages.length, 0),
  }

  return (
    <div>
      <Title level={2}>访谈记录</Title>
      <Text type="secondary">查看历史访谈记录并导出</Text>

      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '24px', marginBottom: '24px' }}>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>
            {stats.total}
          </div>
          <Text type="secondary">总访谈数</Text>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>
            {stats.completed}
          </div>
          <Text type="secondary">已完成</Text>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <ClockCircleOutlined style={{ fontSize: '24px', color: '#faad14' }} />
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>
            {stats.ongoing}
          </div>
          <Text type="secondary">进行中</Text>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <MessageOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>
            {stats.totalMessages}
          </div>
          <Text type="secondary">总消息数</Text>
        </Card>
      </div>

      {/* 操作栏 */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Text>共 {sessionList.length} 条记录</Text>
          {selectedRowKeys.length > 0 && (
            <Text type="secondary">已选择 {selectedRowKeys.length} 条</Text>
          )}
        </Space>
        <Space>
          <input
            type="file"
            accept=".json,.docx"
            multiple
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button
            icon={<UploadOutlined />}
            loading={importLoading}
            onClick={() => fileInputRef.current?.click()}
          >
            导入记录 (JSON/Word)
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchDelete}
          >
            批量删除
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            disabled={sessionList.length === 0}
            onClick={() => exportToCSV(sessionList)}
          >
            批量导出CSV
          </Button>
        </Space>
      </div>

      {/* 记录表格 */}
      <Card>
        {sessionList.length === 0 ? (
          <Empty
            description="暂无访谈记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={sessionList}
            rowKey="id"
            loading={loading}
            rowSelection={rowSelection}
            onRow={(record) => ({
              onClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        )}
      </Card>

      {/* 详情弹窗 */}
      <DetailModal
        session={selectedSession}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
      />
    </div>
  )
}
