import type React from 'react'
import { useState, useCallback } from 'react'
import { IconButton, Menu, MenuItem } from '@mui/material'
import { FaEllipsisV, FaPlus } from 'react-icons/fa'
import { useAppDispatch } from '@/app/hooks'
import TermAutocomplete from '@/features/search/components/Autocomplete'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse } from '@/features/search/models/search'
import type { TermNode, RelationNode, EvidenceForm, ValidationError } from '../../models/formModels'
import type { Entity } from '../../models/cam'
import { RootTypes } from '../../models/cam'
import {
  updateTerm,
  toggleComplement,
  addEvidenceForm,
  removeEvidenceForm,
  updateEvidenceForm,
  removeRelationForm,
  addRelationForm,
  addISSEvidence,
  clearNodeValues,
  fillRootTerm,
} from '../../slices/activityFormSlice'
import {
  getNodeCategory,
  getExtensionRelations,
  type RelationEntry,
} from '../../data/nodeCategories'
import ReferenceField from './ReferenceField'
import WithField from './WithField'

interface EntityRowProps {
  node: TermNode
  relation: RelationNode | null
  parentTermUid: string | null
  treeLevel: number
  errors: ValidationError[]
  displayMenuButton?: boolean
  displayAddButton?: boolean
  onSearchAnnotations?: (node: TermNode, relation: RelationNode | null) => void
  onCloneEvidence?: (relationUid: string) => void
}

const EntityRow: React.FC<EntityRowProps> = ({
  node,
  relation,
  parentTermUid,
  treeLevel,
  errors,
  displayMenuButton = true,
  displayAddButton = false,
  onSearchAnnotations,
  onCloneEvidence,
}) => {
  const dispatch = useAppDispatch()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
  const [evidenceMenuAnchor, setEvidenceMenuAnchor] = useState<HTMLElement | null>(null)

  const evidence = relation?.evidence ?? []

  const handleTermChange = useCallback(
    (value: GOlrResponse | null | string) => {
      if (typeof value === 'object') {
        dispatch(updateTerm({ uid: node.uid, term: value }))
      }
    },
    [dispatch, node.uid]
  )

  const handleEvidenceCodeChange = useCallback(
    (ev: EvidenceForm) => (value: GOlrResponse | null | string) => {
      if (relation && value && typeof value === 'object') {
        dispatch(
          updateEvidenceForm({
            relationUid: relation.uid,
            evidenceUid: ev.uid,
            field: 'evidenceCode',
            value: { id: value.id, label: value.label } as Entity,
          })
        )
      }
    },
    [dispatch, relation]
  )

  const handleEvidenceFieldChange = useCallback(
    (ev: EvidenceForm, field: 'reference' | 'withFrom', value: string) => {
      if (relation) {
        dispatch(
          updateEvidenceForm({
            relationUid: relation.uid,
            evidenceUid: ev.uid,
            field,
            value,
          })
        )
      }
    },
    [dispatch, relation]
  )

  const closeAllMenus = () => {
    setMenuAnchor(null)
    setAddMenuAnchor(null)
    setEvidenceMenuAnchor(null)
  }

  const handleToggleComplement = () => {
    dispatch(toggleComplement({ uid: node.uid }))
    closeAllMenus()
  }

  const handleAddEvidence = () => {
    if (relation) {
      dispatch(addEvidenceForm({ relationUid: relation.uid }))
    }
    closeAllMenus()
  }

  const handleRemoveEvidence = (evidenceIndex: number) => {
    if (relation && evidence[evidenceIndex]) {
      dispatch(
        removeEvidenceForm({
          relationUid: relation.uid,
          evidenceUid: evidence[evidenceIndex].uid,
        })
      )
    }
    closeAllMenus()
  }

  const handleRemoveNode = () => {
    if (parentTermUid && relation) {
      dispatch(removeRelationForm({ parentTermUid, relationUid: relation.uid }))
    }
    closeAllMenus()
  }

  const handleFillRootTerm = () => {
    if (relation) {
      dispatch(fillRootTerm({ termUid: node.uid, relationUid: relation.uid }))
    }
    closeAllMenus()
  }

  const handleAddISSEvidence = () => {
    if (relation) {
      dispatch(addISSEvidence({ relationUid: relation.uid }))
    }
    closeAllMenus()
  }

  const handleClearValues = () => {
    if (relation) {
      dispatch(clearNodeValues({ termUid: node.uid, relationUid: relation.uid }))
    }
    closeAllMenus()
  }

  const handleCloneEvidence = () => {
    if (relation && onCloneEvidence) {
      onCloneEvidence(relation.uid)
    }
    closeAllMenus()
  }

  const handleSearchAnnotations = () => {
    if (onSearchAnnotations) {
      onSearchAnnotations(node, relation)
    }
    closeAllMenus()
  }

  const category = getNodeCategory(node.category)
  const extensionRelations = category ? getExtensionRelations(category) : []

  const handleInsertNode = (entry: RelationEntry) => {
    const targetTypeId = entry.constraint.range[0]
    const targetCategory = getNodeCategory(targetTypeId)
    dispatch(
      addRelationForm({
        parentTermUid: node.uid,
        predicate: entry.constraint.predicate,
        nodeType: targetTypeId,
        label: targetCategory?.label ?? targetTypeId,
        rootTypes: targetCategory?.searchClosureIds ?? [targetTypeId],
        aspect: targetCategory?.aspect ?? null,
      })
    )
    closeAllMenus()
  }


  return (
    <>
      <div className="flex w-full flex-row items-stretch justify-start overflow-hidden">
        {/* Tree level indicators */}
        {treeLevel > 1 && (
          <div className="noc-tree-input flex w-5 flex-shrink-0 flex-col items-center justify-center">
            {treeLevel === 2 && (
              <div className="grow border-r border-dotted border-gray-400" />
            )}
          </div>
        )}
        {treeLevel > 2 && (
          <div className="noc-tree-input flex w-5 flex-shrink-0 flex-col items-center justify-start">
            {treeLevel === 3 && (
              <div className="basis-1/2 border-r border-dotted border-gray-400" />
            )}
            {treeLevel > 3 && (
              <div className="grow border-r border-dotted border-gray-400" />
            )}
          </div>
        )}
        {treeLevel > 3 && (
          <div className="noc-tree-input flex w-5 flex-shrink-0 flex-col items-center justify-start">
            {treeLevel === 4 && (
              <div className="basis-1/2 border-r border-dotted border-gray-400" />
            )}
          </div>
        )}

        {/* Term field */}
        <div className="min-w-0 flex-1 px-2 py-2">
          <TermAutocomplete
            label={node.label}
            name={`term-${node.uid}`}
            autocompleteType={AutocompleteType.TERM}
            rootTypeIds={node.rootTypes}
            value={node.term}
            onChange={handleTermChange}
            variant="outlined"
          />
        </div>

        {/* Evidence columns */}
        {node.showEvidence !== false && (
        <div className="flex min-w-0 basis-[65%] flex-col items-stretch justify-start">
          {evidence.map(ev => (
            <div
              key={ev.uid}
              className="flex w-full flex-row items-stretch justify-start"
            >
              <div className="w-1/2 px-2 py-2">
                <TermAutocomplete
                  label="Evidence"
                  name={`evidence-${ev.uid}`}
                  autocompleteType={AutocompleteType.EVIDENCE_CODE}
                  rootTypeIds={[RootTypes.EVIDENCE]}
                  value={
                    ev.evidenceCode?.id
                      ? ({
                          id: ev.evidenceCode.id,
                          label: ev.evidenceCode.label,
                        } as GOlrResponse)
                      : null
                  }
                  onChange={handleEvidenceCodeChange(ev)}
                  variant="outlined"
                />
              </div>
              <div className="w-1/4 px-2 py-2">
                <ReferenceField
                  value={ev.reference}
                  onChange={value => handleEvidenceFieldChange(ev, 'reference', value)}
                />
              </div>
              <div className="w-1/4 px-2 py-2">
                <WithField
                  value={ev.withFrom}
                  onChange={value => handleEvidenceFieldChange(ev, 'withFrom', value)}
                />
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Menu button (ellipsis) */}
        {displayMenuButton && (
          <div className="flex flex-shrink-0 items-center justify-center px-2">
            <IconButton
              size="small"
              onClick={e => setMenuAnchor(e.currentTarget)}
            >
              <FaEllipsisV size={14} />
            </IconButton>
          </div>
        )}
      </div>

      {/* Add button (shown below row, for GP section) */}
      {displayAddButton && extensionRelations.length > 0 && (
        <IconButton
          size="small"
          onClick={e => setAddMenuAnchor(e.currentTarget)}
          className="mt-2 shadow"
        >
          <FaPlus size={14} />
        </IconButton>
      )}

      {/* Entity menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {node.aspect && (
          <MenuItem onClick={handleSearchAnnotations}>
            Search Annotations
          </MenuItem>
        )}
        <MenuItem onClick={handleToggleComplement}>NOT Qualifier</MenuItem>
        {extensionRelations.length > 0 && (
          <MenuItem
            onClick={e => {
              setAddMenuAnchor(e.currentTarget)
              setMenuAnchor(null)
            }}
          >
            Add
          </MenuItem>
        )}
        {relation && (
          <MenuItem
            onClick={e => {
              setEvidenceMenuAnchor(e.currentTarget)
              setMenuAnchor(null)
            }}
          >
            Evidence
          </MenuItem>
        )}
        {node.aspect && relation && (
          <MenuItem onClick={handleFillRootTerm}>Fill with root term</MenuItem>
        )}
        {node.aspect && relation && (
          <MenuItem onClick={handleAddISSEvidence}>Add ISS Evidence</MenuItem>
        )}
        <MenuItem onClick={handleClearValues}>Clear Values</MenuItem>
        {node.canDelete && parentTermUid && (
          <MenuItem onClick={handleRemoveNode}>Remove</MenuItem>
        )}
      </Menu>

      {/* Add submenu */}
      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={() => setAddMenuAnchor(null)}
      >
        {extensionRelations.map(entry => {
          const rangeLabels = entry.constraint.range
            .map(id => getNodeCategory(id)?.label ?? id)
            .join(' / ')
          return (
            <MenuItem
              key={`${entry.constraint.predicate.id}-${entry.key}`}
              onClick={() => handleInsertNode(entry)}
            >
              <div className="flex w-full flex-col items-start">
                <span>{entry.constraint.predicate.label}</span>
                <span className="text-xs text-gray-500">{rangeLabels}</span>
              </div>
            </MenuItem>
          )
        })}
      </Menu>

      {/* Evidence submenu */}
      <Menu
        anchorEl={evidenceMenuAnchor}
        open={Boolean(evidenceMenuAnchor)}
        onClose={() => setEvidenceMenuAnchor(null)}
      >
        <MenuItem onClick={handleAddEvidence}>Add Evidence</MenuItem>
        {evidence.length > 0 && (
          <MenuItem onClick={() => handleRemoveEvidence(evidence.length - 1)}>
            Remove Evidence
          </MenuItem>
        )}
        {onCloneEvidence && relation && (
          <MenuItem onClick={handleCloneEvidence}>Clone Evidence</MenuItem>
        )}
      </Menu>

    </>
  )
}

export default EntityRow
