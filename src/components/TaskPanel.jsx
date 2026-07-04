import { useEffect, useState } from 'react'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { GripVertical, Loader2, Share2, Trash, Trash2 } from 'lucide-react'
import { updateDoc } from 'firebase/firestore'
import { refs } from '../lib/db'
import { useAuthStore } from '../stores/useAuthStore'
import { useChatStore } from '../stores/useChatStore'
import { useTaskStore } from '../stores/useTaskStore'
import { useUserStore } from '../stores/useUserStore'
import { useSkillStore } from '../stores/useSkillStore'
import { generateAIDailyTask, evaluateAndCompleteTask } from '../services/aiTasks'
import TaskForm from './TaskForm'
import SkillExecutionPopup from './SkillExecutionPopup'

// ─── Shared-task ref helpers (localStorage) ───────────────────────────────────
// Track which Firestore message docs contain each task so we can sync status.
function getSharedRefs() {
  try { return JSON.parse(localStorage.getItem('rc-shared-task-refs') || '{}') } catch { return {} }
}
function addSharedRef(taskId, chatId, msgId) {
  const refs = getSharedRefs()
  refs[taskId] = [...(refs[taskId] ?? []), { chatId, msgId }]
  localStorage.setItem('rc-shared-task-refs', JSON.stringify(refs))
}
async function syncSharedTaskStatus(taskId) {
  const sharedRefs = getSharedRefs()[taskId] ?? []
  for (const { chatId, msgId } of sharedRefs) {
    try {
      await updateDoc(refs.chatMessage(chatId, msgId), {
        'taskSnapshot.status': 'completed',
      })
    } catch (e) {
      console.warn('[syncSharedTask]', e.message)
    }
  }
}

// ─── TaskShareSheet ───────────────────────────────────────────────────────────
function TaskShareSheet({ task, onClose }) {
  const user = useAuthStore((s) => s.user)
  const chats = useChatStore((s) => s.chats)
  const loadChats = useChatStore((s) => s.loadChats)
  const participants = useChatStore((s) => s.participants)
  const [sending, setSending] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    const unsub = loadChats(user.uid)
    return () => unsub?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    const needed = [
      ...new Set(chats.flatMap((c) => c.members?.filter((uid) => uid !== user.uid) ?? [])),
    ]
    useChatStore.getState().resolveParticipants(needed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, user?.uid])

  async function handleSend(chat) {
    const uid = user?.uid
    if (!uid || sending) return
    setSending(chat.id)
    try {
      const msgId = await useChatStore.getState().sendTaskShare(chat.id, uid, task, user.displayName)
      addSharedRef(task.id, chat.id, msgId)
      onClose()
    } catch (e) {
      console.error('[TaskShare] send failed:', e)
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="absolute inset-0 z-60 flex flex-col justify-end" onClick={onClose}>
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl md:max-w-lg md:mx-auto"
        style={{ paddingBottom: '80px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-3">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <p className="pixel-font text-[9px] text-center text-gray-700 mb-1 px-5">ส่ง Task ให้เพื่อน</p>
        <p
          className="text-center text-gray-500 mb-4 px-6 truncate"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}
        >
          📋 {task.title}
        </p>
        {chats.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 opacity-50">
            <span className="text-3xl">💬</span>
            <p className="pixel-font text-[7px] text-gray-400 text-center leading-relaxed">ยังไม่มีการสนทนา</p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto">
            {chats.map((chat) => {
              const otherUid = chat.members?.find((uid) => uid !== user?.uid)
              const other = participants[otherUid]
              return (
                <button
                  key={chat.id}
                  onClick={() => handleSend(chat)}
                  disabled={!!sending}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 border border-gray-200">
                    {other?.photoURL
                      ? <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
                      : <span className="text-base">🎮</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="pixel-font text-[8px] text-gray-800 truncate">
                      {other?.displayName ?? '...'}
                    </p>
                    <p className="text-gray-400 truncate mt-0.5" style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}>
                      {chat.lastMessage || 'เริ่มการสนทนา'}
                    </p>
                  </div>
                  {sending === chat.id
                    ? <Loader2 size={14} className="text-purple-400 animate-spin shrink-0" />
                    : <span className="thai-font text-xs text-brand shrink-0">ส่ง</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Reflection Bottom Sheet ───────────────────────────────────────────────────
function ReflectionSheet({ task, onSubmit, onClose, isEvaluating }) {
  const [reflection, setReflection] = useState('')
  return (
    <div className="absolute inset-0 z-60 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={!isEvaluating ? onClose : undefined} />
      <div className="relative bg-white rounded-t-4xl px-6 pt-4 pb-10 shadow-2xl max-h-[75vh] flex flex-col md:max-w-lg md:mx-auto md:w-full">
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
  const tasks = useTaskStore((s) => s.tasks)
  const addTask = useTaskStore((s) => s.addTask)
  const updateTask = useTaskStore((s) => s.updateTask)
  const toggleTask = useTaskStore((s) => s.toggleTask)
  const trashTask = useTaskStore((s) => s.trashTask)
  const restoreTask = useTaskStore((s) => s.restoreTask)
  const purgeTask = useTaskStore((s) => s.purgeTask)
  const emptyTrash = useTaskStore((s) => s.emptyTrash)
  const reorderTasks = useTaskStore((s) => s.reorderTasks)
  const applySkillToTask = useTaskStore((s) => s.applySkillToTask)
  const trash = useTaskStore((s) => s.trash)
  const addCoins = useUserStore((s) => s.addCoins)
  const activeMasteryBlockId = useUserStore((s) => s.activeMasteryBlockId)
  const journeys = useUserStore((s) => s.journeys)
  const aiLanguage = useUserStore((s) => s.aiLanguage)
  const updateJourneyProgress = useUserStore((s) => s.updateJourneyProgress)
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
  // Share sheet state
  const [sharingTask, setSharingTask] = useState(null)
  // Undo-delete state
  const [deletedTask, setDeletedTask] = useState(null)
  const [deleteTimerId, setDeleteTimerId] = useState(null)

  function handleRemove(task) {
    if (deleteTimerId) clearTimeout(deleteTimerId)
    trashTask(task)
    setDeletedTask(task)
    const id = setTimeout(() => {
      setDeletedTask(null)
      setDeleteTimerId(null)
    }, 4000)
    setDeleteTimerId(id)
  }

  function handleUndoDelete() {
    if (!deletedTask) return
    clearTimeout(deleteTimerId)
    restoreTask(deletedTask.id)
    setDeletedTask(null)
    setDeleteTimerId(null)
  }

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
      const { passiveSlots } = useSkillStore.getState()
      const sparkBonus = passiveSlots.some((s) => s.equippedSkillId === 'spark') ? 2 : 0
      addCoins((task.rewardCoins || 10) + sparkBonus)
    }
    toggleTask(task.id)
    // Sync status to any Firestore messages that shared this task
    if (!task.completed) syncSharedTaskStatus(task.id)
  }

  async function handleReflectionSubmit(reflection) {
    if (!reflectionTask) return
    setIsEvaluating(true)
    try {
      const result = await evaluateAndCompleteTask(reflectionTask, reflection, { aiLanguage })
      if (reflectionTask.linkedJourneyKey && reflectionTask.linkedJourneyId) {
        updateJourneyProgress(reflectionTask.linkedJourneyKey, reflectionTask.linkedJourneyId, result.note, result.gainedPercent)
      }
      setEvalResult(result)
      // Award coins
      const { passiveSlots } = useSkillStore.getState()
      const sparkBonus = passiveSlots.some((s) => s.equippedSkillId === 'spark') ? 2 : 0
      addCoins((reflectionTask.rewardCoins || 15) + sparkBonus)
      toggleTask(reflectionTask.id)
      syncSharedTaskStatus(reflectionTask.id)
    } catch (err) {
      console.error('Evaluation failed:', err)
      // Fallback: just complete the task
      addCoins(reflectionTask.rewardCoins || 15)
      toggleTask(reflectionTask.id)
      syncSharedTaskStatus(reflectionTask.id)
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
      const newTask = await generateAIDailyTask({ activeMasteryBlockId, journeys, aiLanguage })
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
      className="absolute inset-0 z-50 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden md:max-w-2xl md:mx-auto lg:max-w-3xl"
      style={{ top: '10%' }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden h-[82vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="pixel-font text-[12px] text-gray-800">
              {view === 'list' ? 'Task List'
                : view === 'trash' ? 'Trash'
                : editingTaskId ? 'Edit Task'
                : 'Create Task'}
            </h2>
            <div className="flex items-center gap-2">
              {view === 'list' && (
                <button
                  onClick={() => setView('trash')}
                  className="relative text-gray-400 hover:text-gray-700 p-1"
                  aria-label="Trash"
                >
                  <Trash size={16} />
                  {trash.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-400 pixel-font text-[7px] text-white flex items-center justify-center leading-none">
                      {trash.length > 9 ? '9+' : trash.length}
                    </span>
                  )}
                </button>
              )}
              {(view === 'form' || view === 'trash') && (
                <button
                  onClick={() => setView('list')}
                  className="text-sm rounded-xl px-3 py-1.5 bg-gray-100 text-gray-600"
                >
                  Back
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="ปิด"
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span aria-hidden="true" className="text-base leading-none">✕</span>
              </button>
            </div>
          </div>

          {view === 'list' ? (
            <TaskListView
              tasks={sortedTasks}
              onToggle={handleToggle}
              onEdit={openEdit}
              onRemove={handleRemove}
              onCreate={openCreate}
              onShare={setSharingTask}
              onSkill={(task) => {
                const { equippedActive } = useSkillStore.getState()
                const skillId = equippedActive.find((id) => id === 'capsule') ?? equippedActive[0]
                if (!skillId || task.completed) return
                const timerEnd = skillId === 'capsule' ? Date.now() + 30 * 60 * 1000 : null
                applySkillToTask(task.id, skillId, timerEnd)
                setSkillTask({ ...task, assignedSkill: skillId, timerEnd })
              }}
              onDragEnd={handleDragEnd}
              onAutoGenerate={handleAutoGenerate}
              isAutoGenerating={isAutoGenerating}
              autoGenError={autoGenError}
            />
          ) : view === 'trash' ? (
            <TrashView
              trash={trash}
              onRestore={restoreTask}
              onPurge={purgeTask}
              onEmpty={emptyTrash}
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

      {/* ── Task Share Sheet ── */}
      {sharingTask && (
        <TaskShareSheet task={sharingTask} onClose={() => setSharingTask(null)} />
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

      {/* ── Undo-delete toast ── */}
      {deletedTask && (
        <div className="absolute bottom-4 left-4 right-4 z-70 flex items-center justify-between bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-xl">
          <span className="pixel-font text-[9px] opacity-80 truncate mr-3">
            Deleted: {deletedTask.title}
          </span>
          <button
            onClick={handleUndoDelete}
            className="pixel-font text-[9px] text-purple-300 shrink-0 active:opacity-70"
          >
            Undo
          </button>
        </div>
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

function TaskListView({ tasks, onToggle, onEdit, onRemove, onCreate, onShare, onDragEnd, onAutoGenerate, isAutoGenerating, autoGenError }) {
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
                      className={`flex flex-col gap-1.5 px-4 py-3 border-b transition-shadow ${
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
                      {/* ── Top row: checkbox · content · drag handle ── */}
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => onToggle(task)}
                          className={`w-10 h-10 rounded-xl border-[3px] flex items-center justify-center shrink-0
                            ${task.completed ? 'bg-black border-black text-white' : 'border-black text-transparent'}`}
                        >
                          ✓
                        </button>

                        {/* Task info (tap to edit) */}
                        <button onClick={() => onEdit(task)} className="flex-1 min-w-0 text-left">
                          <p className={`pixel-font text-[11px] line-clamp-2 ${task.completed ? 'line-through text-gray-400' : 'text-black'}`}>
                            {task.isAIGenerated && !task.completed && <span className="mr-1">✨</span>}
                            {task.assignedSkill === 'ignite' && !task.completed && <span className="mr-1">🚀</span>}
                            {task.assignedSkill === 'capsule' && !task.completed && <span className="mr-1">⏳</span>}
                            #{index + 1} | {task.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {task.type} - {task.timeMinutes} min - {task.rewardCoins} coins
                          </p>
                        </button>

                        {/* Drag handle */}
                        <span
                          {...provided.dragHandleProps}
                          className="shrink-0 text-gray-300 cursor-grab active:cursor-grabbing touch-none"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical size={18} />
                        </span>
                      </div>

                      {/* ── Bottom row: secondary actions ── */}
                      <div className="flex items-center justify-end gap-3">
                        {/* Share */}
                        <button
                          onClick={() => onShare?.(task)}
                          className="text-gray-300 hover:text-purple-400 active:scale-95 transition-transform"
                          aria-label="Share task to chat"
                        >
                          <Share2 size={15} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onRemove(task)}
                          className="text-gray-300 hover:text-red-400 active:scale-95 transition-transform"
                          aria-label="Delete task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="border-t border-gray-200 px-5 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onAutoGenerate}
            disabled={isAutoGenerating}
            className="flex-1 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-2xl px-4 py-2.5 active:scale-95 transition-transform disabled:opacity-60"
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
            className="w-10 h-10 rounded-full border-2 border-black text-2xl leading-none bg-white shadow-sm shrink-0 flex items-center justify-center"
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

function TrashView({ trash, onRestore, onPurge, onEmpty }) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0">
        {trash.length === 0 ? (
          <div className="px-6 pt-20 text-center text-gray-400">
            <p className="text-3xl mb-3">🗑️</p>
            <p className="pixel-font text-[10px]">Trash is empty</p>
          </div>
        ) : (
          trash.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="pixel-font text-[11px] text-gray-400 line-through truncate">
                  {task.title}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {task.type} - {task.timeMinutes} min
                </p>
              </div>
              <button
                onClick={() => onRestore(task.id)}
                className="pixel-font text-[9px] text-purple-500 shrink-0 px-2 py-1 rounded-lg hover:bg-purple-50 active:scale-95 transition-all"
              >
                Restore
              </button>
              <button
                onClick={() => onPurge(task.id)}
                className="text-gray-300 hover:text-red-400 shrink-0 active:scale-95 transition-transform"
                aria-label="Delete permanently"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {trash.length > 0 && (
        <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-white">
          <button
            onClick={onEmpty}
            className="w-full rounded-xl border border-red-200 py-2.5 pixel-font text-[9px] text-red-400 hover:bg-red-50 active:scale-95 transition-all"
          >
            Empty Trash ({trash.length})
          </button>
        </div>
      )}
    </div>
  )
}
