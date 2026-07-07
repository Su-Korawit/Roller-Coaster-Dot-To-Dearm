import { useState } from 'react'
import { useTaskStore } from '../stores/useTaskStore'

function TasksPage() {
  const [title, setTitle] = useState('')
  const tasks = useTaskStore((state) => state.tasks)
  const addTask = useTaskStore((state) => state.addTask)
  const toggleTask = useTaskStore((state) => state.toggleTask)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!title.trim()) return
    addTask(title)
    setTitle('')
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-ink">Tasks</h2>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="เพิ่มงานใหม่"
          className="neo-input thai-font flex-1 px-3 py-2 text-sm"
        />
        <button type="submit" className="neo-btn rounded-lg bg-brand-strong px-4 py-2 text-sm font-semibold text-white">
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="neo-card rounded-lg p-3">
            <label className="flex items-center gap-2 text-sm text-ink thai-font">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
              />
              <span className={task.completed ? 'line-through text-ink-soft' : ''}>{task.title}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default TasksPage
