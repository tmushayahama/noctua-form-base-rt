import type React from 'react'
import { useState, useCallback, useMemo, useRef } from 'react'
import { IconButton, Menu, MenuItem } from '@mui/material'
import { FaEllipsisV, FaPencilAlt, FaPlus, FaTrash } from 'react-icons/fa'
import type { Edge, Evidence, UserContext, DisplayTreeNode } from '../models/cam'
import { RootTypes } from '../models/cam'
import { EditorCategory } from '../models/editorCategory'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import type { RootState } from '@/app/store/store'
import { openDialog } from '@/@noctua.core/components/dialog/dialogSlice'
import { useUpdateGraphModelMutation } from '../slices/camApiSlice'
import {
  buildEditIndividualTypeOperations,
  buildEditEvidenceAnnotationOperations,
  buildAddEvidenceToEdgeOperations,
  buildRemoveEvidenceOperations,
  buildClearEvidenceAnnotationOperations,
  buildDeleteNodeOperations,
  buildAddNodeOperations,
} from '../services/activityOperations'
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

function getAspectFromRootTypes(rootTypes: string[]): string | null {
  if (rootTypes.includes(RootTypes.MOLECULAR_FUNCTION)) return 'F'
  if (rootTypes.includes(RootTypes.BIOLOGICAL_PROCESS)) return 'P'
  if (rootTypes.includes(RootTypes.CELLULAR_COMPONENT)) return 'C'
  return null
}

const cellBase =
  'group/cell relative break-words border border-[#aaa] px-[5px] py-2 text-xs text-black hover:border-primary-500'

const floatingLabel =
  'absolute left-1 -top-1.5 h-3 max-w-[80%] truncate bg-white px-1 text-[8px] leading-3 text-gray-500 group-hover/cell:text-primary-500'

const deleteBtn =
  'absolute right-0 top-0 hidden h-5 w-5 items-center justify-center text-red-400 hover:bg-red-400 hover:text-white group-hover/cell:flex'

const editBtn =
  'absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center text-gray-500 opacity-0 hover:bg-gray-200 group-hover/cell:opacity-100'

// ── Evidence row ────────────────────────────────────────────────────

interface EvidenceRowProps {
  ev: Evidence
  modelId: string
  userContext?: UserContext
  onRemoveEvidence: (ev: Evidence) => void
  onClearField: (ev: Evidence, key: 'source' | 'with') => void
}

const EvidenceRowComponent: React.FC<EvidenceRowProps> = ({
  ev,
  modelId,
  userContext,
  onRemoveEvidence,
  onClearField,
}) => {
  const [updateGraphModel] = useUpdateGraphModelMutation()
  const evCellRef = useRef<HTMLDivElement>(null)
  const refCellRef = useRef<HTMLDivElement>(null)
  const withCellRef = useRef<HTMLDivElement>(null)

  const [editorAnchor, setEditorAnchor] = useState<HTMLElement | null>(null)
  const [editorCategory, setEditorCategory] = useState<EditorCategory>(EditorCategory.evidence)

  const openEditor = (ref: React.RefObject<HTMLDivElement | null>, cat: EditorCategory) => {
    setEditorCategory(cat)
    setEditorAnchor(ref.current)
  }

  const handleEditorSave = useCallback(
    async (values: EditorDropdownValues) => {
      switch (editorCategory) {
        case EditorCategory.evidence: {
          if (!values.evidence || !ev.evidenceCode?.id) break
          await updateGraphModel(
            buildEditIndividualTypeOperations(ev.uid, ev.evidenceCode.id, values.evidence.id, modelId)
          )
          break
        }
        case EditorCategory.reference: {
          if (values.reference === undefined) break
          await updateGraphModel(
            buildEditEvidenceAnnotationOperations(
              ev.uid, 'source', ev.reference || '', values.reference, modelId, userContext
            )
          )
          break
        }
        case EditorCategory.with: {
          if (values.with === undefined) break
          await updateGraphModel(
            buildEditEvidenceAnnotationOperations(
              ev.uid, 'with', ev.with || '', values.with, modelId, userContext
            )
          )
          break
        }
      }
      setEditorAnchor(null)
    },
    [editorCategory, ev, modelId, userContext, updateGraphModel]
  )

  return (
    <div className="mb-2 flex h-full flex-row items-stretch last:mb-0">
      {/* Evidence code cell */}
      <div ref={evCellRef} className={`${cellBase} ml-1 flex grow flex-col items-stretch rounded-lg`}>
        <div className={floatingLabel}>Evidence</div>
        <span>
          {ev.evidenceCode?.label || '—'}
          {ev.evidenceCode?.id && (
            <>
              <br />
              <a
                href={`http://amigo.geneontology.org/amigo/term/${ev.evidenceCode.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {ev.evidenceCode.id}
              </a>
            </>
          )}
        </span>
        <button onClick={() => onRemoveEvidence(ev)} className={deleteBtn}>
          <FaTrash size={10} />
        </button>
        <button onClick={() => openEditor(evCellRef, EditorCategory.evidence)} className={editBtn}>
          <FaPencilAlt size={9} />
        </button>
      </div>

      {/* Reference cell */}
      <div ref={refCellRef} className={`${cellBase} ml-1 flex w-[100px] shrink-0 flex-col items-stretch rounded-lg`}>
        <div className={floatingLabel}>Reference</div>
        {ev.referenceUrl ? (
          <a href={ev.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {ev.reference}
          </a>
        ) : (
          <span>{ev.reference || '—'}</span>
        )}
        {ev.reference && (
          <button onClick={() => onClearField(ev, 'source')} className={deleteBtn}>
            <FaTrash size={10} />
          </button>
        )}
        <button onClick={() => openEditor(refCellRef, EditorCategory.reference)} className={editBtn}>
          <FaPencilAlt size={9} />
        </button>
      </div>

      {/* With cell */}
      <div ref={withCellRef} className={`${cellBase} ml-1 flex w-[100px] shrink-0 flex-col items-stretch rounded-lg`}>
        <div className={floatingLabel}>With</div>
        <span>{ev.with || '—'}</span>
        {ev.with && (
          <button onClick={() => onClearField(ev, 'with')} className={deleteBtn}>
            <FaTrash size={10} />
          </button>
        )}
        <button onClick={() => openEditor(withCellRef, EditorCategory.with)} className={editBtn}>
          <FaPencilAlt size={9} />
        </button>
      </div>

      <EditorDropdown
        anchorEl={editorAnchor}
        category={editorCategory}
        onClose={() => setEditorAnchor(null)}
        onSave={handleEditorSave}
        initialEvidence={ev.evidenceCode?.id ? ev.evidenceCode : null}
        initialReference={ev.reference || ''}
        initialWith={ev.with || ''}
      />
    </div>
  )
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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
  const [editorAnchor, setEditorAnchor] = useState<HTMLElement | null>(null)
  const [editorCategory, setEditorCategory] = useState<EditorCategory>(EditorCategory.term)
  const [pendingInsert, setPendingInsert] = useState<InsertMenuItem | null>(null)
  const [updateGraphModel] = useUpdateGraphModelMutation()
  const authUser = useAppSelector((state: RootState) => state.auth.user)

  const resolvedUserContext: UserContext | undefined = useMemo(() => {
    if (userContext) return userContext
    if (!authUser?.uri || !authUser?.group?.id) return undefined
    return { orcid: authUser.uri, groupUrl: authUser.group.id }
  }, [userContext, authUser])

  const insertMenuItems = getInsertMenuItems(node.rootTypes[0] ?? '')
  const nodePadding = treeLevel * 16
  const termWidth = 250 - nodePadding
  const { aspect } = treeNode

  const handleSearchAnnotations = useCallback(() => {
    if (!gpNodeId || !aspect) return
    dispatch(
      openDialog({
        component: 'SearchAnnotations',
        title: 'Search Annotations',
        size: 'md',
        fullWidth: true,
        showActions: false,
        customProps: { gpId: gpNodeId, aspect },
      })
    )
  }, [gpNodeId, aspect, dispatch])

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
          setPendingInsert(null)
          break
        }
      }
      setEditorAnchor(null)
    },
    [editorCategory, node.uid, node.id, edge, modelId, resolvedUserContext, updateGraphModel, pendingInsert]
  )

  const handleRemoveEvidence = useCallback(
    async (ev: Evidence) => {
      await updateGraphModel(buildRemoveEvidenceOperations(ev.uid, modelId))
    },
    [modelId, updateGraphModel]
  )

  const handleClearField = useCallback(
    async (ev: Evidence, key: 'source' | 'with') => {
      const oldValue = key === 'source' ? ev.reference : ev.with
      if (!oldValue) return
      const ops = buildClearEvidenceAnnotationOperations(ev.uid, key, oldValue, modelId, resolvedUserContext)
      if (ops.length > 0) await updateGraphModel(ops)
    },
    [modelId, resolvedUserContext, updateGraphModel]
  )

  const handleDeleteNode = useCallback(async () => {
    const nodeEdges = allEdges
      .filter(e => e.sourceId === node.uid || e.targetId === node.uid)
      .map(e => ({ sourceId: e.sourceId, targetId: e.targetId, predicateId: e.id }))
    await updateGraphModel(buildDeleteNodeOperations(node.uid, nodeEdges, modelId))
    setMenuAnchor(null)
    onNodeDeleted?.()
  }, [node.uid, allEdges, modelId, updateGraphModel, onNodeDeleted])

  const handleInsertNode = useCallback(
    (item: InsertMenuItem) => {
      setPendingInsert(item)
      setEditorCategory(EditorCategory.all)
      setEditorAnchor(actionCellRef.current)
      setAddMenuAnchor(null)
      setMenuAnchor(null)
    },
    []
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
                href={`http://amigo.geneontology.org/amigo/term/${node.id}`}
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
              setEditorCategory(EditorCategory.term)
              setEditorAnchor(termCellRef.current)
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
                  <EvidenceRowComponent
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
            <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} className="!h-10 !w-10 !shadow-md">
              <FaEllipsisV size={12} />
            </IconButton>
          )}
          {showAddButton && insertMenuItems.length > 0 && (
            <IconButton size="small" onClick={() => setAddMenuAnchor(actionCellRef.current)} className="!h-10 !w-10 !shadow-md">
              <FaPlus size={12} />
            </IconButton>
          )}
        </div>
      </div>

      <EditorDropdown
        anchorEl={editorAnchor}
        category={editorCategory}
        onClose={() => {
          setEditorAnchor(null)
          setPendingInsert(null)
        }}
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

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {insertMenuItems.length > 0 && (
          <MenuItem onClick={() => { setAddMenuAnchor(actionCellRef.current); setMenuAnchor(null) }}>
            Add
          </MenuItem>
        )}
        {edge && (
          <MenuItem onClick={() => { setEditorCategory(EditorCategory.evidenceAll); setEditorAnchor(actionCellRef.current); setMenuAnchor(null) }}>
            Add Evidence
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={handleDeleteNode} className="!text-red-600">Delete</MenuItem>
        )}
      </Menu>

      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={() => setAddMenuAnchor(null)}
        slotProps={{ paper: { className: '!bg-blue-100', sx: { maxWidth: 'none' } } }}
      >
        {insertMenuItems.map(item => (
          <MenuItem
            key={`${item.predicate.id}-${item.targetType}`}
            onClick={() => handleInsertNode(item)}
            className="!border-b !border-[rgba(59,89,152,0.6)] !py-1 !text-[10px] !leading-3"
          >
            <div className="flex w-full flex-col items-start justify-start">
              <span>{item.label}</span>
              <span className="text-xs text-gray-500">{item.rangeLabel}</span>
            </div>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export { getAspectFromRootTypes }
export default ActivityTableNode
