// views/TodoListView.tsx

import React, { useEffect, useState } from 'react'

interface TodoItem {
  id: number
  text: string
  completed: boolean
}

const BACKEND_URL = 'http://localhost:5000' // Adjust if needed

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
    // Example: you might PUT to /api/todos/:id
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
    <div className="text-sm text-gray-100 space-y-3">
      {/* Error banner */}
      {error && (
        <div className="bg-red-900 bg-opacity-30 border border-red-600 text-red-100 p-2 rounded">
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
          className="flex-1 p-2 bg-[#1e1f29] border border-[#3f4257] rounded text-gray-100 focus:outline-none focus:border-[#7b93fd]"
        />
        <button
          onClick={addTodo}
          className="px-3 py-1 bg-[#50fa7b] hover:bg-[#7b93fd] rounded font-medium text-[#1e1f29]"
        >
          Add
        </button>
      </div>

      {/* Filter toggles */}
      <div className="flex items-center gap-4">
        <label className="text-gray-300 text-sm">Filter:</label>
        <select
          className="bg-[#1e1f29] border border-[#3f4257] rounded px-2 py-1 text-gray-100"
          value={filter}
          onChange={e => setFilter(e.target.value as 'all' | 'incomplete')}
        >
          <option value="all">All Tasks</option>
          <option value="incomplete">Incomplete Only</option>
        </select>
      </div>

      {/* Loading state */}
      {loading && <p className="text-gray-400">Loading tasks...</p>}

      {/* Todos list */}
      {filteredTodos.length === 0 && !loading ? (
        <p className="text-gray-400 text-sm">No tasks found.</p>
      ) : (
        <ul className="space-y-1">
          {filteredTodos.map(todo => (
            <li
              key={todo.id}
              className="flex items-center justify-between bg-[#2c2f3f] p-2 rounded border border-[#3f4257]"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleComplete(todo.id, todo.completed)}
                  className="accent-[#50fa7b]"
                />
                <span className={todo.completed ? 'line-through text-gray-400' : ''}>
                  {todo.text}
                </span>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
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
