import type React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ActionIcon } from '@mantine/core'
import AnchoredMenu, { MenuItem } from '@/@noctua.core/components/menu/AnchoredMenu'
import AnchoredPopover from '@/@noctua.core/components/popover/AnchoredPopover'
import { usePopover } from '@/@noctua.core/hooks/usePopover'
import { FaEllipsisV } from 'react-icons/fa'
import { FaRegCircleXmark, FaRegCircleCheck } from 'react-icons/fa6'
import { useAppSelector } from '@/app/hooks'
import { EditorCategory } from '../../models/editorCategory'
import { RootTypes } from '../../models/cam'
import { ROOT_NODES, EVIDENCE_AUTO_POPULATE } from '../../data/camConstants'
import { makeSelectModelTerms, selectModelEvidence } from '../../slices/camSlice'
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

interface EditorDropdownProps {
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
  const showActionMenu =
    (category === EditorCategory.all || category === EditorCategory.evidenceAll) && hasAspect

  const selectTerms = useMemo(makeSelectModelTerms, [])
  const rootTypes = termRootTypes ?? []
  const termInitialOptions = useAppSelector(state => selectTerms(state, rootTypes))
  const evidenceInitialOptions = useAppSelector(selectModelEvidence)

  // Field state
  const [term, setTerm] = useState<GOlrResponse | null>(null)
  const [evidence, setEvidence] = useState<GOlrResponse | null>(null)
  const [reference, setReference] = useState('')
  const [withVal, setWithVal] = useState('')
  const actionMenu = usePopover()

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
      actionMenu.close()
    }
  }, [open, initialTerm, initialEvidence, initialReference, initialWith]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    if (!actionMenu.isOpen) onClose()
  }, [actionMenu.isOpen, onClose])

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
    <AnchoredPopover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      placement="bottom-end"
      className="!bg-accent-50 !shadow-lg !min-w-[400px]"
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
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              onClick={e => actionMenu.open(e.currentTarget)}
              className="!h-10 !w-10"
            >
              <FaEllipsisV size={12} />
            </ActionIcon>
            <AnchoredMenu
              anchorEl={actionMenu.anchor}
              open={actionMenu.isOpen}
              onClose={actionMenu.close}
            >
              {category !== EditorCategory.evidenceAll && onSearchAnnotations && (
                <MenuItem
                  onClick={() => {
                    actionMenu.close()
                    onSearchAnnotations()
                  }}
                >
                  Search Annotations
                </MenuItem>
              )}
              {category !== EditorCategory.evidenceAll && (
                <MenuItem
                  onClick={() => {
                    actionMenu.close()
                    handleFillRootTerm()
                  }}
                >
                  Fill with root term
                </MenuItem>
              )}
            </AnchoredMenu>
          </>
        )}

        <ActionIcon variant="subtle" color="gray" size="md" onClick={onClose} title="Cancel" className="!text-red-400">
          <FaRegCircleXmark size={18} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="md" onClick={handleSave} title="Save" className="!text-green-600">
          <FaRegCircleCheck size={18} />
        </ActionIcon>
      </div>
    </AnchoredPopover>
  )
}

export default EditorDropdown
