import type React from 'react'
import { useState, useEffect } from 'react'
import {
  CircularProgress,
  Popover,
  TextField,
  IconButton,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material'
import { FaRegTimesCircle, FaRegCheckCircle, FaUser, FaCalendarAlt } from 'react-icons/fa'
import { referenceAllowedDBs } from '../../data/allowedDatabases'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'
import { useLazyGetPubmedInfoQuery } from '@/features/search/slices/lookupApiSlice'
import { PUBMED_LOOKUP_DELAY_MS, MIN_PMID_LENGTH } from '@/@noctua.core/data/uiConstants'

interface ReferenceDropdownProps {
  anchorEl: HTMLElement | null
  currentValue?: string
  onClose: () => void
  onSave: (value: string) => void
}

const dbOptions = referenceAllowedDBs.map(db => ({ name: db, label: `${db}:` }))

/** Parse "DB:accession" into { dbName, accession } */
function parseReference(value: string | undefined): { dbName: string; accession: string } {
  if (!value?.trim()) return { dbName: dbOptions[0].name, accession: '' }
  const colonIdx = value.indexOf(':')
  if (colonIdx === -1) return { dbName: dbOptions[0].name, accession: value.trim() }
  const dbPart = value.slice(0, colonIdx).trim()
  const accPart = value.slice(colonIdx + 1).trim()
  const matched = dbOptions.find(d => d.name === dbPart)
  return { dbName: matched ? dbPart : dbOptions[0].name, accession: accPart }
}

const ReferenceDropdown: React.FC<ReferenceDropdownProps> = ({
  anchorEl,
  currentValue,
  onClose,
  onSave,
}) => {
  const [db, setDb] = useState(dbOptions[0])
  const [accession, setAccession] = useState('')
  const [triggerPubmed, { data: pubmedInfo, isFetching: pubmedLoading }] =
    useLazyGetPubmedInfoQuery()

  // Pre-fill when popover opens
  useEffect(() => {
    if (anchorEl) {
      const parsed = parseReference(currentValue)
      const found = dbOptions.find(d => d.name === parsed.dbName) ?? dbOptions[0]
      setDb(found)
      setAccession(parsed.accession)
    }
  }, [anchorEl, currentValue])

  // Fetch PubMed info when PMID accession changes
  useEffect(() => {
    if (db.name === 'PMID' && accession.trim().length >= MIN_PMID_LENGTH) {
      const timer = setTimeout(() => triggerPubmed(accession.trim()), PUBMED_LOOKUP_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [db.name, accession, triggerPubmed])

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
      PaperProps={{ className: '!bg-accent-50 !shadow-lg' }}
    >
      <div
        className="flex w-full flex-col items-stretch justify-start px-2 py-2"
        style={{ minWidth: 400 }}
      >
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

        {/* PubMed article preview */}
        {db.name === 'PMID' && accession.trim() && (
          <div className="mt-2 border-t border-gray-300 pt-2 text-xs">
            {pubmedLoading && <CircularProgress size={14} />}
            {!pubmedLoading && pubmedInfo && (
              <div className="flex flex-col gap-1">
                <a
                  href={`${ENVIRONMENT.pubmedUrl}${accession.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 font-medium text-blue-700 hover:underline"
                >
                  {pubmedInfo.title}
                </a>
                {pubmedInfo.authors && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <FaUser size={9} />
                    <span className="line-clamp-1">{pubmedInfo.authors}</span>
                  </div>
                )}
                {pubmedInfo.date && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <FaCalendarAlt size={9} />
                    <span>{pubmedInfo.date}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Popover>
  )
}

export default ReferenceDropdown
