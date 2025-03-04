// views/TestButtonView.tsx
import React from 'react'

/**
 * Simple button to test UI styling and click handling.
 * Useful as a placeholder or for demos.
 */
const TestButtonView: React.FC = () => {
  return (
    <div
      className={`
        p-3 rounded border space-y-2
        bg-gray-100 dark:bg-[#1e1f29]
        border-gray-300 dark:border-[#3f4257]
      `}
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-800 dark:text-gray-300">
          Testing Button Display:
        </label>
        <button
          onClick={() => alert('Button clicked!')}
          className={`
            px-3 py-1 rounded text-sm font-medium transition-colors
            bg-blue-400 hover:bg-blue-500 text-white
            dark:bg-[#7b93fd] dark:hover:bg-[#50fa7b]
          `}
        >
          This is a test button
        </button>
      </div>
    </div>
  )
}

export default TestButtonView
