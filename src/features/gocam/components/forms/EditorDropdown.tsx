import type React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { IconButton, InputAdornment, Popover, TextField } from '@mui/material'
import { FaPlusSquare } from 'react-icons/fa'
import { FaRegCircleXmark, FaRegCircleCheck } from 'react-icons/fa6'
import { EditorCategory } from '../../models/editorCategory'
import { RootTypes } from '../../models/cam'
import TermAutocomplete from '@/features/search/components/Autocomplete'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse } from '@/features/search/models/search'
import ReferenceDropdown from './ReferenceDropdown'
import WithDropdown from './WithDropdown'

// ── Types ────────────────────────────────────────────────────────────

export interface EditorDropdownValues {
  term?: GOlrResponse | null
  evidence?: GOlrResponse | null
  reference?: string
  with?: string
}

export interface EditorDropdownProps {
  anchorEl: HTMLElement | null
  category: EditorCategory
  onClose: () => void
  onSave: (values: EditorDropdownValues) => void

  // Label & root types for term autocomplete
  termLabel?: string
  termRootTypes?: string[]

  // Initial values for pre-filling
  initialTerm?: { id: string; label: string } | null
  initialEvidence?: { id: string; label: string } | null
  initialReference?: string
  initialWith?: string
}

// ── Display sections logic (matches Angular _displaySection) ─────────

function getDisplaySections(category: EditorCategory) {
  const sections = {
    term: false,
    evidence: false,
    reference: false,
    with: false,
  }
  switch (category) {
    case EditorCategory.term:
      sections.term = true
      break
    case EditorCategory.evidence:
      sections.evidence = true
      break
    case EditorCategory.reference:
      sections.reference = true
      break
    case EditorCategory.with:
      sections.with = true
      break
    case EditorCategory.evidenceAll:
      sections.evidence = true
      sections.reference = true
      sections.with = true
      break
    case EditorCategory.all:
      sections.term = true
      sections.evidence = true
      sections.reference = true
      sections.with = true
      break
  }
  return sections
}

// ── Component ────────────────────────────────────────────────────────

const EditorDropdown: React.FC<EditorDropdownProps> = ({
  anchorEl,
  category,
  onClose,
  onSave,
  termLabel = 'Term',
  termRootTypes,
  initialTerm = null,
  initialEvidence = null,
  initialReference = '',
  initialWith = '',
}) => {
  const open = Boolean(anchorEl)
  const sections = getDisplaySections(category)

  // Field state
  const [term, setTerm] = useState<GOlrResponse | null>(null)
  const [evidence, setEvidence] = useState<GOlrResponse | null>(null)
  const [reference, setReference] = useState('')
  const [withVal, setWithVal] = useState('')

  // Sub-dropdown anchors for Reference/With DB pickers
  const [refDbAnchor, setRefDbAnchor] = useState<HTMLElement | null>(null)
  const [withDbAnchor, setWithDbAnchor] = useState<HTMLElement | null>(null)

  // Reset fields when popover opens
  useEffect(() => {
    if (open) {
      setTerm(initialTerm ? ({ id: initialTerm.id, label: initialTerm.label } as GOlrResponse) : null)
      setEvidence(
        initialEvidence
          ? ({ id: initialEvidence.id, label: initialEvidence.label } as GOlrResponse)
          : null
      )
      setReference(initialReference)
      setWithVal(initialWith)
      setRefDbAnchor(null)
      setWithDbAnchor(null)
    }
  }, [open, initialTerm, initialEvidence, initialReference, initialWith])

  const handleClose = useCallback(() => {
    if (!refDbAnchor && !withDbAnchor) {
      onClose()
    }
  }, [refDbAnchor, withDbAnchor, onClose])

  const handleSave = useCallback(() => {
    onSave({
      term: sections.term ? term : undefined,
      evidence: sections.evidence ? evidence : undefined,
      reference: sections.reference ? reference : undefined,
      with: sections.with ? withVal : undefined,
    })
  }, [term, evidence, reference, withVal, sections, onSave])

  return (
    <>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ className: '!bg-[#fbf9de] !shadow-lg' }}
      >
        <div className="flex w-full flex-row items-center justify-start px-1 pb-1 pt-2">
          {/* ── Term section (250px) ── */}
          {sections.term && (
            <div className="w-[250px] px-1">
              <TermAutocomplete
                label={termLabel}
                name="editor-term"
                autocompleteType={AutocompleteType.TERM}
                rootTypeIds={termRootTypes ?? []}
                value={term}
                onChange={val => {
                  if (val && typeof val === 'object') setTerm(val)
                }}
                variant="outlined"
              />
            </div>
          )}

          {/* ── Evidence section (250px) ── */}
          {sections.evidence && (
            <div className="w-[250px] px-1">
              <TermAutocomplete
                label="Evidence"
                name="editor-evidence"
                autocompleteType={AutocompleteType.EVIDENCE_CODE}
                rootTypeIds={[RootTypes.EVIDENCE]}
                value={evidence}
                onChange={val => {
                  if (val && typeof val === 'object') setEvidence(val)
                }}
                variant="outlined"
              />
            </div>
          )}

          {/* ── Reference section (150px) ── */}
          {sections.reference && (
            <div className="w-[150px] px-1">
              <TextField
                size="small"
                variant="outlined"
                label="Reference"
                placeholder="PMID:12345"
                value={reference}
                onChange={e => setReference(e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={e => setRefDbAnchor(e.currentTarget)}
                          className="!h-5 !w-5"
                        >
                          <FaPlusSquare size={14} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </div>
          )}

          {/* ── With section (150px) ── */}
          {sections.with && (
            <div className="w-[150px] px-1">
              <TextField
                size="small"
                variant="outlined"
                label="With"
                placeholder="UniProtKB:P12345"
                value={withVal}
                onChange={e => setWithVal(e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={e => setWithDbAnchor(e.currentTarget)}
                          className="!h-5 !w-5"
                        >
                          <FaPlusSquare size={14} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </div>
          )}

          {/* ── Cancel / Save buttons ── */}
          <IconButton size="small" onClick={onClose} title="Cancel" className="!text-red-400">
            <FaRegCircleXmark size={18} />
          </IconButton>
          <IconButton size="small" onClick={handleSave} title="Save" className="!text-green-600">
            <FaRegCircleCheck size={18} />
          </IconButton>
        </div>
      </Popover>

      {/* ── Reference DB picker sub-dropdown ── */}
      <ReferenceDropdown
        anchorEl={refDbAnchor}
        currentValue={reference}
        onClose={() => setRefDbAnchor(null)}
        onSave={val => setReference(val)}
      />

      {/* ── With DB picker sub-dropdown ── */}
      <WithDropdown
        anchorEl={withDbAnchor}
        currentValue={withVal}
        onClose={() => setWithDbAnchor(null)}
        onSave={val => setWithVal(val)}
      />
    </>
  )
}

export default EditorDropdown
