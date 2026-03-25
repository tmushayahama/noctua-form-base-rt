import type React from 'react'
import { useState } from 'react'
import { TextField } from '@mui/material'
import { FaFileMedical } from 'react-icons/fa'
import ReferenceDropdown from './ReferenceDropdown'

interface ReferenceFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

const ReferenceField: React.FC<ReferenceFieldProps> = ({
  value,
  onChange,
  label = 'Reference',
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  return (
    <>
      <TextField
        size="small"
        variant="outlined"
        label={label}
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
      <ReferenceDropdown
        anchorEl={anchorEl}
        currentValue={value}
        onClose={() => setAnchorEl(null)}
        onSave={val => onChange(val)}
      />
    </>
  )
}

export default ReferenceField
