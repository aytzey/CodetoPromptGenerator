// views/TestButtonView.tsx
import React from 'react'

const TestButtonView: React.FC = () => {
  return (
    <div className="bg-[#1e1f29] p-3 rounded border border-[#3f4257] space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300 font-medium">Testing Button Display:</label>
        <button
          onClick={() => alert('Button clicked!')}
          className="px-3 py-1 bg-[#7b93fd] hover:bg-[#50fa7b] rounded text-sm font-medium text-white transition-colors"
        >
          This is a test button
        </button>
      </div>
    </div>
  )
}

export default TestButtonView