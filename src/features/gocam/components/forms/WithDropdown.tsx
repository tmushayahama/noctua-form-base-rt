import type React from 'react'
import { useState } from 'react'
import {
  Popover,
  TextField,
  Button,
  IconButton,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material'
import { FaPlus, FaRegTrashAlt } from 'react-icons/fa'
import { withFromAllowedDBs } from '../../data/allowedDatabases'

interface WithDropdownProps {
  anchorEl: HTMLElement | null
  currentValue: string
  onClose: () => void
  onSave: (value: string) => void
}

interface WithEntity {
  db: string
  accession: string
}

interface WithGroup {
  entities: WithEntity[]
}

const DB_NONE = 'None'
const dbOptions = [DB_NONE, ...withFromAllowedDBs.slice().sort()]

/** Parse existing with/from value into groups */
function parseWithValue(value: string): WithGroup[] {
  if (!value?.trim()) {
    return [{ entities: [{ db: DB_NONE, accession: '' }] }]
  }

  const groups = value.split(',').map(groupStr => {
    const entities = groupStr
      .trim()
      .split('|')
      .filter(s => s.trim())
      .map(entityStr => {
        const trimmed = entityStr.trim()
        const colonIdx = trimmed.indexOf(':')
        if (colonIdx === -1) return { db: DB_NONE, accession: trimmed }
        return {
          db: trimmed.slice(0, colonIdx).trim() || DB_NONE,
          accession: trimmed.slice(colonIdx + 1).trim(),
        }
      })

    return { entities: entities.length > 0 ? entities : [{ db: DB_NONE, accession: '' }] }
  })

  return groups.length > 0 ? groups : [{ entities: [{ db: DB_NONE, accession: '' }] }]
}

const WithDropdown: React.FC<WithDropdownProps> = ({
  anchorEl,
  currentValue,
  onClose,
  onSave,
}) => {
  const [groups, setGroups] = useState<WithGroup[]>(() => parseWithValue(currentValue))

  const updateEntity = (groupIdx: number, entityIdx: number, field: keyof WithEntity, value: string) => {
    setGroups(prev => {
      const next = prev.map((g, gi) =>
        gi === groupIdx
          ? {
              entities: g.entities.map((e, ei) =>
                ei === entityIdx ? { ...e, [field]: value } : e
              ),
            }
          : g
      )
      return next
    })
  }

  const addEntity = (groupIdx: number) => {
    setGroups(prev =>
      prev.map((g, gi) =>
        gi === groupIdx
          ? { entities: [...g.entities, { db: DB_NONE, accession: '' }] }
          : g
      )
    )
  }

  const deleteEntity = (groupIdx: number, entityIdx: number) => {
    setGroups(prev =>
      prev.map((g, gi) =>
        gi === groupIdx
          ? { entities: g.entities.filter((_, ei) => ei !== entityIdx) }
          : g
      )
    )
  }

  const addGroup = () => {
    setGroups(prev => [...prev, { entities: [{ db: DB_NONE, accession: '' }] }])
  }

  const deleteGroup = (groupIdx: number) => {
    setGroups(prev => prev.filter((_, gi) => gi !== groupIdx))
  }

  const handleSave = () => {
    const result = groups
      .map(group =>
        group.entities
          .filter(e => e.db !== DB_NONE && e.accession.trim())
          .map(e => `${e.db}:${e.accession.trim()}`)
          .join('|')
      )
      .filter(s => s.length > 0)
      .join(',')

    onSave(result)
    onClose()
  }

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <div
        className="flex w-full flex-col items-stretch justify-start px-2 py-2"
        style={{ minWidth: 380, maxHeight: 400 }}
      >
        <div className="flex-1 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={gi} className="mb-4 px-3">
              <div className="mb-2 flex flex-row items-center justify-start">
                <strong className="mr-2 text-sm">With/From</strong>
                <IconButton size="small" onClick={() => deleteGroup(gi)} title="Delete Group">
                  <FaRegTrashAlt size={12} />
                </IconButton>
              </div>
              {group.entities.map((entity, ei) => (
                <div
                  key={ei}
                  className="mb-2 flex flex-row items-center justify-start"
                >
                  <Select
                    size="small"
                    variant="outlined"
                    value={entity.db}
                    onChange={(e: SelectChangeEvent) =>
                      updateEntity(gi, ei, 'db', e.target.value)
                    }
                    className="mr-3 w-[120px]"
                    MenuProps={{ style: { maxHeight: 300 } }}
                  >
                    {dbOptions.map(d => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </Select>
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Accession"
                    value={entity.accession}
                    onChange={e => updateEntity(gi, ei, 'accession', e.target.value)}
                    className="flex-1"
                  />
                  <IconButton size="small" onClick={() => addEntity(gi)} title="Add Entity">
                    <FaPlus size={12} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => deleteEntity(gi, ei)}
                    title="Delete Entity"
                  >
                    <FaRegTrashAlt size={12} />
                  </IconButton>
                </div>
              ))}
              {group.entities.length === 0 && (
                <div className="p-4">
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => addEntity(gi)}
                  >
                    Add With/From
                  </button>
                </div>
              )}
            </div>
          ))}
          <Button size="small" onClick={addGroup}>
            Add Group
          </Button>
        </div>
        <div className="flex w-full flex-row items-center justify-end pt-2">
          <Button size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button size="small" color="primary" onClick={handleSave}>
            Ok
          </Button>
        </div>
      </div>
    </Popover>
  )
}

export default WithDropdown
