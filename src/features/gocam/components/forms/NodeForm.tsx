import { useAppDispatch } from '@/app/hooks'
import TermAutocomplete from '@/features/search/components/Autocomplete2'
import type { GOlrResponse } from '@/features/search/models/search'
import { AutocompleteType } from '@/features/search/models/search'
import { IconButton, Menu, MenuItem } from '@mui/material'
import { useMemo, useCallback } from 'react'
import type { TreeNode } from '../../models/cam'
import { RootTypes } from '../../models/cam'
import {
  updateNode,
  updateEvidence,
  addChildNode,
  addEvidence,
  removeEvidence,
  cloneEvidence,
  clearNodeValues,
  toggleNotQualifier,
  removeNode,
  fillRootTerm,
  addISSEvidence,
} from '../../slices/activityFormSlice'
import useNestedMenu from '../../hooks/useNestedMenu'
import { getAvailablePredicates } from '../../services/shapeService'
import { getRelationLabel, getTermLabel } from '@/@noctua.core/utils/dataUtil'
import { FiX } from 'react-icons/fi'
import { FaEllipsisV, FaPlus } from 'react-icons/fa'

interface NodeFormProps {
  node: TreeNode
  onOpenDialog: (node: TreeNode) => void
  displayMenuButton?: boolean
  displayAddButton?: boolean
}

/**
 * Renders a single node row: term (left, flex-1) + evidence section (right, basis-65%).
 * Matches Angular's entity-form.component.html layout.
 * Does NOT render children or wrapper — parent handles those.
 */
const NodeForm: React.FC<NodeFormProps> = ({
  node,
  onOpenDialog,
  displayMenuButton = true,
  displayAddButton = false,
}) => {
  const dispatch = useAppDispatch()
  const {
    mainMenuAnchor,
    relationMenuAnchor,
    evidenceMenuAnchor,
    isMainMenuOpen,
    isRelationMenuOpen,
    isEvidenceMenuOpen,
    openMainMenu,
    closeMainMenu,
    openRelationMenu,
    closeRelationMenu,
    openEvidenceMenu,
    closeEvidenceMenu,
  } = useNestedMenu()

  const handleOpenDialog = () => {
    onOpenDialog(node)
    closeMainMenu()
  }

  const availablePredicates = useMemo(
    () => getAvailablePredicates(node.rootTypes),
    [node.rootTypes]
  )

  const handleTermChange = useCallback(
    (term: GOlrResponse | null) => {
      if (!term) return
      dispatch(updateNode({ uid: node.uid, term }))
    },
    [dispatch, node.uid]
  )

  const handleEvidenceFieldChange = useCallback(
    (
      evidenceIndex: number,
      field: 'evidenceCode' | 'reference' | 'withFrom',
      value: GOlrResponse | string | null
    ) => {
      if (value === null) return
      dispatch(
        updateEvidence({
          uid: node.uid,
          evidenceIndex,
          field,
          value: value as GOlrResponse | string,
        })
      )
    },
    [dispatch, node.uid]
  )

  const handleRelationSelect = useCallback(
    (predicateId: string, objects: string[]) => {
      dispatch(
        addChildNode({
          parentId: node.uid,
          relation: { id: predicateId, label: getRelationLabel(predicateId) },
          rootTypes: objects.map(objId => ({ id: objId, label: getTermLabel(objId) })),
        })
      )
      closeRelationMenu()
      closeMainMenu()
    },
    [dispatch, node.uid, closeRelationMenu, closeMainMenu]
  )

  const handleAddEvidence = useCallback(() => {
    dispatch(addEvidence(node.uid))
    closeEvidenceMenu()
    closeMainMenu()
  }, [dispatch, node.uid, closeEvidenceMenu, closeMainMenu])

  const handleRemoveEvidence = useCallback(
    (index: number) => {
      dispatch(removeEvidence({ uid: node.uid, evidenceIndex: index }))
    },
    [dispatch, node.uid]
  )

  const handleCloneEvidence = useCallback(() => {
    dispatch(cloneEvidence({ uid: node.uid, evidenceIndex: 0 }))
    closeEvidenceMenu()
    closeMainMenu()
  }, [dispatch, node.uid, closeEvidenceMenu, closeMainMenu])

  const handleRemoveEvidenceMenu = useCallback(() => {
    dispatch(removeEvidence({ uid: node.uid, evidenceIndex: 0 }))
    closeEvidenceMenu()
    closeMainMenu()
  }, [dispatch, node.uid, closeEvidenceMenu, closeMainMenu])

  const handleFillRootTerm = useCallback(() => {
    dispatch(fillRootTerm(node.uid))
    closeMainMenu()
  }, [dispatch, node.uid, closeMainMenu])

  const handleAddISSEvidence = useCallback(() => {
    dispatch(addISSEvidence(node.uid))
    closeMainMenu()
  }, [dispatch, node.uid, closeMainMenu])

  const handleClearValues = useCallback(() => {
    dispatch(clearNodeValues(node.uid))
    closeMainMenu()
  }, [dispatch, node.uid, closeMainMenu])

  const handleToggleNot = useCallback(() => {
    if (node.children.length > 0) {
      alert('Cannot add NOT qualifier: remove extension rows first.')
      closeMainMenu()
      return
    }
    dispatch(toggleNotQualifier(node.uid))
    closeMainMenu()
  }, [dispatch, node.uid, node.children.length, closeMainMenu])

  const handleDeleteRow = useCallback(() => {
    dispatch(removeNode(node.uid))
    closeMainMenu()
  }, [dispatch, node.uid, closeMainMenu])

  const autocompleteLabel =
    node.parentId === null
      ? node.rootTypes.map(rt => rt.label).join(', ')
      : `${node.relation?.label || ''} (${node.rootTypes.map(rt => rt.label).join(', ')})`

  return (
    <>
      {/* Entity row: term (flex-1) + evidence section (basis-65%) */}
      <div className="flex w-full items-stretch">
        {/* Term field — left */}
        <div className="flex min-w-0 flex-1 items-start p-4">
          <div className="flex w-full items-center gap-1">
            <div className="flex-1">
              <TermAutocomplete
                label={autocompleteLabel}
                name={`term-${node.uid}`}
                rootTypeIds={node.rootTypes.map(rt => rt.id)}
                autocompleteType={AutocompleteType.TERM}
                value={node.term || null}
                onChange={handleTermChange}
                onOpenTermDetails={() => {}}
              />
            </div>
          </div>
        </div>

        {/* Evidence section — right, basis-65% */}
        <div className="flex min-w-0 basis-[65%] flex-col">
          {node.evidences.map((ev, index) => (
            <div key={ev.uuid} className="flex w-full items-stretch">
              <div className="w-1/2 p-4">
                <TermAutocomplete
                  label="Evidence"
                  name={`evidence-${node.uid}-${index}`}
                  rootTypeIds={[RootTypes.EVIDENCE]}
                  autocompleteType={AutocompleteType.EVIDENCE_CODE}
                  value={ev.evidenceCode?.id ? ev.evidenceCode : null}
                  onChange={value => handleEvidenceFieldChange(index, 'evidenceCode', value)}
                  onOpenTermDetails={() => {}}
                />
              </div>
              <div className="w-1/4 p-4">
                <TermAutocomplete
                  label="Reference"
                  name={`reference-${node.uid}-${index}`}
                  autocompleteType={AutocompleteType.REFERENCE}
                  value={ev.reference || ''}
                  onChange={value => handleEvidenceFieldChange(index, 'reference', value as string)}
                  onOpenTermDetails={() => {}}
                  onOpenReference={() => {}}
                />
              </div>
              <div className="w-1/4 p-4">
                <TermAutocomplete
                  label="With"
                  name={`with-${node.uid}-${index}`}
                  autocompleteType={AutocompleteType.WITH}
                  value={ev.withFrom || ''}
                  onChange={value => handleEvidenceFieldChange(index, 'withFrom', value as string)}
                  onOpenTermDetails={() => {}}
                />
              </div>
              {displayMenuButton && (
                <div className="flex shrink-0 items-center justify-center p-4">
                  {index === 0 ? (
                    <IconButton size="small" className="!shadow" onClick={openMainMenu}>
                      <FaEllipsisV size={12} />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveEvidence(index)}
                      className="!text-gray-400 hover:!text-red-500"
                    >
                      <FiX size={14} />
                    </IconButton>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add button (for GP section — displayAddButton=true, displayMenuButton=false) */}
      {displayAddButton && availablePredicates.length > 0 && (
        <div className="mt-2 px-4 pb-2">
          <IconButton size="small" className="!shadow" onClick={openRelationMenu}>
            <FaPlus size={10} />
          </IconButton>
        </div>
      )}

      {/* Menus */}
      <Menu anchorEl={mainMenuAnchor} open={isMainMenuOpen} onClose={closeMainMenu}>
        {node.aspect && <MenuItem onClick={handleOpenDialog}>Search Annotations</MenuItem>}
        <MenuItem onClick={handleToggleNot}>
          {node.isComplement ? 'Remove NOT Qualifier' : 'NOT Qualifier'}
        </MenuItem>
        {availablePredicates.length > 0 && (
          <MenuItem onClick={event => openRelationMenu(event)}>Add</MenuItem>
        )}
        <MenuItem onClick={event => openEvidenceMenu(event)}>Evidence</MenuItem>
        {node.aspect && <MenuItem onClick={handleFillRootTerm}>Fill with root term</MenuItem>}
        {node.aspect && <MenuItem onClick={handleAddISSEvidence}>Add ISS Evidence</MenuItem>}
        <MenuItem onClick={handleClearValues}>Clear Values</MenuItem>
        {node.parentId !== null && (
          <MenuItem onClick={handleDeleteRow} className="!text-red-600">
            Delete Row
          </MenuItem>
        )}
      </Menu>

      <Menu anchorEl={relationMenuAnchor} open={isRelationMenuOpen} onClose={closeRelationMenu}>
        {availablePredicates.map(predicate => (
          <MenuItem
            key={predicate.id}
            onClick={() => handleRelationSelect(predicate.id, predicate.objects)}
          >
            <div className="flex w-full flex-col items-start">
              <span>{predicate.label}</span>
            </div>
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={evidenceMenuAnchor}
        open={isEvidenceMenuOpen}
        onClose={closeEvidenceMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem onClick={handleAddEvidence}>Add Evidence</MenuItem>
        <MenuItem onClick={handleRemoveEvidenceMenu}>Remove Evidence</MenuItem>
        <MenuItem onClick={handleCloneEvidence}>Clone Evidence</MenuItem>
      </Menu>
    </>
  )
}

export default NodeForm
