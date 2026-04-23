import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUserStore } from './useUserStore'

const DEFAULT_TASK = {
  type: 'General',
  timeMinutes: 45,
  rewardCoins: 10,
  description: '',
}

function normalizeTask(task) {
  return {
    id: task.id || crypto.randomUUID(),
    title: task.title || 'Untitled Task',
    type: task.type || DEFAULT_TASK.type,
    timeMinutes: Number.isFinite(task.timeMinutes) ? task.timeMinutes : DEFAULT_TASK.timeMinutes,
    rewardCoins: Number.isFinite(task.rewardCoins) ? task.rewardCoins : DEFAULT_TASK.rewardCoins,
    description: typeof task.description === 'string' ? task.description : DEFAULT_TASK.description,
    completed: Boolean(task.completed),
    createdAt: task.createdAt || Date.now(),
    updatedAt: task.updatedAt || null,
    // AI-generated task fields (preserved if present)
    isAIGenerated: task.isAIGenerated || false,
    linkedJourneyKey: task.linkedJourneyKey || null,
    linkedJourneyId: task.linkedJourneyId || null,
    estimatedProgress: task.estimatedProgress ?? null,
    // Calendar scheduling — 'YYYY-MM-DD' string or null
    scheduledDate: typeof task.scheduledDate === 'string' ? task.scheduledDate : null,
    // Active skill assignment — one skill per task at a time
    assignedSkill: typeof task.assignedSkill === 'string' ? task.assignedSkill : null,
    // Unix ms timestamp when the skill timer expires (Capsule), or null
    timerEnd: typeof task.timerEnd === 'number' ? task.timerEnd : null,
  }
}

export const useTaskStore = create(
  persist(
    (set) => ({
      tasks: [],
      addTask: (taskInput) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            normalizeTask(
              typeof taskInput === 'string' ? { title: taskInput } : taskInput,
            ),
          ],
        })),
      updateTask: (taskId, patch) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? normalizeTask({ ...task, ...patch, updatedAt: Date.now() })
              : normalizeTask(task),
          ),
        })),
      toggleTask: (taskId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          // Only count completing a task (not un-completing it)
          if (task && !task.completed) {
            useUserStore.getState().incrementStacks()
          }
          return {
            tasks: state.tasks.map((t) =>
              t.id === taskId
                ? normalizeTask({ ...t, completed: !t.completed, updatedAt: Date.now() })
                : normalizeTask(t),
            ),
          }
        }),
      removeTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
        })),
      reorderTasks: (newOrder) => set({ tasks: newOrder }),
      clearTasks: () => set({ tasks: [] }),
      // Assign an active skill to a specific task (one skill per task)
      applySkillToTask: (taskId, skillId, timerEnd = null) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? normalizeTask({ ...t, assignedSkill: skillId, timerEnd, updatedAt: Date.now() })
              : normalizeTask(t),
          ),
        })),
      // Remove skill assignment from a task
      clearSkillFromTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? normalizeTask({ ...t, assignedSkill: null, timerEnd: null, updatedAt: Date.now() })
              : normalizeTask(t),
          ),
        })),
    }),
    {
      name: 'rc-task-store',
      merge: (persistedState, currentState) => {
        const incomingTasks = persistedState?.tasks || []

        return {
          ...currentState,
          ...persistedState,
          tasks: incomingTasks.map(normalizeTask),
        }
      },
    },
  ),
)