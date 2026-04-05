import type React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { IconButton, Menu, MenuItem, Popover } from '@mui/material'
import { FaEllipsisV } from 'react-icons/fa'
import { FaRegCircleXmark, FaRegCircleCheck } from 'react-icons/fa6'
import { useAppSelector } from '@/app/hooks'
import { EditorCategory } from '../../models/editorCategory'
import { RootTypes } from '../../models/cam'
import { ROOT_NODES, EVIDENCE_AUTO_POPULATE } from '../../data/camConstants'
import { selectCamModel, getModelTerms, getModelEvidence } from '../../slices/camSlice'
import TermAutocomplete from '@/features/search/components/Autocomplete'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse } from '@/features/search/models/search'
import DatabaseField from './DatabaseField'

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

  termLabel?: string
  termRootTypes?: string[]

  initialTerm?: { id: string; label: string } | null
  initialEvidence?: { id: string; label: string } | null
  initialReference?: string
  initialWith?: string

  /** Whether the node has an aspect — controls Search Annotations / Fill Root Term visibility */
  hasAspect?: boolean
  onSearchAnnotations?: () => void
}

function getDisplaySections(category: EditorCategory) {
  const sections = { term: false, evidence: false, reference: false, with: false }
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
  hasAspect = false,
  onSearchAnnotations,
}) => {
  const open = Boolean(anchorEl)
  const sections = getDisplaySections(category)
  const model = useAppSelector(selectCamModel)
  const showActionMenu =
    (category === EditorCategory.all || category === EditorCategory.evidenceAll) && hasAspect

  const termInitialOptions = useMemo(
    () => getModelTerms(model, termRootTypes ?? []),
    [model, termRootTypes]
  )
  const evidenceInitialOptions = useMemo(() => getModelEvidence(model), [model])

  // Field state
  const [term, setTerm] = useState<GOlrResponse | null>(null)
  const [evidence, setEvidence] = useState<GOlrResponse | null>(null)
  const [reference, setReference] = useState('')
  const [withVal, setWithVal] = useState('')
  const [actionMenuAnchor, setActionMenuAnchor] = useState<HTMLElement | null>(null)

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
      setActionMenuAnchor(null)
    }
  }, [open, initialTerm, initialEvidence, initialReference, initialWith])

  const handleClose = useCallback(() => {
    if (!actionMenuAnchor) onClose()
  }, [actionMenuAnchor, onClose])

  const handleSave = useCallback(() => {
    onSave({
      term: sections.term ? term : undefined,
      evidence: sections.evidence ? evidence : undefined,
      reference: sections.reference ? reference : undefined,
      with: sections.with ? withVal : undefined,
    })
  }, [term, evidence, reference, withVal, sections, onSave])

  const handleFillRootTerm = useCallback(() => {
    const matchedRoot = termRootTypes?.find(rt => ROOT_NODES[rt])
    if (!matchedRoot) return
    const { id, label } = ROOT_NODES[matchedRoot]
    const { evidence: ndEvidence, reference: ndReference } = EVIDENCE_AUTO_POPULATE.nd
    setTerm({ id, label } as GOlrResponse)
    setEvidence({ id: ndEvidence.id, label: ndEvidence.label } as GOlrResponse)
    setReference(ndReference)
  }, [termRootTypes])

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{ className: '!bg-accent-50 !shadow-lg', style: { minWidth: 400 } }}
    >
      <div className="flex w-full flex-row items-stretch justify-start pb-1 pt-2">
        {sections.term && (
          <div className="w-[250px] p-1">
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
              initialOptions={termInitialOptions}
            />
          </div>
        )}
        {sections.evidence && (
          <div className="w-[250px] p-1">
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
              initialOptions={evidenceInitialOptions}
            />
          </div>
        )}
        {sections.reference && (
          <div className="w-[150px] p-1">
            <DatabaseField type="reference" value={reference} onChange={setReference} />
          </div>
        )}
        {sections.with && (
          <div className="w-[150px] p-1">
            <DatabaseField type="with" value={withVal} onChange={setWithVal} />
          </div>
        )}

        {showActionMenu && (
          <>
            <IconButton
              size="small"
              onClick={e => setActionMenuAnchor(e.currentTarget)}
              className="!h-10 !w-10"
            >
              <FaEllipsisV size={12} />
            </IconButton>
            <Menu
              anchorEl={actionMenuAnchor}
              open={Boolean(actionMenuAnchor)}
              onClose={() => setActionMenuAnchor(null)}
            >
              {category !== EditorCategory.evidenceAll && onSearchAnnotations && (
                <MenuItem
                  onClick={() => {
                    setActionMenuAnchor(null)
                    onSearchAnnotations()
                  }}
                >
                  Search Annotations
                </MenuItem>
              )}
              {category !== EditorCategory.evidenceAll && (
                <MenuItem
                  onClick={() => {
                    setActionMenuAnchor(null)
                    handleFillRootTerm()
                  }}
                >
                  Fill with root term
                </MenuItem>
              )}
            </Menu>
          </>
        )}

        <IconButton size="small" onClick={onClose} title="Cancel" className="!text-red-400">
          <FaRegCircleXmark size={18} />
        </IconButton>
        <IconButton size="small" onClick={handleSave} title="Save" className="!text-green-600">
          <FaRegCircleCheck size={18} />
        </IconButton>
      </div>
    </Popover>
  )
}

export default EditorDropdown
