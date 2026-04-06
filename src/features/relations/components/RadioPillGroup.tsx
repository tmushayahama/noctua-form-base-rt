import type React from 'react'

interface PillOption {
  value: string
  label: string
  description?: string
}

interface RadioPillGroupProps {
  name: string
  value: string
  options: PillOption[]
  onChange: (value: string) => void
}

const RadioPillGroup: React.FC<RadioPillGroupProps> = ({ name, value, options, onChange }) => (
  <div className="flex flex-col py-1">
    {options.map((opt, index) => {
      const isSelected = value === opt.value
      return (
        <div
          key={opt.value}
          className="flex w-full items-center py-[5px]"
          style={{
            borderBottom:
              index < options.length - 1 ? '1px solid rgba(59,89,152,0.6)' : 'none',
          }}
        >
          <label className="flex w-[170px] shrink-0 cursor-pointer items-center gap-2 text-xs">
            <span
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? 'border-blue-800' : 'border-gray-400'}`}
            >
              {isSelected && (
                <span className="block h-[10px] w-[10px] rounded-full bg-blue-800" />
              )}
            </span>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={isSelected}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span className="text-neutral-700">{opt.label}</span>
          </label>
          {opt.description && (
            <span className="ml-3 max-w-[300px] grow text-xs italic text-neutral-500">
              {opt.description}
            </span>
          )}
        </div>
      )
    })}
  </div>
)

export default RadioPillGroup
