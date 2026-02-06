import { Card, Typography } from 'antd'

const { Title, Text } = Typography

export default function InterviewHistory() {
  return (
    <div>
      <Title level={2}>访谈记录</Title>
      <Text type="secondary">查看历史访谈记录并导出</Text>
      
      <Card style={{ marginTop: '24px', height: 'calc(100vh - 200px)' }}>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Text type="secondary">功能开发中...</Text>
        </div>
      </Card>
    </div>
  )
}
