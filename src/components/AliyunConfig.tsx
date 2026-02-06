import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  message,
  Typography,
  Space,
  Alert,
  Slider,
  Divider,
  Tabs,
} from 'antd'
import { SaveOutlined, CheckCircleOutlined, InfoCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import {
  saveAliyunConfig,
  getAliyunTTSConfig,
  hasAliyunConfig,
  VOICE_OPTIONS,
  speak,
} from '../services/aliyunTTS'
import { ALIYUN_CONFIG } from '../services/aliyunConfig'
import { getStoredApiKey, saveApiKey } from '../services/qwenService'

const { Title, Text } = Typography

interface ConfigForm {
  accessKeyId: string
  accessKeySecret: string
  appKey: string
  region: string
  voice: string
  speechRate: number
}

interface QwenConfigForm {
  apiKey: string
}

export default function AliyunConfig() {
  const [form] = Form.useForm<ConfigForm>()
  const [qwenForm] = Form.useForm<QwenConfigForm>()
  const [isConfigured, setIsConfigured] = useState(false)
  const [qwenApiKey, setQwenApiKey] = useState('')
  const [activeTab, setActiveTab] = useState('voice')

  useEffect(() => {
    // 获取完整配置（合并文件和localStorage）
    const config = getAliyunTTSConfig()
    const hasConfig = hasAliyunConfig()
    setIsConfigured(hasConfig)

    // 设置表单值
    if (config) {
      form.setFieldsValue({
        accessKeyId: config.accessKeyId || '',
        accessKeySecret: config.accessKeySecret ? '****************' : '', // 隐藏真实密钥
        appKey: config.appKey || '',
        region: config.region || 'cn-shanghai',
        voice: config.voice || 'xiaoyun',
        speechRate: config.speechRate || 1.2,
      })
    }

    // 加载通义千问API Key
    const storedQwenKey = getStoredApiKey()
    if (storedQwenKey) {
      setQwenApiKey(storedQwenKey)
      qwenForm.setFieldsValue({ apiKey: '****************' })
    }
  }, [form, qwenForm])

  // 保存通义千问配置
  const handleSaveQwen = (values: QwenConfigForm) => {
    const key = values.apiKey === '****************' ? qwenApiKey : values.apiKey
    if (key) {
      saveApiKey(key)
      setQwenApiKey(key)
      message.success('通义千问 API Key 已保存')
    }
  }

  const handleSave = (values: ConfigForm) => {
    // 获取原始配置
    const originalConfig = getAliyunTTSConfig()
    
    // 如果表单中的secret是掩码，使用原始配置中的真实值
    const accessKeySecret = values.accessKeySecret === '****************' 
      ? originalConfig?.accessKeySecret 
      : values.accessKeySecret

    saveAliyunConfig({
      accessKeyId: values.accessKeyId,
      accessKeySecret: accessKeySecret || values.accessKeySecret,
      appKey: values.appKey,
      region: values.region,
      voice: values.voice,
      speechRate: values.speechRate,
    })
    setIsConfigured(true)
    message.success('配置已保存')
  }

  // 测试语音
  const testVoice = async () => {
    const values = form.getFieldsValue()
    const text = '您好，我是AI访谈主持人，很高兴为您服务。'

    // 获取原始配置（包含真实的accessKeySecret）
    const originalConfig = getAliyunTTSConfig()
    console.log('原始配置:', originalConfig)
    
    // 如果表单中的secret是掩码，使用原始配置中的真实值
    const accessKeySecret = values.accessKeySecret === '****************' 
      ? originalConfig?.accessKeySecret 
      : values.accessKeySecret

    console.log('表单值:', values)
    console.log('使用的accessKeySecret:', accessKeySecret ? '有值' : '无值')

    // 保存配置（使用真实密钥）
    saveAliyunConfig({
      accessKeyId: values.accessKeyId,
      accessKeySecret: accessKeySecret || '',
      appKey: values.appKey,
      region: values.region,
      voice: values.voice,
      speechRate: values.speechRate,
    })

    try {
      await speak(text, {
        voice: values.voice,
        speechRate: values.speechRate,
      })
    } catch (error) {
      message.error('语音播放失败')
    }
  }

  // 清除配置
  const clearConfig = () => {
    localStorage.removeItem('aliyun_tts_config')
    form.resetFields()
    setIsConfigured(false)
    message.success('配置已清除，请重新输入')
  }

  // 清除通义千问配置
  const clearQwenConfig = () => {
    localStorage.removeItem('qwen_api_key')
    qwenForm.resetFields()
    setQwenApiKey('')
    message.success('通义千问配置已清除')
  }

  return (
    <div>
      <Title level={2}>服务配置</Title>
      <Text type="secondary">配置AI访谈所需的各项服务参数</Text>

      <Card style={{ marginTop: '24px', maxWidth: '700px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'voice',
              label: '语音合成',
              children: <VoiceConfigTab />,
            },
            {
              key: 'analysis',
              label: '访谈分析',
              children: <AnalysisConfigTab />,
            },
          ]}
        />
      </Card>
    </div>
  )

  // 语音配置标签页
  function VoiceConfigTab() {
    return (
      <>
        <Alert
          message="当前使用浏览器原生语音合成"
          description={
            <div>
              <p>目前使用的是浏览器内置的语音合成引擎，特点：</p>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>✅ 无需配置，开箱即用</li>
                <li>❌ 声音较机械，AI感较强</li>
                <li>❌ 发音人选择有限</li>
                <li>⚠️ 不同浏览器效果差异大（推荐Chrome）</li>
              </ul>
              <p style={{ marginTop: '8px' }}>
                如需更自然的语音效果，请配置下方的阿里云语音合成参数。
              </p>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: '24px' }}
        />

        {isConfigured && (
          <Alert
            message="已配置"
            description="语音配置已保存"
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: '24px' }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            region: 'cn-shanghai',
            voice: 'xiaoyun',
            speechRate: 1.2,
          }}
        >
          <Divider orientation="left">语音参数</Divider>

          <Form.Item
            name="speechRate"
            label="语速"
            help="调整AI读题的速度"
          >
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              marks={{
                0.5: '慢',
                1.0: '正常',
                1.5: '快',
                2.0: '很快',
              }}
            />
          </Form.Item>

          <Form.Item>
            <Button onClick={testVoice} type="dashed">
              测试语音效果
            </Button>
          </Form.Item>

          <Divider orientation="left">阿里云语音合成（可选）</Divider>

          <Alert
            message="阿里云语音合成提供更自然的语音效果"
            description="配置后可获得更流畅、更自然的AI语音"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Form.Item
            name="accessKeyId"
            label="AccessKey ID"
            rules={[{ required: true, message: '请输入AccessKey ID' }]}
          >
            <Input placeholder="请输入阿里云AccessKey ID" />
          </Form.Item>

          <Form.Item
            name="accessKeySecret"
            label="AccessKey Secret"
            rules={[{ required: true, message: '请输入AccessKey Secret' }]}
          >
            <Input.Password placeholder="请输入阿里云AccessKey Secret" />
          </Form.Item>

          <Form.Item
            name="appKey"
            label="AppKey"
            rules={[{ required: true, message: '请输入AppKey' }]}
            help="在阿里云语音合成控制台创建项目后获取"
          >
            <Input placeholder="请输入阿里云AppKey" />
          </Form.Item>

          <Form.Item
            name="region"
            label="地域"
            rules={[{ required: true, message: '请选择地域' }]}
          >
            <Select>
              <Select.Option value="cn-shanghai">华东1（上海）</Select.Option>
              <Select.Option value="cn-beijing">华北2（北京）</Select.Option>
              <Select.Option value="cn-shenzhen">华南1（深圳）</Select.Option>
              <Select.Option value="cn-hangzhou">华东2（杭州）</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="voice"
            label="发音人"
            help="选择AI主持人的声音（阿里云TTS支持更多发音人）"
          >
            <Select options={VOICE_OPTIONS} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                保存配置
              </Button>
              <Button
                onClick={() => {
                  form.resetFields()
                  setIsConfigured(false)
                }}
              >
                重置
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={clearConfig}>
                清除配置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Alert
          message="如何获取阿里云语音配置？"
          description={
            <ol style={{ margin: 0, paddingLeft: '16px' }}>
              <li>
                访问{' '}
                <a
                  href="https://nls-portal.console.aliyun.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  阿里云智能语音交互控制台
                </a>
              </li>
              <li>创建项目并开通语音合成服务</li>
              <li>在项目中获取 AppKey</li>
              <li>
                在{' '}
                <a
                  href="https://ram.console.aliyun.com/manage/ak"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  AccessKey管理
                </a>{' '}
                获取 AccessKey ID 和 Secret
              </li>
            </ol>
          }
          type="info"
          style={{ marginTop: '24px' }}
        />
      </>
    )
  }

  // 分析配置标签页
  function AnalysisConfigTab() {
    return (
      <>
        <Alert
          message="通义千问 API Key"
          description="用于访谈记录的深度分析，提取关键主题和洞察"
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        {qwenApiKey && (
          <Alert
            message="已配置"
            description="通义千问 API Key 已保存"
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: '24px' }}
          />
        )}

        <Form
          form={qwenForm}
          layout="vertical"
          onFinish={handleSaveQwen}
        >
          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: true, message: '请输入通义千问 API Key' }]}
            help="在阿里云控制台获取通义千问的 API Key"
          >
            <Input.Password placeholder="请输入通义千问 API Key" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                保存配置
              </Button>
              <Button
                onClick={() => {
                  qwenForm.resetFields()
                }}
              >
                重置
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={clearQwenConfig}>
                清除配置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Alert
          message="如何获取通义千问 API Key？"
          description={
            <ol style={{ margin: 0, paddingLeft: '16px' }}>
              <li>
                访问{' '}
                <a
                  href="https://dashscope.console.aliyun.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  阿里云灵积模型服务控制台
                </a>
              </li>
              <li>开通灵积模型服务</li>
              <li>在 API Key 管理中创建新的 API Key</li>
              <li>复制 API Key 到上方输入框</li>
            </ol>
          }
          type="info"
          style={{ marginTop: '24px' }}
        />
      </>
    )
  }
}
