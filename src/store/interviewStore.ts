import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 消息类型
export interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: string
  type?: 'question' | 'follow_up' | 'transition' | 'completed'
  speaker?: string // 用于区分不同被访者（如：被访者1、被访者2）
}

// 访谈状态
export interface InterviewSession {
  id: string
  outlineId: string
  outlineTitle: string
  messages: Message[]
  currentState: 'idle' | 'ongoing' | 'completed'
  progress: {
    currentModule: number
    totalModules: number
    currentQuestion: number
    totalQuestions: number
  }
  createdAt: string
  updatedAt: string
}

// 输入模式
export type InputMode = 'voice' | 'text'

// Store状态
interface InterviewState {
  // 当前会话
  currentSession: InterviewSession | null
  // 输入模式
  inputMode: InputMode
  // 是否正在录音
  isRecording: boolean
  // 是否正在播放语音
  isPlaying: boolean
  // 加载状态
  isLoading: boolean
  // 会话列表
  sessionList: InterviewSession[]
  // 当前活动标签页
  activeTab: string

  // Actions
  setInputMode: (mode: InputMode) => void
  setIsRecording: (isRecording: boolean) => void
  setIsPlaying: (isPlaying: boolean) => void
  setActiveTab: (tab: string) => void

  // 会话操作
  createSession: (outlineId: string, outlineTitle: string) => Promise<string | null>
  loadSession: (sessionId: string) => Promise<void>
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  updateSessionProgress: (progress: InterviewSession['progress']) => void
  completeSession: () => void

  // 发送消息
  sendMessage: (content: string) => Promise<void>

  // 获取历史记录
  fetchHistory: () => Promise<void>

  // 删除会话
  deleteSession: (sessionId: string) => void
  // 批量删除会话
  deleteSessions: (sessionIds: string[]) => void
}

// 清除 localStorage 中的旧数据（临时清理，之后删除这段代码）
if (typeof window !== 'undefined') {
  localStorage.removeItem('interview-storage')
  console.log('[Init] 已清除 localStorage 中的 interview-storage')
}

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      inputMode: 'voice', // 默认语音模式
      isRecording: false,
      isPlaying: false,
      isLoading: false,
      sessionList: [],
      activeTab: 'outline', // 默认大纲管理页

      // 设置输入模式
      setInputMode: (mode) => {
        set({ inputMode: mode })
      },

      // 设置录音状态
      setIsRecording: (isRecording) => {
        set({ isRecording })
      },

      // 设置播放状态
      setIsPlaying: (isPlaying) => {
        set({ isPlaying })
      },

      // 设置活动标签页
      setActiveTab: (tab) => {
        set({ activeTab: tab })
      },

      // 创建会话
      createSession: async (outlineId, outlineTitle) => {
        set({ isLoading: true })
        try {
          console.log('创建会话，大纲ID:', outlineId)
          const response = await fetch('http://localhost:8000/api/v1/interviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              outline_id: outlineId,
              nickname: '受访者',
            }),
          })

          const result = await response.json()
          console.log('创建会话结果:', result)

          if (result.success) {
            const session: InterviewSession = {
              id: result.data.session_id,
              outlineId,
              outlineTitle: result.data.outline_title,
              messages: [
                {
                  id: `msg_${Date.now()}`,
                  role: 'assistant',
                  content: result.data.opening,
                  timestamp: new Date().toISOString(),
                  type: 'question',
                },
              ],
              currentState: 'ongoing',
              progress: {
                currentModule: 1,
                totalModules: 1,
                currentQuestion: 1,
                totalQuestions: 1,
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }

            set((state) => ({
              currentSession: session,
              sessionList: [session, ...state.sessionList],
            }))

            return session.id
          }
          console.error('创建会话失败:', result.message)
          return null
        } catch (error) {
          console.error('创建会话失败:', error)
          return null
        } finally {
          set({ isLoading: false })
        }
      },

      // 加载会话
      loadSession: async (sessionId) => {
        set({ isLoading: true })
        try {
          console.log('加载会话:', sessionId)
          
          // 首先尝试从后端加载
          const response = await fetch(
            `http://localhost:8000/api/v1/interviews/${sessionId}/history`
          )
          const result = await response.json()
          console.log('后端返回的历史记录:', result)
          
          if (result.success) {
            const messages: Message[] = result.data.messages.map(
              (msg: any, index: number) => ({
                id: `msg_${index}`,
                // 后端可能使用 'ai' 或 'assistant'，统一转换为 'assistant'
                role: msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content,
                timestamp: msg.timestamp,
              })
            )
            console.log('转换后的消息:', messages)

            set((state) => {
              const existingSession = state.sessionList.find((s) => s.id === sessionId)
              
              if (existingSession) {
                // 更新现有会话
                const updatedSession = { 
                  ...existingSession, 
                  messages,
                  updatedAt: new Date().toISOString(),
                }
                console.log('更新现有session:', updatedSession)
                return {
                  currentSession: updatedSession,
                  sessionList: state.sessionList.map((s) =>
                    s.id === sessionId ? updatedSession : s
                  ),
                }
              } else {
                // 创建新会话对象（从后端获取的信息）
                const newSession: InterviewSession = {
                  id: sessionId,
                  outlineId: result.data.outline_id || '',
                  outlineTitle: result.data.outline_title || '未命名访谈',
                  messages,
                  currentState: 'ongoing',
                  progress: {
                    currentModule: result.data.current_module || 1,
                    totalModules: result.data.total_modules || 1,
                    currentQuestion: result.data.current_question || 1,
                    totalQuestions: result.data.total_questions || 1,
                  },
                  createdAt: result.data.created_at || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
                console.log('创建新session:', newSession)
                return {
                  currentSession: newSession,
                  sessionList: [newSession, ...state.sessionList],
                }
              }
            })
          } else {
            // 后端返回失败，尝试从本地加载
            console.log('后端加载失败，尝试从本地加载')
            set((state) => {
              const localSession = state.sessionList.find((s) => s.id === sessionId)
              if (localSession) {
                console.log('从本地加载session:', localSession)
                
                // 转换消息角色，确保兼容性
                const normalizedMessages = localSession.messages.map((msg, idx) => {
                  // 调试：打印原始消息
                  console.log(`[LoadSession] 消息 ${idx}: 原始 role=`, msg.role, 'type=', msg.type)
                  
                  // 转换规则：ai -> assistant，其他保持不变
                  const normalizedRole = (msg.role === 'ai' || msg.role === 'AI') ? 'assistant' : 
                                         (msg.role === 'user' || msg.role === 'USER') ? 'user' : 
                                         msg.role || 'user'
                  
                  return {
                    ...msg,
                    role: normalizedRole,
                  }
                })
                
                const normalizedSession = {
                  ...localSession,
                  messages: normalizedMessages,
                }
                
                return {
                  currentSession: normalizedSession,
                  sessionList: state.sessionList.map((s) =>
                    s.id === sessionId ? normalizedSession : s
                  ),
                }
              }
              return state
            })
          }
        } catch (error) {
          console.error('加载会话失败:', error)
          // 网络错误时尝试从本地加载
          set((state) => {
            const localSession = state.sessionList.find((s) => s.id === sessionId)
            if (localSession) {
              console.log('网络错误，从本地加载session:', localSession)
              
              // 转换消息角色，确保兼容性
              const normalizedMessages = localSession.messages.map((msg, idx) => {
                console.log(`[LoadSession] 消息 ${idx}: 原始 role=`, msg.role)
                
                // 转换规则：ai -> assistant，其他保持不变
                const normalizedRole = (msg.role === 'ai' || msg.role === 'AI') ? 'assistant' : 
                                       (msg.role === 'user' || msg.role === 'USER') ? 'user' : 
                                       msg.role || 'user'
                
                return {
                  ...msg,
                  role: normalizedRole,
                }
              })
              
              const normalizedSession = {
                ...localSession,
                messages: normalizedMessages,
              }
              
              return {
                currentSession: normalizedSession,
                sessionList: state.sessionList.map((s) =>
                  s.id === sessionId ? normalizedSession : s
                ),
              }
            }
            return state
          })
        } finally {
          set({ isLoading: false })
        }
      },

      // 添加消息
      addMessage: (message) => {
        const { currentSession } = get()
        if (!currentSession) return

        const newMessage: Message = {
          ...message,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        }

        const updatedSession: InterviewSession = {
          ...currentSession,
          messages: [...currentSession.messages, newMessage],
          updatedAt: new Date().toISOString(),
        }

        // 同时更新 currentSession 和 sessionList
        set((state) => ({
          currentSession: updatedSession,
          sessionList: state.sessionList.map((s) =>
            s.id === updatedSession.id ? updatedSession : s
          ),
        }))
      },

      // 更新进度
      updateSessionProgress: (progress) => {
        const { currentSession } = get()
        if (!currentSession) return

        const updatedSession = {
          ...currentSession,
          progress,
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          currentSession: updatedSession,
          sessionList: state.sessionList.map((s) =>
            s.id === updatedSession.id ? updatedSession : s
          ),
        }))
      },

      // 完成会话
      completeSession: () => {
        const { currentSession } = get()
        if (!currentSession) return

        const updatedSession = {
          ...currentSession,
          currentState: 'completed' as const,
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          currentSession: updatedSession,
          sessionList: state.sessionList.map((s) =>
            s.id === updatedSession.id ? updatedSession : s
          ),
        }))
      },

      // 发送消息
      sendMessage: async (content) => {
        const { currentSession, addMessage } = get()
        if (!currentSession) return

        // 添加用户消息
        addMessage({
          role: 'user',
          content,
          type: undefined,
        })

        set({ isLoading: true })
        try {
          const response = await fetch(
            `http://localhost:8000/api/v1/interviews/${currentSession.id}/messages`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content }),
            }
          )

          const result = await response.json()
          if (result.success) {
            const data = result.data

            // 添加AI回复
            if (data.type === 'completed') {
              addMessage({
                role: 'assistant',
                content: data.message,
                type: 'completed',
              })
              get().completeSession()
            } else {
              addMessage({
                role: 'assistant',
                content: data.message || data.content,
                type: data.type,
              })

              // 更新进度
              if (data.progress) {
                get().updateSessionProgress(data.progress)
              }
            }
          }
        } catch (error) {
          console.error('发送消息失败:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      // 获取历史记录
      fetchHistory: async () => {
        // 这里可以实现从后端获取历史会话列表
        // 暂时使用本地存储的会话列表
      },

      // 删除单个会话
      deleteSession: (sessionId: string) => {
        set((state) => ({
          sessionList: state.sessionList.filter((s) => s.id !== sessionId),
          currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
        }))
      },

      // 批量删除会话
      deleteSessions: (sessionIds: string[]) => {
        set((state) => ({
          sessionList: state.sessionList.filter((s) => !sessionIds.includes(s.id)),
          currentSession: sessionIds.includes(state.currentSession?.id || '') ? null : state.currentSession,
        }))
      },
    }),
    {
      name: 'interview-storage',
      partialize: (state) => ({
        sessionList: state.sessionList,
        inputMode: state.inputMode,
        activeTab: state.activeTab,
      }),
    }
  )
)
