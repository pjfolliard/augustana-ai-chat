'use client'

interface CanvasButtonProps {
  onCanvas: () => void
  disabled?: boolean
  isActive?: boolean
}

export function CanvasButton({ onCanvas, disabled, isActive }: CanvasButtonProps) {
  return (
    <button
      type="button"
      onClick={onCanvas}
      disabled={disabled}
      className={`p-2 rounded-md transition-colors ${
        disabled 
          ? 'text-gray-400 cursor-not-allowed' 
          : isActive
          ? 'text-white bg-purple-600 hover:bg-purple-700'
          : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
      }`}
      title={isActive ? "Canvas mode active (click to toggle off)" : "Click to enable canvas mode"}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </button>
  )
}