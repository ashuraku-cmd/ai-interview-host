import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 消息类型
export interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: string
  type?: 'question' | 'follow_up' | 'transition' | 'completed'
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

  // Actions
  setInputMode: (mode: InputMode) => void
  setIsRecording: (isRecording: boolean) => void
  setIsPlaying: (isPlaying: boolean) => void

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
          const response = await fetch(
            `http://localhost:8000/api/v1/interviews/${sessionId}/history`
          )
          const result = await response.json()
          if (result.success) {
            const messages: Message[] = result.data.messages.map(
              (msg: any, index: number) => ({
                id: `msg_${index}`,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
              })
            )

            set((state) => {
              const session = state.sessionList.find((s) => s.id === sessionId)
              if (session) {
                return {
                  currentSession: { ...session, messages },
                }
              }
              return state
            })
          }
        } catch (error) {
          console.error('加载会话失败:', error)
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

        set({ currentSession: updatedSession })
      },

      // 更新进度
      updateSessionProgress: (progress) => {
        const { currentSession } = get()
        if (!currentSession) return

        set({
          currentSession: {
            ...currentSession,
            progress,
            updatedAt: new Date().toISOString(),
          },
        })
      },

      // 完成会话
      completeSession: () => {
        const { currentSession } = get()
        if (!currentSession) return

        set({
          currentSession: {
            ...currentSession,
            currentState: 'completed',
            updatedAt: new Date().toISOString(),
          },
        })
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
    }),
    {
      name: 'interview-storage',
      partialize: (state) => ({
        sessionList: state.sessionList,
        inputMode: state.inputMode,
      }),
    }
  )
)
