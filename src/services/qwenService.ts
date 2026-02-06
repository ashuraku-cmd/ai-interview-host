// 阿里云通义千问服务
// 使用后端代理API调用，隐藏API Key

const BACKEND_API_URL = 'http://localhost:8000/api/v1'

// 默认API Key（阿里云百炼）
const DEFAULT_API_KEY = 'sk-41f37bb962294e49a42c83d61467c9e9'

// 从localStorage获取API Key，如果没有则使用默认Key
const getApiKey = (): string => {
  return localStorage.getItem('qwen_api_key') || DEFAULT_API_KEY
}

// 保存API Key
export function saveApiKey(apiKey: string): void {
  localStorage.setItem('qwen_api_key', apiKey)
}

// 获取API Key
export function getStoredApiKey(): string {
  return localStorage.getItem('qwen_api_key') || DEFAULT_API_KEY
}

// 调用后端代理API进行分析
export async function callAnalysisAPI(sessionId: string): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId })
    })
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (result.success) {
      return JSON.stringify(result.data)
    } else {
      throw new Error(result.message || '分析失败')
    }
  } catch (error) {
    console.error('后端分析API调用失败:', error)
    throw error
  }
}

// 备用：直接调用通义千问API（本地调试使用）
export async function callQwenDirect(
  prompt: string,
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<string> {
  const apiKey = getApiKey()
  
  if (!apiKey) {
    throw new Error('请先配置通义千问API Key')
  }
  
  const QWEN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
  
  const {
    model = 'qwen-max',
    temperature = 0.7,
    maxTokens = 4000
  } = options
  
  try {
    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一位资深的市场研究分析师，擅长深度访谈分析和洞察提取。你的分析要有深度、专业性和洞察力。'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        parameters: {
          temperature: temperature,
          max_tokens: maxTokens,
          result_format: 'message'
        }
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API请求失败: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.output?.choices?.[0]?.message?.content) {
      return data.output.choices[0].message.content
    }
    
    throw new Error('API响应格式异常')
  } catch (error) {
    console.error('通义千问API调用失败:', error)
    throw error
  }
}

// 测试API Key是否有效
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            {
              role: 'user',
              content: '你好'
            }
          ]
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 100
        }
      })
    })
    
    return response.ok
  } catch (error) {
    return false
  }
}
