import { useState, useEffect } from 'react'
import {
  Card,
  Upload,
  Button,
  Table,
  Input,
  Select,
  Space,
  message,
  Typography,
  Divider,
  Modal,
  Form,
  List,
  Tag,
  Popconfirm,
  Empty,
  Spin,
} from 'antd'
import {
  UploadOutlined,
  EditOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useOutlineStore, type Outline, type Module, type Question } from '../store/outlineStore'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select
const { confirm } = Modal

export default function OutlineManager() {
  const {
    currentOutline,
    outlineList,
    isLoading,
    setCurrentOutline,
    addOutline,
    updateQuestion,
    deleteQuestion,
    addQuestion,
    addModule,
    updateModule,
    deleteModule,
    saveToBackend,
    loadFromBackend,
  } = useOutlineStore()

  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addForm] = Form.useForm()
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

  // 上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    action: 'http://localhost:8000/api/v1/outlines/upload',
    accept: '.docx',
    showUploadList: false,
    onChange(info) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} 上传成功`)
        const outlineId = info.file.response?.data?.outline_id
        if (outlineId) {
          loadFromBackend(outlineId)
        }
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`)
      }
    },
  }

  // 保存大纲
  const handleSave = async () => {
    if (!currentOutline) {
      message.warning('没有可保存的大纲')
      return
    }
    const success = await saveToBackend()
    if (success) {
      message.success('保存成功')
    } else {
      message.error('保存失败，请检查网络连接')
    }
  }

  // 保存编辑
  const saveEdit = (moduleId: string, questionId: string) => {
    updateQuestion(moduleId, questionId, { content: editContent })
    setEditingQuestion(null)
    message.success('保存成功')
  }

  // 更新问题类型
  const updateQuestionType = (moduleId: string, questionId: string, type: 'main' | 'followup') => {
    updateQuestion(moduleId, questionId, { type })
  }

  // 更新追问深度
  const updateQuestionDepth = (moduleId: string, questionId: string, depth: number) => {
    updateQuestion(moduleId, questionId, { depth })
  }

  // 删除问题
  const handleDeleteQuestion = (moduleId: string, questionId: string) => {
    deleteQuestion(moduleId, questionId)
    message.success('删除成功')
  }

  // 添加问题
  const handleAddQuestion = (values: { content: string; type: 'main' | 'followup'; depth: number }) => {
    if (!activeModuleId) return
    addQuestion(activeModuleId, {
      content: values.content,
      type: values.type,
      depth: values.depth,
    })
    setIsAddModalOpen(false)
    addForm.resetFields()
    message.success('添加成功')
  }

  // 添加模块
  const handleAddModule = () => {
    if (!currentOutline) {
      message.warning('请先上传大纲')
      return
    }
    const title = `新模块 ${currentOutline.modules.length + 1}`
    addModule(title)
    message.success('模块添加成功')
  }

  // 删除模块
  const handleDeleteModule = (moduleId: string) => {
    confirm({
      title: '确认删除模块',
      content: '删除模块将同时删除该模块下的所有问题，是否继续？',
      onOk() {
        deleteModule(moduleId)
        message.success('删除成功')
      },
    })
  }

  // 表格列定义
  const getColumns = (moduleId: string) => [
    {
      title: '序号',
      dataIndex: 'order',
      key: 'order',
      width: 60,
      render: (order: number) => <Text type="secondary">{order + 1}</Text>,
    },
    {
      title: '问题内容',
      dataIndex: 'content',
      key: 'content',
      width: '45%',
      render: (text: string, record: Question) => {
        if (editingQuestion === record.id) {
          return (
            <TextArea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
              autoFocus
            />
          )
        }
        return (
          <Text
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {text}
          </Text>
        )
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string, record: Question) => (
        <Select
          value={type}
          onChange={(value) => updateQuestionType(moduleId, record.id, value)}
          size="small"
          style={{ width: '100%' }}
        >
          <Option value="main">
            <Tag color="blue">主问题</Tag>
          </Option>
          <Option value="followup">
            <Tag color="green">追问</Tag>
          </Option>
        </Select>
      ),
    },
    {
      title: '追问深度',
      dataIndex: 'depth',
      key: 'depth',
      width: 120,
      render: (depth: number, record: Question) => (
        <Select
          value={depth}
          onChange={(value) => updateQuestionDepth(moduleId, record.id, value)}
          size="small"
          style={{ width: '100%' }}
        >
          <Option value={1}>浅层 (1次)</Option>
          <Option value={2}>中等 (2次)</Option>
          <Option value={3}>深层 (3次)</Option>
        </Select>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Question) => (
        <Space size="small">
          {editingQuestion === record.id ? (
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={() => saveEdit(moduleId, record.id)}
            >
              保存
            </Button>
          ) : (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingQuestion(record.id)
                setEditContent(record.content)
              }}
            >
              编辑
            </Button>
          )}
          <Popconfirm
            title="确认删除"
            description="删除后不可恢复，是否继续？"
            onConfirm={() => handleDeleteQuestion(moduleId, record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Title level={2}>大纲管理</Title>
      <Text type="secondary">上传Word文档解析访谈大纲，并编辑问题内容和属性</Text>

      <Divider />

      {/* 操作栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space size="middle">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} type="primary">
              上传Word大纲
            </Button>
          </Upload>
          {currentOutline && (
            <>
              <Button icon={<PlusOutlined />} onClick={handleAddModule}>
                添加模块
              </Button>
              <Button icon={<SaveOutlined />} onClick={handleSave} type="dashed">
                保存修改
              </Button>
            </>
          )}
        </Space>
      </Card>

      {/* 加载状态 */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">加载中...</Text>
          </div>
        </div>
      )}

      {/* 大纲编辑区域 */}
      {!isLoading && currentOutline && (
        <>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>{currentOutline.title}</span>
                <Tag color="blue">{currentOutline.modules.length} 个模块</Tag>
                <Tag color="green">
                  {currentOutline.modules.reduce(
                    (sum, m) => sum + m.questions.length,
                    0
                  )}{' '}
                  个问题
                </Tag>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            {currentOutline.modules.map((module) => (
              <Card
                key={module.id}
                type="inner"
                title={
                  <Space>
                    <Text strong>{module.title}</Text>
                    <Tag>{module.questions.length} 题</Tag>
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setActiveModuleId(module.id)
                        setIsAddModalOpen(true)
                      }}
                    >
                      添加问题
                    </Button>
                    <Popconfirm
                      title="确认删除模块"
                      description="删除模块将同时删除该模块下的所有问题"
                      onConfirm={() => handleDeleteModule(module.id)}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />}>
                        删除模块
                      </Button>
                    </Popconfirm>
                  </Space>
                }
                style={{ marginBottom: '16px' }}
              >
                {module.questions.length > 0 ? (
                  <Table
                    columns={getColumns(module.id)}
                    dataSource={module.questions}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    rowClassName={() => 'question-row'}
                  />
                ) : (
                  <Empty description="暂无问题，点击上方按钮添加" />
                )}
              </Card>
            ))}
          </Card>
        </>
      )}

      {/* 空状态 */}
      {!isLoading && !currentOutline && (
        <Card>
          <Empty
            description="请先上传大纲文件"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Upload {...uploadProps}>
              <Button type="primary" icon={<UploadOutlined />}>
                上传Word文档
              </Button>
            </Upload>
          </Empty>
        </Card>
      )}

      {/* 添加问题弹窗 */}
      <Modal
        title="添加问题"
        open={isAddModalOpen}
        onOk={() => addForm.submit()}
        onCancel={() => {
          setIsAddModalOpen(false)
          addForm.resetFields()
        }}
        okText="添加"
        cancelText="取消"
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAddQuestion}
          initialValues={{ type: 'main', depth: 2 }}
        >
          <Form.Item
            name="content"
            label="问题内容"
            rules={[{ required: true, message: '请输入问题内容' }]}
          >
            <TextArea rows={3} placeholder="请输入问题内容" />
          </Form.Item>
          <Form.Item name="type" label="问题类型">
            <Select>
              <Option value="main">主问题</Option>
              <Option value="followup">追问</Option>
            </Select>
          </Form.Item>
          <Form.Item name="depth" label="追问深度">
            <Select>
              <Option value={1}>浅层 (1次追问)</Option>
              <Option value={2}>中等 (2次追问)</Option>
              <Option value={3}>深层 (3次追问)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
