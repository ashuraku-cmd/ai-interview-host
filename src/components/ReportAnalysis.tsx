import { Card, Typography } from 'antd'

const { Title, Text } = Typography

export default function ReportAnalysis() {
  return (
    <div>
      <Title level={2}>报告分析</Title>
      <Text type="secondary">基于访谈记录生成分析报告</Text>
      
      <Card style={{ marginTop: '24px', height: 'calc(100vh - 200px)' }}>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Text type="secondary">功能开发中...</Text>
        </div>
      </Card>
    </div>
  )
}
