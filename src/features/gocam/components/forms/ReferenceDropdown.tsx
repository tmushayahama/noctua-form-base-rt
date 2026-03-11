import type React from 'react'
import { useState } from 'react'
import {
  Popover,
  TextField,
  IconButton,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material'
import { FaRegTimesCircle, FaRegCheckCircle } from 'react-icons/fa'
import { referenceAllowedDBs } from '../../data/allowedDatabases'

interface ReferenceDropdownProps {
  anchorEl: HTMLElement | null
  onClose: () => void
  onSave: (value: string) => void
}

const dbOptions = referenceAllowedDBs.map(db => ({ name: db, label: `${db}:` }))

const ReferenceDropdown: React.FC<ReferenceDropdownProps> = ({
  anchorEl,
  onClose,
  onSave,
}) => {
  const [db, setDb] = useState(dbOptions[0])
  const [accession, setAccession] = useState('')

  const handleSave = () => {
    const trimmed = accession.trim()
    if (!trimmed) return
    onSave(`${db.name}:${trimmed}`)
    setAccession('')
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <div className="flex w-full flex-col items-stretch justify-start px-2 py-2">
        <div className="flex w-full flex-row items-center justify-start">
          <Select
            size="small"
            variant="outlined"
            value={db.name}
            onChange={(e: SelectChangeEvent) => {
              const found = dbOptions.find(d => d.name === e.target.value)
              if (found) setDb(found)
            }}
            className="mr-3 w-[100px]"
          >
            {dbOptions.map(d => (
              <MenuItem key={d.name} value={d.name}>
                {d.label}
              </MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            variant="outlined"
            placeholder="Accession"
            value={accession}
            onChange={e => setAccession(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1"
          />
          <IconButton size="small" onClick={onClose}>
            <FaRegTimesCircle />
          </IconButton>
          <IconButton size="small" onClick={handleSave}>
            <FaRegCheckCircle />
          </IconButton>
        </div>
      </div>
    </Popover>
  )
}

export default ReferenceDropdown
