import type React from 'react'
import { useCallback, useMemo } from 'react'
import { ActionIcon, Menu } from '@mantine/core'
import { FaEllipsisV, FaPlus } from 'react-icons/fa'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
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
import { makeSelectModelTerms, selectModelEvidence } from '../../slices/camSlice'
import { getNodeCategory } from '../../data/nodeCategories'
import { getInsertMenuItems, DisplayGroup } from '../../data/insertMenuConfig'
import type { InsertMenuItem } from '../../data/insertMenuConfig'
import DatabaseField from './DatabaseField'

const TREE_BORDER: Record<DisplayGroup, string> = {
  [DisplayGroup.GP]: 'border-blue-400',
  [DisplayGroup.MF]: 'border-green-400',
  [DisplayGroup.BP]: 'border-orange-400',
  [DisplayGroup.CC]: 'border-purple-400',
}

interface EntityRowProps {
  node: TermNode
  relation: RelationNode | null
  parentTermUid: string | null
  treeLevel: number
  displayGroup?: DisplayGroup
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
  displayGroup,
  errors: _errors,
  displayMenuButton = true,
  displayAddButton = false,
  onSearchAnnotations,
  onCloneEvidence,
}) => {
  const treeBorder = displayGroup ? TREE_BORDER[displayGroup] : 'border-gray-400'
  const dispatch = useAppDispatch()
  const selectTerms = useMemo(makeSelectModelTerms, [])
  const termInitialOptions = useAppSelector(state => selectTerms(state, node.rootTypes))
  const evidenceInitialOptions = useAppSelector(selectModelEvidence)

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

  const handleToggleComplement = () => {
    dispatch(toggleComplement({ uid: node.uid }))
  }

  const handleAddEvidence = () => {
    if (relation) {
      dispatch(addEvidenceForm({ relationUid: relation.uid }))
    }
  }

  const handleRemoveLastEvidence = () => {
    if (relation && evidence.length > 0) {
      dispatch(
        removeEvidenceForm({
          relationUid: relation.uid,
          evidenceUid: evidence[evidence.length - 1].uid,
        })
      )
    }
  }

  const handleRemoveNode = () => {
    if (parentTermUid && relation) {
      dispatch(removeRelationForm({ parentTermUid, relationUid: relation.uid }))
    }
  }

  const handleFillRootTerm = () => {
    if (relation) {
      dispatch(fillRootTerm({ termUid: node.uid, relationUid: relation.uid }))
    }
  }

  const handleAddISSEvidence = () => {
    if (relation) {
      dispatch(addISSEvidence({ relationUid: relation.uid }))
    }
  }

  const handleClearValues = () => {
    if (relation) {
      dispatch(clearNodeValues({ termUid: node.uid, relationUid: relation.uid }))
    }
  }

  const handleCloneEvidence = () => {
    if (relation && onCloneEvidence) {
      onCloneEvidence(relation.uid)
    }
  }

  const handleSearchAnnotations = () => {
    if (onSearchAnnotations) {
      onSearchAnnotations(node, relation)
    }
  }

  const insertMenuItems = getInsertMenuItems(
    node.category,
    node.relations.map(r => ({ predicateId: r.predicate.id, targetType: r.target.category }))
  )

  const handleInsertNode = (item: InsertMenuItem) => {
    const targetCategory = getNodeCategory(item.targetType)
    dispatch(
      addRelationForm({
        parentTermUid: node.uid,
        predicate: item.predicate,
        nodeType: item.targetType,
        label: targetCategory?.label ?? item.targetType,
        rootTypes: targetCategory?.searchClosureIds ?? [item.targetType],
        aspect: targetCategory?.aspect ?? null,
      })
    )
  }

  return (
    <div className="flex w-full flex-row items-stretch justify-start">
      {/* Tree connector lines */}
      {treeLevel > 1 &&
        Array.from({ length: treeLevel - 1 }, (_, i) => {
          const isConnector = i === treeLevel - 2
          return (
            <div key={i} className="relative flex w-5 shrink-0 flex-col items-stretch">
              <div className={`ml-2 h-full border-l-2 ${treeBorder}`} />
              {isConnector && (
                <div className={`absolute left-2 right-0 top-1/2 border-t-2 ${treeBorder}`} />
              )}
            </div>
          )
        })}

      {/* Term field */}
      <div
        className="min-w-0 shrink p-1"
        style={{ flexBasis: 250 - (treeLevel - 1) * 20 }}
      >
        <TermAutocomplete
          label={node.label}
          name={`term-${node.uid}`}
          autocompleteType={AutocompleteType.TERM}
          rootTypeIds={node.rootTypes}
          value={node.term}
          onChange={handleTermChange}
          variant="outlined"
          initialOptions={termInitialOptions}
        />
      </div>

      {/* Evidence columns */}
      {node.showEvidence !== false && (
        <div className="flex min-w-0 flex-1 flex-col items-stretch justify-start">
          {evidence.map(ev => (
            <div
              key={ev.uid}
              className="flex w-full flex-row items-stretch justify-start"
            >
              <div className="w-1/2 p-1">
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
                  initialOptions={evidenceInitialOptions}
                />
              </div>
              <div className="w-1/4 p-1">
                <DatabaseField
                  type="reference"
                  value={ev.reference}
                  onChange={value => handleEvidenceFieldChange(ev, 'reference', value)}
                />
              </div>
              <div className="w-1/4 p-1">
                <DatabaseField
                  type="with"
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
        <div className="flex shrink-0 items-center justify-center px-2">
          <Menu shadow="md" position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="light" color="primary" radius="xl" size="md">
                <FaEllipsisV size={12} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {node.aspect && (
                <Menu.Item onClick={handleSearchAnnotations}>Search Annotations</Menu.Item>
              )}
              <Menu.Item onClick={handleToggleComplement}>NOT Qualifier</Menu.Item>

              {insertMenuItems.length > 0 && (
                <Menu.Sub position="left-start">
                  <Menu.Sub.Target>
                    <Menu.Sub.Item>Add</Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown>
                    {insertMenuItems.map(item => (
                      <Menu.Item
                        key={`${item.predicate.id}-${item.targetType}`}
                        onClick={() => handleInsertNode(item)}
                      >
                        <div className="flex flex-col items-start">
                          <span>{item.label}</span>
                          <span className="text-xs text-gray-500">{item.rangeLabel}</span>
                        </div>
                      </Menu.Item>
                    ))}
                  </Menu.Sub.Dropdown>
                </Menu.Sub>
              )}

              {relation && (
                <Menu.Sub position="left-start">
                  <Menu.Sub.Target>
                    <Menu.Sub.Item>Evidence</Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown>
                    <Menu.Item onClick={handleAddEvidence}>Add Evidence</Menu.Item>
                    {evidence.length > 0 && (
                      <Menu.Item onClick={handleRemoveLastEvidence}>Remove Evidence</Menu.Item>
                    )}
                    {onCloneEvidence && (
                      <Menu.Item onClick={handleCloneEvidence}>Clone Evidence</Menu.Item>
                    )}
                  </Menu.Sub.Dropdown>
                </Menu.Sub>
              )}

              {node.aspect && relation && (
                <Menu.Item onClick={handleFillRootTerm}>Fill with root term</Menu.Item>
              )}
              {node.aspect && relation && (
                <Menu.Item onClick={handleAddISSEvidence}>Add ISS Evidence</Menu.Item>
              )}
              <Menu.Item onClick={handleClearValues}>Clear Values</Menu.Item>
              {node.canDelete && parentTermUid && (
                <Menu.Item color="red" onClick={handleRemoveNode}>
                  Remove
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        </div>
      )}

      {/* Add button — same slot as the ellipsis so position matches across sections */}
      {displayAddButton && insertMenuItems.length > 0 && (
        <div className="flex shrink-0 items-center justify-center px-2">
          <Menu shadow="md" position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="light" color="primary" radius="xl" size="md">
                <FaPlus size={12} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {insertMenuItems.map(item => (
                <Menu.Item
                  key={`${item.predicate.id}-${item.targetType}`}
                  onClick={() => handleInsertNode(item)}
                >
                  <div className="flex flex-col items-start">
                    <span>{item.label}</span>
                    <span className="text-xs text-gray-500">{item.rangeLabel}</span>
                  </div>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </div>
      )}
    </div>
  )
}

export default EntityRow
