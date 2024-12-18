// components/TodoList.tsx

import React, { useState } from 'react';

interface TodoItem {
  id: number;
  text: string;
}

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputValue, setInputValue] = useState('');

  function addTodo() {
    const trimmed = inputValue.trim();
    if (trimmed) {
      const newTodo: TodoItem = { id: Date.now(), text: trimmed };
      setTodos([...todos, newTodo]);
      setInputValue('');
    }
  }

  function deleteTodo(id: number) {
    setTodos(todos.filter(todo => todo.id !== id));
  }

  return (
    <div className="space-y-4">
      <div>
        <input 
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Add a new task..."
          className="w-full p-2 bg-[#1e1f29] border border-[#3f4257] rounded text-[#e0e2f0] focus:outline-none focus:border-[#8be9fd]"
        />
        <button
          onClick={addTodo}
          className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 transition-colors rounded font-medium text-sm text-white"
        >
          Add Task
        </button>
      </div>
      {todos.length === 0 ? (
        <p className="text-gray-400 text-sm">No tasks yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {todos.map(todo => (
            <li key={todo.id} className="flex items-center justify-between bg-[#2c2f3f] p-2 rounded border border-[#3f4257]">
              <span className="text-[#e0e2f0]">{todo.text}</span>
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
  );
};

export default TodoList;
