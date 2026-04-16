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
      <h2 className="text-xl font-bold text-gray-900">Tasks</h2>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="เพิ่มงานใหม่"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-lg bg-white p-3 shadow-sm">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
              />
              <span className={task.completed ? 'line-through text-gray-400' : ''}>{task.title}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default TasksPage