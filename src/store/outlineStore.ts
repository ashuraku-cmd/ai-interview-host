import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 问题类型
export interface Question {
  id: string
  content: string
  type: 'main' | 'followup'
  depth: number // 追问深度 1-3
  order: number // 排序序号
}

// 模块类型
export interface Module {
  id: string
  title: string
  order: number
  questions: Question[]
}

// 大纲类型
export interface Outline {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  modules: Module[]
}

// Store状态
interface OutlineState {
  // 当前大纲
  currentOutline: Outline | null
  // 大纲列表
  outlineList: Outline[]
  // 加载状态
  isLoading: boolean

  // Actions
  setCurrentOutline: (outline: Outline | null) => void
  addOutline: (outline: Outline) => void
  updateOutline: (outline: Outline) => void
  deleteOutline: (outlineId: string) => void

  // 问题操作
  addQuestion: (moduleId: string, question: Omit<Question, 'id' | 'order'>) => void
  updateQuestion: (moduleId: string, questionId: string, updates: Partial<Question>) => void
  deleteQuestion: (moduleId: string, questionId: string) => void
  reorderQuestions: (moduleId: string, questionIds: string[]) => void

  // 模块操作
  addModule: (title: string) => void
  updateModule: (moduleId: string, title: string) => void
  deleteModule: (moduleId: string) => void
  reorderModules: (moduleIds: string[]) => void

  // 保存到后端
  saveToBackend: () => Promise<boolean>
  // 从后端加载
  loadFromBackend: (outlineId: string) => Promise<void>
  // 同步后端大纲列表
  syncWithBackend: () => Promise<void>
}

export const useOutlineStore = create<OutlineState>()(
  persist(
    (set, get) => ({
      currentOutline: null,
      outlineList: [],
      isLoading: false,

      // 设置当前大纲
      setCurrentOutline: (outline) => {
        set({ currentOutline: outline })
      },

      // 添加大纲
      addOutline: (outline) => {
        set((state) => ({
          outlineList: [...state.outlineList, outline],
          currentOutline: outline,
        }))
      },

      // 更新大纲
      updateOutline: (outline) => {
        set((state) => ({
          outlineList: state.outlineList.map((o) =>
            o.id === outline.id ? outline : o
          ),
          currentOutline:
            state.currentOutline?.id === outline.id
              ? outline
              : state.currentOutline,
        }))
      },

      // 删除大纲
      deleteOutline: (outlineId) => {
        set((state) => ({
          outlineList: state.outlineList.filter((o) => o.id !== outlineId),
          currentOutline:
            state.currentOutline?.id === outlineId
              ? null
              : state.currentOutline,
        }))
      },

      // 添加问题
      addQuestion: (moduleId, question) => {
        const { currentOutline } = get()
        if (!currentOutline) return

        const newQuestion: Question = {
          ...question,
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          order:
            currentOutline.modules.find((m) => m.id === moduleId)?.questions
              .length || 0,
        }

        const updatedOutline: Outline = {
          ...currentOutline,
          updatedAt: new Date().toISOString(),
          modules: currentOutline.modules.map((m) =>
            m.id === moduleId
              ? { ...m, questions: [...m.questions, newQuestion] }
              : m
          ),
        }

        set({ currentOutline: updatedOutline })
      },

      // 更新问题
      updateQuestion: (moduleId, questionId, updates) => {
        const { currentOutline } = get()
        if (!currentOutline) return

        const updatedOutline: Outline = {
          ...currentOutline,
          updatedAt: new Date().toISOString(),
          modules: currentOutline.modules.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  questions: m.questions.map((q) =>
                    q.id === questionId ? { ...q, ...updates } : q
                  ),
                }
              : m
          ),
        }

        set({ currentOutline: updatedOutline })
      },

      // 删除问题
      deleteQuestion: (moduleId, questionId) => {
        const { currentOutline } = get()
        if (!currentOutline) return

        const updatedOutline: Outline = {
          ...currentOutline,
          updatedAt: new Date().toISOString(),
          modules: currentOutline.modules.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  questions: m.questions
                    .filter((q) => q.id !== questionId)
                    .map((q, index) => ({ ...q, order: index })),
                }
              : m
          ),
        }

        set({ currentOutline: updatedOutline })
      },

      // 重新排序问题
      reorderQuestions: (moduleId, questionIds) => {
        const { currentOutline } = get()
        if (!currentOutline) return

        const module = currentOutline.modules.find((m) => m.id === moduleId)
        if (!module) return

        const reorderedQuestions = questionIds
          .map((id) => module.questions.find((q) => q.id === id))
          .filter((q): q is Question => !!q)
          .map((q, index) => ({ ...q, order: index }))

        const updatedOutline: Outline = {
          ...currentOutline,
          updatedAt: new Date().toISOString(),
          modules: currentOutline.modules.map((m) =>
            m.id === moduleId ? { ...m, questions: reorderedQuestions } : m
          ),
        }

        set({ currentOutline: updatedOutline })
      },

      // 添加模块
      addModule: (title) => {
        const { currentOutline } = get()
        if (!currentOutline) return

        const newModule: Module = {
          id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title,
          order: currentOutline.modules.length,
          questions: [],
        }

        const updatedOutline: Outline = {
          ...currentOutline,
          updatedAt: new Date().toISOString(),
          modules: [...currentOutline.modules, newModule],
        }

        set({ currentOutline: updatedOutline })
      },

      // 更新模块
      updateModule: (moduleId, title) => {
        const { currentOutline } = get()
        if (!currentOutline) return

        const updatedOutline: Outline = {
          ...currentOutline,
          updatedAt: new Date().toISOString(),
          modules: currentOutline.modules.map((m) =>
            m.id === moduleId ? { ...m, title } : m
          ),
        }

        set({ currentOutline: updatedOutline })
      },

      // 删除模块
      deleteModule: (moduleId) => {
        const { currentOutline } = get()
        if (!currentOutline) return

        const updatedOutline: Outline = {
          ...currentOutline,
          updatedAt: new Date().toISOString(),
          modules: currentOutline.modules
            .filter((m) => m.id !== moduleId)
            .map((m, index) => ({ ...m, order: index })),
        }

        set({ currentOutline: updatedOutline })
      },

      // 重新排序模块
      reorderModules: (moduleIds) => {
        const { currentOutline } = get()
        if (!currentOutline) return

        const reorderedModules = moduleIds
          .map((id) => currentOutline.modules.find((m) => m.id === id))
          .filter((m): m is Module => !!m)
          .map((m, index) => ({ ...m, order: index }))

        const updatedOutline: Outline = {
          ...currentOutline,
          updatedAt: new Date().toISOString(),
          modules: reorderedModules,
        }

        set({ currentOutline: updatedOutline })
      },

      // 保存到后端
      saveToBackend: async () => {
        const { currentOutline } = get()
        if (!currentOutline) return false

        try {
          const response = await fetch(
            `http://localhost:8000/api/v1/outlines/${currentOutline.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(currentOutline),
            }
          )
          return response.ok
        } catch (error) {
          console.error('保存失败:', error)
          return false
        }
      },

      // 从后端加载
      loadFromBackend: async (outlineId) => {
        set({ isLoading: true })
        try {
          const response = await fetch(
            `http://localhost:8000/api/v1/outlines/${outlineId}`
          )
          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              set({ currentOutline: result.data })
            }
          }
        } catch (error) {
          console.error('加载失败:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      // 从后端获取大纲列表并同步
      syncWithBackend: async () => {
        try {
          const response = await fetch('http://localhost:8000/api/v1/outlines')
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              const backendOutlineIds = new Set(result.data.outlines?.map((o: any) => o.id) || [])
              const { outlineList, currentOutline } = get()
              
              // 过滤掉后端不存在的大纲
              const filteredList = outlineList.filter((o) => backendOutlineIds.has(o.id))
              
              // 如果当前大纲不在后端，也清空
              const filteredCurrent = currentOutline && backendOutlineIds.has(currentOutline.id) 
                ? currentOutline 
                : null
              
              if (filteredList.length !== outlineList.length || filteredCurrent?.id !== currentOutline?.id) {
                console.log('[OutlineStore] 同步后端大纲，过滤掉不存在的大纲')
                set({ 
                  outlineList: filteredList,
                  currentOutline: filteredCurrent 
                })
              }
            } else {
              // 后端没有大纲，清空本地
              console.log('[OutlineStore] 后端没有大纲，清空本地数据')
              set({ outlineList: [], currentOutline: null })
            }
          }
        } catch (error) {
          console.error('同步大纲失败:', error)
        }
      },
    }),
    {
      name: 'outline-storage',
      partialize: (state) => ({
        outlineList: state.outlineList,
        currentOutline: state.currentOutline,
      }),
    }
  )
)
