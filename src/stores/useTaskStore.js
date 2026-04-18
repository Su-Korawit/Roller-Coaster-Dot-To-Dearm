import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? normalizeTask({ ...task, completed: !task.completed, updatedAt: Date.now() })
              : normalizeTask(task),
          ),
        })),
      removeTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
        })),
      reorderTasks: (newOrder) => set({ tasks: newOrder }),
      clearTasks: () => set({ tasks: [] }),
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