import { useState } from 'react'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { GripVertical, Loader2 } from 'lucide-react'
import { useTaskStore } from '../stores/useTaskStore'
import { useUserStore } from '../stores/useUserStore'
import { useSkillStore } from '../stores/useSkillStore'
import TaskForm from './TaskForm'
import SkillExecutionPopup from './SkillExecutionPopup'

// ── Reflection Bottom Sheet ───────────────────────────────────────────────────
function ReflectionSheet({ task, onSubmit, onClose, isEvaluating }) {
  const [reflection, setReflection] = useState('')
  return (
    <div className="absolute inset-0 z-60 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={!isEvaluating ? onClose : undefined} />
      <div className="relative bg-white rounded-t-4xl px-6 pt-4 pb-10 shadow-2xl max-h-[75vh] flex flex-col">
        <div className="flex justify-center mb-3 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <h3 className="text-center font-bold text-gray-800 text-base mb-1 shrink-0">
          📝 Daily Reflection
        </h3>
        <p className="text-center text-xs text-gray-500 mb-4 shrink-0 pixel-font">
          {task.title}
        </p>
        <div className="overflow-y-auto flex-1 pb-2">
          <textarea
            rows={5}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What did you do? What did you learn? Any obstacles?"
            className="w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-purple-400 resize-none text-sm"
            disabled={isEvaluating}
          />
        </div>
        <button
          onClick={() => onSubmit(reflection)}
          disabled={isEvaluating || !reflection.trim()}
          className="mt-3 w-full rounded-xl border border-purple-300 bg-purple-50 py-3 pixel-font text-[10px] text-purple-800 disabled:opacity-50 shrink-0"
        >
          {isEvaluating ? '🤖 AI is evaluating your progress...' : 'Submit Reflection'}
        </button>
        {!isEvaluating && (
          <button onClick={onClose} className="mt-2 w-full text-gray-400 text-sm py-1 shrink-0">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export default function TaskPanel({ onClose, initialView = 'list' }) {
  const { tasks, addTask, updateTask, toggleTask, removeTask, reorderTasks, applySkillToTask } = useTaskStore()
  const { addCoins, evaluateAndCompleteTask, generateAIDailyTask, activeMasteryBlockId } = useUserStore()
  const [view, setView] = useState(initialView)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editInitialValues, setEditInitialValues] = useState({})
  const [isAutoGenerating, setIsAutoGenerating] = useState(false)
  const [autoGenError, setAutoGenError] = useState('')
  // Skill execution popup state
  const [skillTask, setSkillTask] = useState(null)

  // Reflection sheet state
  const [reflectionTask, setReflectionTask] = useState(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState(null) // { note, gainedPercent }

  function openCreate() {
    setEditingTaskId(null)
    setEditInitialValues({})
    setView('form')
  }

  function openEdit(task) {
    setEditingTaskId(task.id)
    setEditInitialValues({
      title: task.title,
      type: task.type,
      timeMinutes: task.timeMinutes,
      deadline: task.deadline || '',
      description: task.description || '',
      scheduledDate: task.scheduledDate || null,
    })
    setView('form')
  }

  // Receives the complete validated payload from TaskForm
  function handleSaveTask(payload) {
    if (editingTaskId) {
      updateTask(editingTaskId, payload)
    } else {
      addTask(payload)
    }
    setView('list')
  }

  function handleToggle(task) {
    // If a skill is active on this task, open execution popup instead
    if (task.assignedSkill && !task.completed) {
      setSkillTask(task)
      return
    }
    if (!task.completed) {
      // AI-generated tasks require a reflection before completing
      if (task.isAIGenerated) {
        setReflectionTask(task)
        return
      }
      const { equippedPassiveSkill } = useSkillStore.getState()
      const sparkBonus = equippedPassiveSkill === 'spark' ? 2 : 0
      addCoins((task.rewardCoins || 10) + sparkBonus)
    }
    toggleTask(task.id)
  }

  async function handleReflectionSubmit(reflection) {
    if (!reflectionTask) return
    setIsEvaluating(true)
    try {
      const result = await evaluateAndCompleteTask(reflectionTask, reflection)
      setEvalResult(result)
      // Award coins
      const { equippedPassiveSkill } = useSkillStore.getState()
      const sparkBonus = equippedPassiveSkill === 'spark' ? 2 : 0
      addCoins((reflectionTask.rewardCoins || 15) + sparkBonus)
      toggleTask(reflectionTask.id)
    } catch (err) {
      console.error('Evaluation failed:', err)
      // Fallback: just complete the task
      addCoins(reflectionTask.rewardCoins || 15)
      toggleTask(reflectionTask.id)
    } finally {
      setIsEvaluating(false)
      setReflectionTask(null)
    }
  }

  async function handleAutoGenerate() {
    if (!activeMasteryBlockId) {
      setAutoGenError('No focus block pinned. Pin a block (📌) in your Profile first.')
      setTimeout(() => setAutoGenError(''), 4000)
      return
    }
    setIsAutoGenerating(true)
    setAutoGenError('')
    try {
      const newTask = await generateAIDailyTask()
      addTask(newTask)
    } catch (err) {
      console.error('Auto-generate failed:', err)
      setAutoGenError(err.message || 'AI generation failed. Please try again.')
      setTimeout(() => setAutoGenError(''), 5000)
    } finally {
      setIsAutoGenerating(false)
    }
  }

  // Pending tasks keep their manual order; completed tasks sink to the bottom
  const pendingTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)
  const sortedTasks = [...pendingTasks, ...completedTasks]

  function handleDragEnd(result) {
    if (!result.destination) return
    const srcIdx = result.source.index
    const dstIdx = result.destination.index
    if (srcIdx === dstIdx) return

    // Reorder within the full sorted list, then persist
    const reordered = Array.from(sortedTasks)
    const [moved] = reordered.splice(srcIdx, 1)
    reordered.splice(dstIdx, 0, moved)
    reorderTasks(reordered)
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden"
      style={{ top: '10%' }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden min-h-[74vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="pixel-font text-[12px] text-gray-800">
              {view === 'list' ? 'Task List' : editingTaskId ? 'Edit Task' : 'Create Task'}
            </h2>
            <div className="flex items-center gap-2">
              {view === 'form' && (
                <button
                  onClick={() => setView('list')}
                  className="text-sm rounded-xl px-3 py-1.5 bg-gray-100 text-gray-600"
                >
                  Back
                </button>
              )}
              <button onClick={onClose} className="text-gray-400 text-xl leading-none">x</button>
            </div>
          </div>

          {view === 'list' ? (
            <TaskListView
              tasks={sortedTasks}
              onToggle={handleToggle}
              onEdit={openEdit}
              onRemove={removeTask}
              onCreate={openCreate}
              onSkill={(task) => {
                const { equippedActiveSkill } = useSkillStore.getState()
                if (!equippedActiveSkill || task.completed) return
                const timerEnd = equippedActiveSkill === 'capsule' ? Date.now() + 30 * 60 * 1000 : null
                applySkillToTask(task.id, equippedActiveSkill, timerEnd)
                setSkillTask({ ...task, assignedSkill: equippedActiveSkill, timerEnd })
              }}
              onDragEnd={handleDragEnd}
              onAutoGenerate={handleAutoGenerate}
              isAutoGenerating={isAutoGenerating}
              autoGenError={autoGenError}
            />
          ) : (
            <TaskForm
              initialValues={editInitialValues}
              onSave={handleSaveTask}
              onCancel={() => setView('list')}
            />
          )}
        </div>
      </div>

      {/* ── Skill Execution Popup ── */}
      {skillTask && (
        <SkillExecutionPopup
          task={tasks.find((t) => t.id === skillTask.id) ?? skillTask}
          onClose={() => setSkillTask(null)}
        />
      )}

      {/* ── Reflection Sheet (AI tasks) ── */}
      {reflectionTask && (
        <ReflectionSheet
          task={reflectionTask}
          onSubmit={handleReflectionSubmit}
          onClose={() => setReflectionTask(null)}
          isEvaluating={isEvaluating}
        />
      )}

      {/* ── AI Eval Result toast ── */}
      {evalResult && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/40 p-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="pixel-font text-[10px] text-purple-700 mb-3">AI Progress Report</p>
            <p className="text-sm text-gray-700 mb-3">{evalResult.note}</p>
            <p className="pixel-font text-[9px] text-green-600 mb-4">+{evalResult.gainedPercent}% Journey Progress</p>
            <button
              onClick={() => setEvalResult(null)}
              className="w-full rounded-xl bg-purple-500 text-white py-2 text-sm font-medium"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskListView({ tasks, onToggle, onEdit, onRemove, onCreate, onSkill, onDragEnd, onAutoGenerate, isAutoGenerating, autoGenError }) {
  const equippedActiveSkill = useSkillStore((s) => s.equippedActiveSkill)
  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="task-list">
          {(droppableProvided) => (
            <div
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              className="flex-1 overflow-y-auto"
            >
              {tasks.length === 0 && (
                <div className="px-6 pt-20 text-center text-gray-400">
                  <p className="pixel-font text-[10px]">No tasks yet</p>
                  <p className="text-sm mt-2">Tap + to create your first task</p>
                </div>
              )}

              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center gap-3 px-4 py-4 border-b transition-shadow ${
                        snapshot.isDragging
                          ? 'shadow-xl scale-[1.02] bg-white/95 backdrop-blur-sm z-50 rounded-xl border-transparent'
                          : task.assignedSkill === 'ignite' && !task.completed
                          ? 'border-orange-300 bg-orange-50 shadow-[0_0_8px_2px_rgba(251,146,60,0.3)]'
                          : task.assignedSkill === 'capsule' && !task.completed
                          ? 'border-sky-300 bg-sky-50 shadow-[0_0_8px_2px_rgba(56,189,248,0.3)]'
                          : task.isAIGenerated && !task.completed
                          ? 'border-gray-200 bg-purple-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Drag handle */}
                      <span
                        {...provided.dragHandleProps}
                        className="shrink-0 text-gray-300 cursor-grab active:cursor-grabbing touch-none"
                        aria-label="Drag to reorder"
                      >
                        <GripVertical size={18} />
                      </span>

                      {/* Checkbox */}
                      <button
                        onClick={() => onToggle(task)}
                        className={`w-10 h-10 rounded-xl border-[3px] flex items-center justify-center shrink-0
                          ${task.completed ? 'bg-black border-black text-white' : 'border-black text-transparent'}`}
                      >
                        ✓
                      </button>

                      {/* Task info */}
                      <button onClick={() => onEdit(task)} className="flex-1 text-left">
                        <p className={`pixel-font text-[11px] ${task.completed ? 'line-through text-gray-400' : 'text-black'}`}>
                          {task.isAIGenerated && !task.completed && <span className="mr-1">✨</span>}
                          {task.assignedSkill === 'ignite' && !task.completed && <span className="mr-1">🚀</span>}
                          {task.assignedSkill === 'capsule' && !task.completed && <span className="mr-1">⏳</span>}
                          #{index + 1} | {task.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {task.type} - {task.timeMinutes} min - {task.rewardCoins} coins
                        </p>
                      </button>

                      {/* Skill trigger button (only when an active skill is equipped and task not completed) */}
                      {equippedActiveSkill && !task.completed && (
                        <button
                          onClick={() => onSkill?.(task)}
                          className={`text-xl leading-none px-1 active:scale-95 transition-transform ${
                            task.assignedSkill ? 'opacity-40' : ''
                          }`}
                          title={task.assignedSkill ? 'Skill already active' : `Apply ${equippedActiveSkill}`}
                          aria-label="Apply skill to task"
                          disabled={!!task.assignedSkill}
                        >
                          {equippedActiveSkill === 'ignite' ? '🚀' : '⏳'}
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => onEdit(task)}
                        className="text-2xl leading-none text-black px-2"
                        aria-label="Edit task"
                      >
                        ≡
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onRemove(task.id)}
                        className="text-gray-300 hover:text-red-400 px-1"
                        aria-label="Delete task"
                      >
                        x
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="border-t border-gray-200 px-5 py-4 space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={onAutoGenerate}
            disabled={isAutoGenerating}
            className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-2xl px-4 py-2.5 active:scale-95 transition-transform disabled:opacity-60"
          >
            {isAutoGenerating ? (
              <Loader2 size={13} className="animate-spin text-purple-500" />
            ) : (
              <span>✨</span>
            )}
            <span className="pixel-font text-[9px] text-purple-700">
              {isAutoGenerating ? 'Generating...' : "Today's Mastery Task"}
            </span>
          </button>
          <button
            onClick={onCreate}
            className="w-14 h-14 rounded-full border-[3px] border-black text-4xl leading-none bg-white shadow-sm"
            aria-label="Create task"
          >
            +
          </button>
        </div>
        {autoGenError && (
          <p className="pixel-font text-[8px] text-red-500 bg-red-50 rounded-xl px-3 py-1.5">{autoGenError}</p>
        )}
      </div>
    </>
  )
}


