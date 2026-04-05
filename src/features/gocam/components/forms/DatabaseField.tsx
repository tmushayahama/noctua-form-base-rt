import type React from 'react'
import { useState } from 'react'
import { TextField } from '@mui/material'
import { FaFileMedical } from 'react-icons/fa'
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
      <TextField
        size="small"
        variant="outlined"
        label={resolvedLabel}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={e => {
          const trimmed = e.target.value.trim()
          if (trimmed !== e.target.value) onChange(trimmed)
        }}
        multiline
        rows={2}
        fullWidth
        InputProps={{
          className: 'bg-white rounded',
          endAdornment: (
            <button
              type="button"
              onClick={e => setAnchorEl(e.currentTarget)}
              className="self-end rounded-full p-1 hover:bg-gray-100"
            >
              <FaFileMedical size={14} />
            </button>
          ),
        }}
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
