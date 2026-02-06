import { Card, Typography } from 'antd'

const { Title, Text } = Typography

export default function VoiceInterview() {
  return (
    <div>
      <Title level={2}>语音访谈</Title>
      <Text type="secondary">AI主持人语音读题，支持语音回答</Text>
      
      <Card style={{ marginTop: '24px', height: 'calc(100vh - 200px)' }}>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Text type="secondary">功能开发中...</Text>
        </div>
      </Card>
    </div>
  )
}
