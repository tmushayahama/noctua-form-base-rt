import type React from 'react'
import { useState } from 'react'
import { FaFileMedical } from 'react-icons/fa'
import FloatingTextarea from '@/@noctua.core/components/textarea/FloatingTextarea'
import ReferenceDropdown from './ReferenceDropdown'
import WithDropdown from './WithDropdown'

interface DatabaseFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  type: 'reference' | 'with'
}

const DatabaseField: React.FC<DatabaseFieldProps> = ({
  value,
  onChange,
  label,
  type,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const resolvedLabel = label ?? (type === 'reference' ? 'Reference' : 'With')

  const Dropdown = type === 'reference' ? ReferenceDropdown : WithDropdown

  return (
    <>
      <FloatingTextarea
        size="xs"
        label={resolvedLabel}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={e => {
          const trimmed = e.target.value.trim()
          if (trimmed !== e.target.value) onChange(trimmed)
        }}
        rows={2}
        rightSection={
          <button
            type="button"
            onClick={e => setAnchorEl(e.currentTarget)}
            className="self-end rounded-full p-1 hover:bg-gray-100"
          >
            <FaFileMedical size={14} />
          </button>
        }
      />
      <Dropdown
        anchorEl={anchorEl}
        currentValue={value}
        onClose={() => setAnchorEl(null)}
        onSave={val => onChange(val)}
      />
    </>
  )
}

export default DatabaseField
