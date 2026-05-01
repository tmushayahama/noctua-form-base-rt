import type React from 'react'
import { useCallback, useRef } from 'react'
import { ActionIcon } from '@mantine/core'
import AnchoredMenu, { MenuItem } from '@/@noctua.core/components/menu/AnchoredMenu'
import { usePopover } from '@/@noctua.core/hooks/usePopover'
import { FaEllipsisV, FaPencilAlt, FaPlus, FaTrash } from 'react-icons/fa'
import type { Edge, UserContext, DisplayTreeNode } from '../models/cam'
import { RootTypes, Aspect } from '../models/cam'
import { EditorCategory } from '../models/editorCategory'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'
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

const cellBase =
  'group/cell relative break-words border border-[#aaa] px-[5px] py-2 text-xs text-black hover:border-primary-500'

const floatingLabel =
  'absolute left-1 -top-1.5 h-3 max-w-[80%] truncate bg-white px-1 text-[8px] leading-3 text-gray-500 group-hover/cell:text-primary-500'

const deleteBtn =
  'absolute right-0 top-0 hidden h-5 w-5 items-center justify-center text-red-400 hover:bg-red-400 hover:text-white group-hover/cell:flex'

const editBtn =
  'absolute right-0 bottom-0 hidden h-5 w-5 items-center justify-center text-gray-400 hover:bg-primary-500 hover:text-white group-hover/cell:flex'

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
  const nodeMenu = usePopover()
  const addMenu = usePopover()
  const editor = usePopover<{ category: EditorCategory; insert: InsertMenuItem | null }>()

  const {
    updateGraphModel,
    resolvedUserContext,
    handleRemoveEvidence,
    handleClearField,
    handleDeleteNode: handleDeleteNodeRaw,
  } = useActivityNodeEditor({ nodeUid: node.uid, modelId, userContext, allEdges, onNodeDeleted })

  const insertMenuItems = getInsertMenuItems(node.rootTypes[0] ?? '')
  const nodePadding = treeLevel * 16
  const termWidth = 250 - nodePadding
  const { aspect } = treeNode

  const handleSearchAnnotations = useCallback(() => {
    if (!gpNodeId || !aspect) return
    dispatch(
      openDialog({
        component: DialogComponent.SEARCH_ANNOTATIONS,
        title: 'Search Annotations',
        size: 'md',
        fullWidth: true,
        showActions: false,
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
    nodeMenu.close()
  }, [handleDeleteNodeRaw, nodeMenu])

  const handleInsertNode = useCallback(
    (item: InsertMenuItem) => {
      if (actionCellRef.current) {
        editor.open(actionCellRef.current, { category: EditorCategory.all, insert: item })
      }
      addMenu.close()
      nodeMenu.close()
    },
    [editor, addMenu, nodeMenu]
  )

  return (
    <>
      <div
        className="mb-2 flex w-full flex-row items-stretch justify-start"
        style={{ paddingLeft: nodePadding }}
      >
        {/* Term cell */}
        <div
          ref={termCellRef}
          className={`${cellBase} shrink-0 rounded-md`}
          style={{ flexBasis: termWidth }}
        >
          <div className={floatingLabel}>{treeNode.floatingLabel}</div>
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
          {canDelete && (
            <button onClick={handleDeleteNode} className={deleteBtn}>
              <FaTrash size={10} />
            </button>
          )}
          <button
            onClick={() => {
              if (termCellRef.current) {
                editor.open(termCellRef.current, { category: EditorCategory.term, insert: null })
              }
            }}
            className={editBtn}
          >
            <FaPencilAlt size={9} />
          </button>
        </div>

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
              <div className="flex items-center px-2 py-1 text-[10px] italic text-gray-400">
                no evidence present.
              </div>
            )}
          </div>
        )}

        {!showEvidence && <span className="grow" />}

        {/* Action cell */}
        <div ref={actionCellRef} className="flex w-10 shrink-0 flex-col items-center justify-center p-0">
          {showMenu && (
            <ActionIcon variant="subtle" color="gray" size="md" onClick={e => nodeMenu.open(e.currentTarget)} className="!h-10 !w-10 !shadow-md">
              <FaEllipsisV size={12} />
            </ActionIcon>
          )}
          {showAddButton && insertMenuItems.length > 0 && (
            <ActionIcon variant="subtle" color="gray" size="md" onClick={() => { if (actionCellRef.current) addMenu.open(actionCellRef.current) }} className="!h-10 !w-10 !shadow-md">
              <FaPlus size={12} />
            </ActionIcon>
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

      <AnchoredMenu anchorEl={nodeMenu.anchor} open={nodeMenu.isOpen} onClose={nodeMenu.close}>
        {insertMenuItems.length > 0 && (
          <MenuItem onClick={() => { if (actionCellRef.current) addMenu.open(actionCellRef.current); nodeMenu.close() }}>
            Add
          </MenuItem>
        )}
        {edge && (
          <MenuItem onClick={() => { if (actionCellRef.current) editor.open(actionCellRef.current, { category: EditorCategory.evidenceAll, insert: null }); nodeMenu.close() }}>
            Add Evidence
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={handleDeleteNode} className="text-red-600">Delete</MenuItem>
        )}
      </AnchoredMenu>

      <AnchoredMenu
        anchorEl={addMenu.anchor}
        open={addMenu.isOpen}
        onClose={addMenu.close}
        className="!bg-blue-100"
      >
        {insertMenuItems.map(item => (
          <MenuItem
            key={`${item.predicate.id}-${item.targetType}`}
            onClick={() => handleInsertNode(item)}
            className="border-b border-[rgba(59,89,152,0.6)] py-1 text-[10px] leading-3"
          >
            <div className="flex w-full flex-col items-start justify-start">
              <span>{item.label}</span>
              <span className="text-xs text-gray-500">{item.rangeLabel}</span>
            </div>
          </MenuItem>
        ))}
      </AnchoredMenu>
    </>
  )
}

export { getAspectFromRootTypes }
export default ActivityTableNode
