// 深度访谈分析报告服务 - 专业版
// 支持多份访谈综合分析、分批处理、实时进度反馈

import { type InterviewSession, type Message } from '../store/interviewStore'
import { getStoredApiKey } from './qwenService'

const API_BASE_URL = 'http://localhost:8000'

// 每批最大token数（预留空间给prompt）
const BATCH_MAX_TOKENS = 25000

// ==================== 类型定义 ====================

// 分析进度
export interface AnalysisProgress {
  percent: number
  message: string
  currentStep: number
  totalSteps: number
  batchInfo?: {
    currentBatch: number
    totalBatches: number
  }
}

// 人群画像
export interface Demographics {
  ageGroups?: string[]
  occupations?: string[]
  otherTraits?: string[]
}

// 多维度分析
export interface MultiDimensionalAnalysis {
  overall: string
  byDemographics: DemographicView[]
  byMarket: string
}

// 人群细分视角
export interface DemographicView {
  group: string
  view: string
  insight: string
}

// 分析结果类型
export interface ThemeAnalysisResult {
  summary: string
  themeCount: number
  themes: ThemeDetail[]
  statistics?: {
    totalSessions: number
    totalMessages: number
    avgMessagesPerSession: number
    batchCount?: number
  }
}

export interface ThemeDetail {
  id: string
  title: string
  description: string
  keyQuote: string
  importance: string
  mentionCount?: number
  demographics?: Demographics
  marketInsights?: string
  coreConclusion: string
  breakdown: BreakdownPoint[]
  multiDimensionalAnalysis?: MultiDimensionalAnalysis
  story: string
}

export interface BreakdownPoint {
  point: string
  detail: string
  evidence: string
  quotes: QuoteDetail[]
  mentionCount: number
  demographics: Demographics
}

export interface QuoteDetail {
  text: string
  context: string
  speaker: string
}

// ==================== 工具函数 ====================

// 清理文本中的控制字符
function cleanControlCharacters(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
}

// 估算文本的token数量
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars * 1.5 + otherChars * 0.5)
}

// 将访谈分批
function splitIntoBatches(sessions: InterviewSession[][]): InterviewSession[][] {
  const batches: InterviewSession[][] = []
  let currentBatch: InterviewSession[] = []
  let currentBatchTokens = 0

  for (const session of sessions.flat()) {
    const sessionText = buildTranscript(session)
    const sessionTokens = estimateTokens(sessionText)

    if (sessionTokens > BATCH_MAX_TOKENS) {
      if (currentBatch.length > 0) {
        batches.push([...currentBatch])
        currentBatch = []
        currentBatchTokens = 0
      }
      batches.push([session])
      continue
    }

    if (currentBatchTokens + sessionTokens > BATCH_MAX_TOKENS && currentBatch.length > 0) {
      batches.push([...currentBatch])
      currentBatch = [session]
      currentBatchTokens = sessionTokens
    } else {
      currentBatch.push(session)
      currentBatchTokens += sessionTokens
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch)
  }

  return batches
}

// ==================== API调用 ====================

async function callAnalysisAPI(transcript: string): Promise<ThemeAnalysisResult> {
  const apiKey = getStoredApiKey()
  if (!apiKey) {
    throw new Error('请先配置通义千问 API Key（在语音配置页面）')
  }

  const cleanedTranscript = cleanControlCharacters(transcript)

  const response = await fetch(`${API_BASE_URL}/api/v1/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: cleanedTranscript,
      apiKey: apiKey
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '分析请求失败' }))
    throw new Error(errorData.message || `分析请求失败 (${response.status})`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.message || '分析失败')
  }

  return result.data as ThemeAnalysisResult
}

// 合并多批分析结果
function mergeBatchResults(results: ThemeAnalysisResult[]): ThemeAnalysisResult {
  if (results.length === 1) {
    return results[0]
  }

  const allThemes: ThemeDetail[] = []

  for (const result of results) {
    for (const theme of result.themes) {
      const existingTheme = allThemes.find(t =>
        t.title === theme.title ||
        (t.title.includes(theme.title) || theme.title.includes(t.title))
      )

      if (existingTheme) {
        existingTheme.coreConclusion += `\n\n【补充】${theme.coreConclusion}`
        existingTheme.breakdown = [...existingTheme.breakdown, ...theme.breakdown]
        if (theme.story && !existingTheme.story) {
          existingTheme.story = theme.story
        }
        if (theme.mentionCount && existingTheme.mentionCount) {
          existingTheme.mentionCount += theme.mentionCount
        }
      } else {
        allThemes.push({ ...theme })
      }
    }
  }

  const summaries = results.map(r => r.summary)
  return {
    summary: `本分析基于多批次处理完成。\n\n${summaries.join('\n\n')}`,
    themeCount: allThemes.length,
    themes: allThemes
  }
}

// ==================== 主分析函数 ====================

export async function analyzeMultipleInterviews(
  sessions: InterviewSession[],
  onProgress?: (progress: AnalysisProgress) => void
): Promise<ThemeAnalysisResult> {
  console.log(`[Analysis] 开始深度分析 ${sessions.length} 份访谈`)

  if (sessions.length === 0) {
    throw new Error('请至少选择一个访谈进行分析')
  }

  const apiKey = getStoredApiKey()
  if (!apiKey) {
    throw new Error('请先配置通义千问 API Key（在语音配置页面）')
  }

  const batches = splitIntoBatches([sessions])
  console.log(`[Analysis] 分成 ${batches.length} 批进行处理`)

  const batchResults: ThemeAnalysisResult[] = []

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]

    if (onProgress) {
      onProgress({
        percent: Math.round((i / batches.length) * 40),
        message: `正在准备第 ${i + 1}/${batches.length} 批数据...`,
        currentStep: 1,
        totalSteps: 4,
        batchInfo: { currentBatch: i + 1, totalBatches: batches.length }
      })
    }

    const transcripts = batch.map(session => buildTranscript(session))
    const combinedTranscript = transcripts.join('\n\n=== 下一份访谈 ===\n\n')

    if (onProgress) {
      onProgress({
        percent: Math.round((i / batches.length) * 40 + 10),
        message: `正在分析第 ${i + 1}/${batches.length} 批内容...`,
        currentStep: 2,
        totalSteps: 4,
        batchInfo: { currentBatch: i + 1, totalBatches: batches.length }
      })
    }

    try {
      const result = await callAnalysisAPI(combinedTranscript)
      batchResults.push(result)

      if (onProgress) {
        onProgress({
          percent: Math.round(((i + 1) / batches.length) * 40 + 10),
          message: `第 ${i + 1}/${batches.length} 批分析完成，提炼出 ${result.themeCount} 个主题`,
          currentStep: 2,
          totalSteps: 4,
          batchInfo: { currentBatch: i + 1, totalBatches: batches.length }
        })
      }
    } catch (error) {
      console.error(`[Analysis] 第 ${i + 1} 批分析失败:`, error)
      throw error
    }
  }

  if (onProgress) {
    onProgress({
      percent: 60,
      message: '正在合并各批次分析结果...',
      currentStep: 3,
      totalSteps: 4
    })
  }

  const mergedResult = mergeBatchResults(batchResults)

  const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0)
  mergedResult.statistics = {
    totalSessions: sessions.length,
    totalMessages: totalMessages,
    avgMessagesPerSession: Math.round(totalMessages / sessions.length),
    batchCount: batches.length
  }

  if (onProgress) {
    onProgress({
      percent: 100,
      message: `分析完成！共提炼 ${mergedResult.themeCount} 个关键主题`,
      currentStep: 4,
      totalSteps: 4
    })
  }

  return mergedResult
}

export async function analyzeInterview(
  session: InterviewSession,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<ThemeAnalysisResult> {
  return analyzeMultipleInterviews([session], onProgress)
}

function buildTranscript(session: InterviewSession): string {
  const lines: string[] = []
  lines.push(`=== 访谈记录 ===`)
  lines.push(`访谈主题：${session.outlineTitle}`)
  lines.push(`访谈时间：${new Date(session.createdAt).toLocaleString()}`)
  lines.push(`对话数量：${session.messages.length}`)
  lines.push('')

  session.messages.forEach((msg) => {
    const role = msg.role === 'assistant' ? 'AI主持人' : (msg.speaker || '被访者')
    const cleanContent = cleanControlCharacters(msg.content)
    lines.push(`${role}：${cleanContent}`)
    lines.push('')
  })

  return lines.join('\n')
}

// ==================== 导出功能 ====================

export function exportReportToMarkdown(result: ThemeAnalysisResult, sessionTitle: string): void {
  let content = `# ${sessionTitle} - 深度访谈分析报告\n\n`

  content += `## 📊 研究概述\n\n${result.summary}\n\n`

  if (result.statistics) {
    content += `### 📈 数据统计\n\n`
    content += `- **分析访谈数**：${result.statistics.totalSessions} 份\n`
    content += `- **总对话数**：${result.statistics.totalMessages} 条\n`
    content += `- **平均每份访谈**：${result.statistics.avgMessagesPerSession} 条对话\n`
    if (result.statistics.batchCount && result.statistics.batchCount > 1) {
      content += `- **分批处理**：共分 ${result.statistics.batchCount} 批进行分析\n`
    }
    content += '\n'
  }

  content += `---\n\n## 🔍 主题分析（共${result.themeCount}个关键主题）\n\n`

  result.themes.forEach((theme, index) => {
    content += `### ${index + 1}. ${theme.title}\n\n`

    if (theme.description) content += `> ${theme.description}\n\n`
    if (theme.importance) content += `**重要性评级**：${theme.importance}\n\n`
    if (theme.mentionCount) content += `**提及次数**：${theme.mentionCount}\n\n`

    content += `#### 💡 核心结论\n\n${theme.coreConclusion}\n\n`

    if (theme.breakdown?.length > 0) {
      content += `#### 🔬 结论拆解与证据\n\n`
      theme.breakdown.forEach((item, i) => {
        content += `**${i + 1}. ${item.point}**（提及${item.mentionCount}次）\n\n`
        content += `${item.detail}\n\n`
        if (item.evidence) content += `> 📌 **证据**：${item.evidence}\n\n`
        if (item.quotes?.length > 0) {
          content += `**相关原话：**\n\n`
          item.quotes.forEach(q => {
            content += `> "${q.text}"\n`
            content += `> —— ${q.speaker} | ${q.context}\n\n`
          })
        }
        content += '\n'
      })
    }

    if (theme.multiDimensionalAnalysis) {
      content += `#### 📊 多维度分析\n\n`
      content += `**整体视角：**${theme.multiDimensionalAnalysis.overall}\n\n`
      if (theme.multiDimensionalAnalysis.byDemographics?.length > 0) {
        content += `**人群差异：**\n\n`
        theme.multiDimensionalAnalysis.byDemographics.forEach(d => {
          content += `- **${d.group}**：${d.view}\n`
          content += `  洞察：${d.insight}\n\n`
        })
      }
      if (theme.multiDimensionalAnalysis.byMarket) {
        content += `**市场洞察：**${theme.multiDimensionalAnalysis.byMarket}\n\n`
      }
    }

    if (theme.story) {
      content += `#### 📖 典型故事\n\n${theme.story}\n\n`
    }

    content += `---\n\n`
  })

  content += `## 📝 分析方法说明\n\n`
  content += `本报告采用两轮深度分析法：\n\n`
  content += `1. **第一轮：主题提炼** - 通读所有访谈记录，识别关键主题\n`
  content += `2. **第二轮：深度拆解** - 对每个主题进行详细分析，提取洞察\n\n`
  if (result.statistics?.batchCount && result.statistics.batchCount > 1) {
    content += `**分批处理说明**：由于访谈内容较多，系统已将内容分成 ${result.statistics.batchCount} 批进行处理。\n\n`
  }
  content += `报告生成时间：${new Date().toLocaleString()}\n`

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sessionTitle}_深度分析报告.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
