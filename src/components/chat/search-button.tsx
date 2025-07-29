'use client'

interface SearchButtonProps {
  onSearch: () => void
  disabled?: boolean
  isActive?: boolean
}

export function SearchButton({ onSearch, disabled, isActive }: SearchButtonProps) {
  return (
    <button
      type="button"
      onClick={onSearch}
      disabled={disabled}
      className={`p-2 rounded-md transition-colors ${
        disabled 
          ? 'text-gray-400 cursor-not-allowed' 
          : isActive
          ? 'text-white bg-green-600 hover:bg-green-700'
          : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
      }`}
      title={isActive ? "Search mode active (click to toggle off)" : "Click to enable search mode"}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button>
  )
}