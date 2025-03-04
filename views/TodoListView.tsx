// views/TodoListView.tsx
import React, { useEffect, useState } from 'react'

interface TodoItem {
  id: number
  text: string
  completed: boolean
}

// Adjust if needed for your Python backend
const BACKEND_URL = 'http://localhost:5000'

/**
 * A simple to-do list that fetches data from a separate Python backend.
 */
const TodoListView: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [inputValue, setInputValue] = useState('')
  const [filter, setFilter] = useState<'all' | 'incomplete'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTodos()
  }, [])

  async function loadTodos() {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`${BACKEND_URL}/api/todos`)
      const data = await resp.json()
      if (data.success) {
        setTodos(data.data)
      } else {
        setError(data.error || 'Failed to load todos')
      }
    } catch (err) {
      console.error('Error fetching todos:', err)
      setError('Error fetching todos')
    } finally {
      setLoading(false)
    }
  }

  async function addTodo() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    setError(null)
    try {
      const resp = await fetch(`${BACKEND_URL}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed })
      })
      const data = await resp.json()
      if (data.success) {
        setTodos(prev => [...prev, data.data])
        setInputValue('')
      } else {
        setError(data.error || 'Failed to add todo')
      }
    } catch (err) {
      console.error('Error adding todo:', err)
      setError('Error adding todo')
    }
  }

  async function toggleComplete(id: number, currentStatus: boolean) {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentStatus })
      })
      const data = await resp.json()
      if (data.success) {
        setTodos(prev =>
          prev.map(t => (t.id === id ? { ...t, completed: !currentStatus } : t))
        )
      } else {
        setError(data.error || 'Failed to update task status')
      }
    } catch (err) {
      console.error('Error toggling todo:', err)
      setError('Failed to update task status')
    }
  }

  async function deleteTodo(id: number) {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/todos/${id}`, {
        method: 'DELETE'
      })
      const data = await resp.json()
      if (data.success) {
        setTodos(prev => prev.filter(t => t.id !== id))
      } else {
        setError(data.error || 'Failed to delete todo')
      }
    } catch (err) {
      console.error('Error deleting todo:', err)
      setError('Error deleting todo')
    }
  }

  // Filtered list
  const filteredTodos = todos.filter(todo => {
    if (filter === 'incomplete') return !todo.completed
    return true
  })

  return (
    <div className="text-sm text-gray-800 dark:text-gray-100 space-y-3">
      {/* Error banner */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 bg-opacity-70 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-100 p-2 rounded">
          {error}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Add a new task..."
          className={`
            flex-1 p-2 rounded focus:outline-none
            bg-gray-50 dark:bg-[#1e1f29]
            border border-gray-300 dark:border-[#3f4257]
            text-gray-800 dark:text-gray-100
            focus:ring-1 focus:ring-blue-400 dark:focus:ring-[#7b93fd]
          `}
        />
        <button
          onClick={addTodo}
          className={`
            px-3 py-1 rounded font-medium
            bg-green-400 hover:bg-green-500 text-gray-800
            dark:bg-[#50fa7b] dark:hover:bg-[#7b93fd] dark:text-[#1e1f29]
          `}
        >
          Add
        </button>
      </div>

      {/* Filter toggles */}
      <div className="flex items-center gap-4">
        <label className="text-gray-600 dark:text-gray-300 text-sm">Filter:</label>
        <select
          className={`
            rounded px-2 py-1
            bg-gray-50 dark:bg-[#1e1f29]
            border border-gray-300 dark:border-[#3f4257]
            text-gray-800 dark:text-gray-100
            focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-[#7b93fd]
          `}
          value={filter}
          onChange={e => setFilter(e.target.value as 'all' | 'incomplete')}
        >
          <option value="all">All Tasks</option>
          <option value="incomplete">Incomplete Only</option>
        </select>
      </div>

      {/* Loading state */}
      {loading && <p className="text-gray-500 dark:text-gray-400">Loading tasks...</p>}

      {/* Todos list */}
      {filteredTodos.length === 0 && !loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No tasks found.</p>
      ) : (
        <ul className="space-y-1">
          {filteredTodos.map(todo => (
            <li
              key={todo.id}
              className={`
                flex items-center justify-between p-2 rounded
                border border-gray-300 dark:border-[#3f4257]
                bg-gray-100 dark:bg-[#2c2f3f]
              `}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleComplete(todo.id, todo.completed)}
                  className="accent-green-500 dark:accent-[#50fa7b]"
                />
                <span
                  className={todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}
                >
                  {todo.text}
                </span>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-white text-xs"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TodoListView
