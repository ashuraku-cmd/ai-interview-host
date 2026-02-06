import { useState, useRef, useEffect } from 'react'
import {
  Card,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  Progress,
  Empty,
  Spin,
  Badge,
  Tooltip,
  Divider,
  message,
} from 'antd'
import {
  AudioOutlined,
  AudioMutedOutlined,
  SendOutlined,
  MessageOutlined,
  SoundOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import { useInterviewStore, type Message } from '../store/interviewStore'
import { useOutlineStore } from '../store/outlineStore'
import { speak, stopSpeaking, hasAliyunConfig } from '../services/aliyunTTS'
import { aliyunASRService, useBrowserASR, hasASRConfig } from '../services/aliyunASR'

const { Title, Text } = Typography
const { TextArea } = Input

export default function InterviewChat() {
  const {
    currentSession,
    inputMode,
    isRecording,
    isPlaying,
    isLoading,
    setInputMode,
    setIsRecording,
    setIsPlaying,
    createSession,
    sendMessage,
  } = useInterviewStore()

  const { currentOutline } = useOutlineStore()
  const [inputText, setInputText] = useState('')
  const [recognizingText, setRecognizingText] = useState('')
  const [finalText, setFinalText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const browserASR = useBrowserASR(
    (text, isFinal) => {
      if (isFinal) {
        setFinalText((prev) => prev + text)
        setRecognizingText('')
      } else {
        setRecognizingText(text)
      }
    },
    (error) => {
      message.error('语音识别错误: ' + error)
      setIsRecording(false)
    }
  )

  // 自动滚动到底部，并在AI发送新消息时自动播放语音
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

    // 自动播放最后一条AI消息
    const lastMessage = currentSession?.messages[currentSession.messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && !isLoading) {
      // 延迟一点播放，让用户有时间看到消息
      const timer = setTimeout(() => {
        autoPlayMessage(lastMessage.content)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentSession?.messages, isLoading])

  // 自动播放消息
  const autoPlayMessage = async (content: string) => {
    try {
      setIsPlaying(true)
      await speak(content)
    } catch (error) {
      console.error('自动播放失败:', error)
    } finally {
      setIsPlaying(false)
    }
  }

  // 开始新访谈
  const handleStartInterview = async () => {
    if (!currentOutline) {
      message.warning('请先在大纲管理页面上传大纲')
      return
    }
    const sessionId = await createSession(currentOutline.id, currentOutline.title)
    if (sessionId) {
      message.success('访谈开始')
    } else {
      message.error('创建访谈失败')
    }
  }

  // 发送文字消息
  const handleSendText = async () => {
    if (!inputText.trim()) return
    await sendMessage(inputText.trim())
    setInputText('')
  }

  // 切换输入模式
  const toggleInputMode = () => {
    setInputMode(inputMode === 'voice' ? 'text' : 'voice')
  }

  // 开始/停止录音
  const toggleRecording = async () => {
    if (isRecording) {
      // 停止录音
      setIsRecording(false)
      
      // 根据当前使用的ASR服务停止录音
      if (hasASRConfig()) {
        // 使用阿里云ASR
        aliyunASRService.stopRecording()
        // 发送音频到ASR服务进行识别
        message.loading('正在识别...', 0)
        await aliyunASRService.sendToASR(
          (text) => {
            message.destroy()
            if (text.trim()) {
              sendMessage(text.trim())
            }
          },
          (error) => {
            message.destroy()
            message.error(error)
          }
        )
      } else if (browserASR.isSupported) {
        // 使用浏览器原生语音识别
        browserASR.stop()
        // 如果有识别结果，发送消息
        const textToSend = (finalText + recognizingText).trim()
        if (textToSend) {
          await sendMessage(textToSend)
          setRecognizingText('')
          setFinalText('')
        }
      }
    } else {
      // 开始录音
      setIsRecording(true)
      setRecognizingText('')
      
      // 优先使用阿里云ASR（准确率更高）
      if (hasASRConfig()) {
        try {
          setFinalText('')
          setRecognizingText('')
          message.info('开始录音，请说话...')
          await aliyunASRService.startRecording(
            (text) => {
              setRecognizingText(text)
              // 自动发送识别结果
              if (text.trim()) {
                sendMessage(text.trim())
                setIsRecording(false)
              }
            },
            (error) => {
              message.error(error)
              setIsRecording(false)
            }
          )
        } catch (error) {
          message.error('启动录音失败')
          setIsRecording(false)
        }
      } else if (browserASR.isSupported) {
        // 使用浏览器原生语音识别作为fallback
        try {
          setFinalText('')
          setRecognizingText('')
          browserASR.start()
          message.info('开始录音，请说话...（使用浏览器语音识别）')
        } catch (error) {
          message.error('启动录音失败')
          setIsRecording(false)
        }
      } else {
        message.warning('浏览器不支持语音识别，请先配置阿里云语音识别')
        setIsRecording(false)
      }
    }
  }

  // 播放/暂停语音
  const togglePlay = async () => {
    if (isPlaying) {
      stopSpeaking()
      setIsPlaying(false)
    } else {
      // 获取最后一条AI消息
      const lastMessage = currentSession?.messages
        .filter((m) => m.role === 'assistant')
        .pop()
      if (!lastMessage) {
        message.info('没有可播放的内容')
        return
      }

      setIsPlaying(true)
      try {
        if (hasAliyunConfig()) {
          message.info('正在使用阿里云语音合成...')
        } else {
          message.info('使用浏览器原生语音（可在语音配置页设置阿里云）')
        }
        await speak(lastMessage.content)
      } catch (error) {
        console.error('语音播放失败:', error)
        message.error('语音播放失败')
      } finally {
        setIsPlaying(false)
      }
    }
  }

  // 渲染消息气泡
  const renderMessage = (msg: Message, index: number) => {
    const isAssistant = msg.role === 'assistant'

    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          justifyContent: isAssistant ? 'flex-start' : 'flex-end',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            maxWidth: '70%',
            padding: '12px 16px',
            borderRadius: '12px',
            background: isAssistant ? '#f0f7ff' : '#2563eb',
            color: isAssistant ? '#1f2937' : '#fff',
            border: isAssistant ? '1px solid #dbeafe' : 'none',
          }}
        >
          {isAssistant && msg.type && (
            <Tag
              size="small"
              style={{
                marginBottom: '8px',
                fontSize: '11px',
              }}
            >
              {msg.type === 'question' && '问题'}
              {msg.type === 'follow_up' && '追问'}
              {msg.type === 'transition' && '过渡'}
              {msg.type === 'completed' && '结束'}
            </Tag>
          )}
          <Text
            style={{
              color: isAssistant ? '#1f2937' : '#fff',
              fontSize: '14px',
              lineHeight: '1.6',
              display: 'block',
            }}
          >
            {msg.content}
          </Text>
          <Text
            type="secondary"
            style={{
              fontSize: '11px',
              display: 'block',
              marginTop: '4px',
              color: isAssistant ? '#9ca3af' : 'rgba(255,255,255,0.7)',
            }}
          >
            {new Date(msg.timestamp).toLocaleTimeString()}
          </Text>
        </div>
      </div>
    )
  }

  // 如果没有当前会话，显示开始界面
  if (!currentSession) {
    return (
      <div>
        <Title level={2}>AI访谈</Title>
        <Text type="secondary">与AI主持人进行深度访谈</Text>

        <Card style={{ marginTop: '24px', textAlign: 'center', padding: '48px' }}>
          <Empty
            description={
              currentOutline
                ? '点击开始新访谈'
                : '请先在大纲管理页面上传大纲'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStartInterview}
              disabled={!currentOutline}
            >
              开始访谈
            </Button>
          </Empty>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* 头部信息 */}
      <div style={{ marginBottom: '16px' }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {currentSession.outlineTitle}
            </Title>
            <Badge
              status={currentSession.currentState === 'ongoing' ? 'processing' : 'success'}
              text={currentSession.currentState === 'ongoing' ? '进行中' : '已完成'}
            />
          </Space>
          <Space>
            <Tag icon={<MoreOutlined />}>
              模块 {currentSession.progress.currentModule}/{currentSession.progress.totalModules}
            </Tag>
            <Tag icon={<CheckCircleOutlined />}>
              问题 {currentSession.progress.currentQuestion}/{currentSession.progress.totalQuestions}
            </Tag>
          </Space>
        </Space>
        <Progress
          percent={Math.round(
            (currentSession.progress.currentQuestion /
              currentSession.progress.totalQuestions) *
              100
          )}
          size="small"
          style={{ marginTop: '8px' }}
        />
      </div>

      {/* 消息列表 */}
      <Card
        style={{
          flex: 1,
          overflow: 'auto',
          marginBottom: '16px',
        }}
        bodyStyle={{ padding: '16px' }}
      >
        {currentSession.messages.map((msg, index) => renderMessage(msg, index))}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <Spin size="small" />
            <Text type="secondary" style={{ marginLeft: '8px' }}>
              AI思考中...
            </Text>
          </div>
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* 输入区域 */}
      {currentSession.currentState === 'ongoing' && (
        <Card style={{ marginTop: 'auto' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 输入框 */}
            {inputMode === 'text' ? (
              <>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Button
                    icon={<AudioOutlined />}
                    onClick={toggleInputMode}
                    type="dashed"
                  >
                    切换为语音输入
                  </Button>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    按 Enter 发送，Shift + Enter 换行
                  </Text>
                </Space>
                <Space style={{ width: '100%' }}>
                  <TextArea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="请输入您的回答..."
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    style={{ flex: 1 }}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault()
                        handleSendText()
                      }
                    }}
                    disabled={isLoading}
                    autoFocus
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendText}
                    disabled={!inputText.trim() || isLoading}
                    size="large"
                  >
                    发送
                  </Button>
                </Space>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <Button
                    type={isRecording ? 'default' : 'primary'}
                    danger={isRecording}
                    size="large"
                    icon={isRecording ? <AudioMutedOutlined /> : <AudioOutlined />}
                    onClick={toggleRecording}
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      fontSize: '16px',
                    }}
                  >
                    {isRecording ? '停止录音' : '按住说话'}
                  </Button>
                  <Text
                    type="secondary"
                    style={{ display: 'block', marginTop: '16px' }}
                  >
                    {isRecording
                      ? (finalText || recognizingText)
                        ? `识别中: ${finalText}${recognizingText}`
                        : '正在录音... 点击停止'
                      : '点击开始语音输入'}
                  </Text>
                  {isRecording && recognizingText && (
                    <Text
                      type="warning"
                      style={{ display: 'block', marginTop: '8px', fontSize: '12px' }}
                    >
                      点击停止按钮发送识别结果
                    </Text>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Button
                    icon={<MessageOutlined />}
                    onClick={toggleInputMode}
                    type="link"
                  >
                    切换为打字输入
                  </Button>
                </div>
              </>
            )}
          </Space>
        </Card>
      )}

      {/* 访谈完成 */}
      {currentSession.currentState === 'completed' && (
        <Card style={{ textAlign: 'center', marginTop: 'auto' }}>
          <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
          <Title level={4} style={{ marginTop: '16px' }}>
            访谈已完成
          </Title>
          <Text type="secondary">感谢您的参与！</Text>
          <div style={{ marginTop: '16px' }}>
            <Button type="primary" onClick={handleStartInterview}>
              开始新访谈
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
