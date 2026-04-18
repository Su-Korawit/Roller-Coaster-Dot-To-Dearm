import { useState } from 'react'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { GripVertical } from 'lucide-react'
import { useTaskStore } from '../stores/useTaskStore'
import { useUserStore } from '../stores/useUserStore'
import { useSkillStore } from '../stores/useSkillStore'

export default function TaskPanel({ onClose, initialView = 'list' }) {
  const { tasks, addTask, updateTask, toggleTask, removeTask, reorderTasks } = useTaskStore()
  const { addCoins } = useUserStore()
  const [view, setView] = useState(initialView)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [form, setForm] = useState({
    title: '',
    type: 'General',
    timeMinutes: 45,
    rewardCoins: 10,
    description: '',
  })

  function openCreate() {
    setEditingTaskId(null)
    setForm({
      title: '',
      type: 'General',
      timeMinutes: 45,
      rewardCoins: 10,
      description: '',
    })
    setView('form')
  }

  function openEdit(task) {
    setEditingTaskId(task.id)
    setForm({
      title: task.title,
      type: task.type,
      timeMinutes: task.timeMinutes,
      rewardCoins: task.rewardCoins,
      description: task.description || '',
    })
    setView('form')
  }

  function handleSaveTask() {
    const title = form.title.trim()
    if (!title) return

    const payload = {
      title,
      type: form.type || 'General',
      timeMinutes: Number(form.timeMinutes) || 45,
      rewardCoins: Number(form.rewardCoins) || 10,
      description: form.description.trim(),
    }

    if (editingTaskId) {
      updateTask(editingTaskId, payload)
    } else {
      addTask(payload)
    }

    setView('list')
  }

  function handleToggle(task) {
    if (!task.completed) {
      const { equippedPassiveSkill } = useSkillStore.getState()
      const sparkBonus = equippedPassiveSkill === 'spark' ? 2 : 0
      addCoins((task.rewardCoins || 10) + sparkBonus)
    }
    toggleTask(task.id)
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
              onDragEnd={handleDragEnd}
            />
          ) : (
            <TaskFormView
              form={form}
              setForm={setForm}
              onSave={handleSaveTask}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function TaskListView({ tasks, onToggle, onEdit, onRemove, onCreate, onDragEnd }) {
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
                      className={`flex items-center gap-3 px-4 py-4 border-b border-gray-200 transition-shadow ${
                        snapshot.isDragging
                          ? 'shadow-xl scale-[1.02] bg-white/95 backdrop-blur-sm z-50 rounded-xl'
                          : 'bg-white'
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
                          #{index + 1} | {task.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {task.type} - {task.timeMinutes} min - {task.rewardCoins} coins
                        </p>
                      </button>

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

      <div className="border-t border-gray-200 px-5 py-4 flex items-center justify-between">
        <p className="pixel-font text-[9px] text-gray-500">Click task row to edit · drag ⠿ to reorder</p>
        <button
          onClick={onCreate}
          className="w-14 h-14 rounded-full border-[3px] border-black text-4xl leading-none bg-white shadow-sm"
          aria-label="Create task"
        >
          +
        </button>
      </div>
    </>
  )
}

function TaskFormView({ form, setForm, onSave }) {
  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      <div className="space-y-4">
        <label className="block">
          <span className="pixel-font text-[9px] text-gray-600">Task Name</span>
          <input
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="#1 | Hackathon"
            className="mt-2 w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-gray-400"
          />
        </label>

        <label className="block">
          <span className="pixel-font text-[9px] text-gray-600">Type</span>
          <input
            value={form.type}
            onChange={(e) => updateField('type', e.target.value)}
            placeholder="Competition / Study / Project"
            className="mt-2 w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-gray-400"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="pixel-font text-[9px] text-gray-600">Time (min)</span>
            <input
              type="number"
              min="5"
              step="5"
              value={form.timeMinutes}
              onChange={(e) => updateField('timeMinutes', e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-gray-400"
            />
          </label>

          <label className="block">
            <span className="pixel-font text-[9px] text-gray-600">Reward Coins</span>
            <input
              type="number"
              min="1"
              value={form.rewardCoins}
              onChange={(e) => updateField('rewardCoins', e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-gray-400"
            />
          </label>
        </div>

        <label className="block">
          <span className="pixel-font text-[9px] text-gray-600">Detail</span>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Additional detail..."
            className="mt-2 w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-gray-400 resize-none"
          />
        </label>
      </div>

      <button
        onClick={onSave}
        className="mt-6 w-full rounded-xl border border-gray-300 shadow-sm bg-white py-3 pixel-font text-[10px] text-gray-800"
      >
        Save Task
      </button>
    </div>
  )
}
