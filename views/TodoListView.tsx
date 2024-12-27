// views/TodoListView.tsx

import React, { useEffect, useState } from 'react'

interface TodoItem {
  id: number
  text: string
}

const BACKEND_URL = 'http://localhost:5000'

const TodoListView: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    loadTodos()
  }, [])

  async function loadTodos() {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/todos`)
      const data = await resp.json()
      if (data.success) {
        setTodos(data.data)
      }
    } catch (err) {
      console.error('Error fetching todos:', err)
    }
  }

  async function addTodo() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
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
      }
    } catch (err) {
      console.error('Error adding todo:', err)
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
      }
    } catch (err) {
      console.error('Error deleting todo:', err)
    }
  }

  return (
    <div className="text-sm text-gray-100 space-y-3">
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

      {todos.length === 0 ? (
        <p className="text-gray-400 text-sm">No tasks yet.</p>
      ) : (
        <ul className="space-y-1">
          {todos.map(todo => (
            <li
              key={todo.id}
              className="flex items-center justify-between bg-[#2c2f3f] p-2 rounded border border-[#3f4257]"
            >
              <span className="text-gray-100">{todo.text}</span>
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
