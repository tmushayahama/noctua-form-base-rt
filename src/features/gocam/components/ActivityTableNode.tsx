import type React from 'react'
import { useCallback, useRef } from 'react'
import { ActionIcon, Menu } from '@mantine/core'
import { usePopover } from '@/@noctua.core/hooks/usePopover'
import { FaEllipsisV, FaPlus } from 'react-icons/fa'
import type { Edge, UserContext, DisplayTreeNode } from '../models/cam'
import { RootTypes, Aspect } from '../models/cam'
import { EditorCategory } from '../models/editorCategory'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'
import EditableCell from '@/@noctua.core/components/cell/EditableCell'
import EvidenceRow from './EvidenceRow'
import { useAppDispatch } from '@/app/hooks'
import { openDialog, DialogComponent } from '@/@noctua.core/components/dialog/dialogSlice'
import {
  buildAddEvidenceToEdgeOperations,
  buildAddNodeOperations,
} from '../services/activityOperations'
import { useActivityNodeEditor } from '../hooks/useActivityNodeEditor'
import { getInsertMenuItems } from '../data/insertMenuConfig'
import type { InsertMenuItem } from '../data/insertMenuConfig'
import { getNodeCategory } from '../data/nodeCategories'
import { createEvidenceForm } from '../models/formModels'
import EditorDropdown from './forms/EditorDropdown'
import type { EditorDropdownValues } from './forms/EditorDropdown'

interface ActivityTableNodeProps {
  treeNode: DisplayTreeNode
  modelId: string
  userContext?: UserContext
  allEdges: Edge[]
  onNodeDeleted?: () => void
  gpNodeId?: string
}

function getAspectFromRootTypes(rootTypes: string[]): Aspect | null {
  if (rootTypes.includes(RootTypes.MOLECULAR_FUNCTION)) return Aspect.MOLECULAR_FUNCTION
  if (rootTypes.includes(RootTypes.BIOLOGICAL_PROCESS)) return Aspect.BIOLOGICAL_PROCESS
  if (rootTypes.includes(RootTypes.CELLULAR_COMPONENT)) return Aspect.CELLULAR_COMPONENT
  return null
}

// Aspect-based tree connector colors — mirrors EntityRow's TREE_BORDER.
// Null aspect (gene products, molecules) falls back to blue (GP).
const TREE_BORDER_BY_ASPECT: Record<Aspect, string> = {
  [Aspect.MOLECULAR_FUNCTION]: 'border-green-400',
  [Aspect.BIOLOGICAL_PROCESS]: 'border-orange-400',
  [Aspect.CELLULAR_COMPONENT]: 'border-purple-400',
}

// ── Main ActivityTableNode ──────────────────────────────────────────

const ActivityTableNode: React.FC<ActivityTableNodeProps> = ({
  treeNode,
  modelId,
  userContext,
  allEdges,
  onNodeDeleted,
  gpNodeId,
}) => {
  const dispatch = useAppDispatch()
  const { node, edge, children, treeLevel, canDelete, showEvidence, showMenu, showAddButton } =
    treeNode
  const evidence = edge?.evidence ?? []

  const termCellRef = useRef<HTMLDivElement>(null)
  const actionCellRef = useRef<HTMLDivElement>(null)
  const editor = usePopover<{ category: EditorCategory; insert: InsertMenuItem | null }>()

  const {
    updateGraphModel,
    resolvedUserContext,
    handleRemoveEvidence,
    handleClearField,
    handleDeleteNode: handleDeleteNodeRaw,
  } = useActivityNodeEditor({ nodeUid: node.uid, modelId, userContext, allEdges, onNodeDeleted })

  const usedEdges = allEdges
    .filter(e => e.sourceId === node.uid)
    .map(e => {
      const targetType =
        e.target?.rootTypes?.find(rt => getNodeCategory(rt)) ?? e.target?.rootTypes?.[0] ?? ''
      return { predicateId: e.id, targetType }
    })
  const insertMenuItems = getInsertMenuItems(node.rootTypes[0] ?? '', usedEdges)
  const termWidth = 250 - (treeLevel - 1) * 20
  const { aspect } = treeNode
  const treeBorder = aspect ? TREE_BORDER_BY_ASPECT[aspect] : 'border-blue-400'

  const handleSearchAnnotations = useCallback(() => {
    if (!gpNodeId || !aspect) return
    dispatch(
      openDialog({
        component: DialogComponent.SEARCH_ANNOTATIONS,
        title: 'Search Annotations',
        size: 'cam',
        fullWidth: true,
        showActions: false,
        bodyScroll: 'none',
        customProps: { gpId: gpNodeId, aspect },
      })
    )
  }, [gpNodeId, aspect, dispatch])

  const editorCategory = editor.data?.category ?? EditorCategory.term
  const pendingInsert = editor.data?.insert ?? null

  const handleEditorSave = useCallback(
    async (values: EditorDropdownValues) => {
      switch (editorCategory) {
        case EditorCategory.term: {
          if (!values.term) break
          await updateGraphModel(
            buildEditIndividualTypeOperations(node.uid, node.id, values.term.id, modelId)
          )
          break
        }
        case EditorCategory.evidenceAll: {
          if (!edge || !values.evidence) break
          const ev = {
            ...createEvidenceForm(),
            evidenceCode: { id: values.evidence.id, label: values.evidence.label },
            reference: values.reference || '',
            withFrom: values.with || '',
          }
          await updateGraphModel(
            buildAddEvidenceToEdgeOperations(
              edge.sourceId, edge.targetId, edge.id, ev, modelId, resolvedUserContext
            )
          )
          break
        }
        case EditorCategory.all: {
          if (!pendingInsert) break
          const ev = values.evidence
            ? {
              ...createEvidenceForm(),
              evidenceCode: { id: values.evidence.id, label: values.evidence.label },
              reference: values.reference || '',
              withFrom: values.with || '',
            }
            : undefined
          await updateGraphModel(
            buildAddNodeOperations(
              node.uid,
              pendingInsert.predicate.id,
              pendingInsert.targetType,
              modelId,
              resolvedUserContext,
              { termId: values.term?.id, evidence: ev }
            )
          )
          break
        }
      }
      editor.close()
    },
    [editorCategory, node.uid, node.id, edge, modelId, resolvedUserContext, updateGraphModel, pendingInsert, editor]
  )

  const handleDeleteNode = useCallback(async () => {
    await handleDeleteNodeRaw()
  }, [handleDeleteNodeRaw])

  const handleInsertNode = useCallback(
    (item: InsertMenuItem) => {
      if (actionCellRef.current) {
        editor.open(actionCellRef.current, { category: EditorCategory.all, insert: item })
      }
    },
    [editor]
  )

  return (
    <>
      <div className="mb-2 flex w-full flex-row items-stretch justify-start">
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

        {/* Term cell */}
        <EditableCell
          ref={termCellRef}
          label={treeNode.floatingLabel}
          onEdit={() => {
            if (termCellRef.current) {
              editor.open(termCellRef.current, { category: EditorCategory.term, insert: null })
            }
          }}
          onDelete={canDelete ? handleDeleteNode : undefined}
          className="shrink-0"
          style={{ flexBasis: termWidth }}
        >
          {node.label ? (
            <span>
              {node.label}
              <br />
              <a
                href={`${ENVIRONMENT.amigoTermUrl}${node.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {node.id}
              </a>
            </span>
          ) : (
            <span className="italic text-gray-400">—</span>
          )}
        </EditableCell>

        {/* Evidence cells */}
        {showEvidence && (
          <div className="flex min-w-0 flex-1 flex-col items-stretch p-0">
            {evidence.length > 0 ? (
              evidence.map(ev =>
                edge ? (
                  <EvidenceRow
                    key={ev.uid}
                    ev={ev}
                    modelId={modelId}
                    userContext={resolvedUserContext}
                    onRemoveEvidence={handleRemoveEvidence}
                    onClearField={handleClearField}
                  />
                ) : null
              )
            ) : (
              <div className="flex items-center px-2 py-1 text-2xs italic text-gray-400">
                no evidence present.
              </div>
            )}
          </div>
        )}

        {!showEvidence && <span className="grow" />}

        {/* Action cell */}
        <div ref={actionCellRef} className="flex w-10 shrink-0 flex-col items-center justify-center p-0">
          {showMenu && (
            <Menu shadow="md" position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="light" color="primary" radius="xl" size="md">
                  <FaEllipsisV size={12} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
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
                {edge && (
                  <Menu.Item
                    onClick={() => {
                      if (actionCellRef.current)
                        editor.open(actionCellRef.current, {
                          category: EditorCategory.evidenceAll,
                          insert: null,
                        })
                    }}
                  >
                    Add Evidence
                  </Menu.Item>
                )}
                {canDelete && (
                  <Menu.Item color="red" onClick={handleDeleteNode}>
                    Delete
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
          {showAddButton && insertMenuItems.length > 0 && (
            <Menu shadow="md" position="bottom-start" withinPortal>
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
          )}
        </div>
      </div>

      <EditorDropdown
        anchorEl={editor.anchor}
        category={editorCategory}
        onClose={editor.close}
        onSave={handleEditorSave}
        termLabel={pendingInsert?.label ?? treeNode.floatingLabel}
        termRootTypes={pendingInsert ? [pendingInsert.targetType] : node.rootTypes}
        initialTerm={pendingInsert ? null : node.id ? { id: node.id, label: node.label } : null}
        initialEvidence={null}
        initialReference=""
        initialWith=""
        hasAspect={Boolean(pendingInsert ? getAspectFromRootTypes([pendingInsert.targetType]) : aspect)}
        onSearchAnnotations={gpNodeId ? handleSearchAnnotations : undefined}
      />

      {children.map(child => (
        <ActivityTableNode
          key={child.node.uid}
          treeNode={child}
          modelId={modelId}
          userContext={resolvedUserContext}
          gpNodeId={gpNodeId}
          allEdges={allEdges}
          onNodeDeleted={onNodeDeleted}
        />
      ))}

    </>
  )
}

export { getAspectFromRootTypes }
export default ActivityTableNode
