import type React from 'react'
import { useState, useCallback, useMemo, useRef } from 'react'
import { IconButton, Menu, MenuItem } from '@mui/material'
import { FaEllipsisV, FaPencilAlt, FaPlus, FaTrash } from 'react-icons/fa'
import type { GraphNode, Edge, Evidence, UserContext } from '../models/cam'
import { RootTypes } from '../models/cam'
import { EditorCategory } from '../models/editorCategory'
import { useAppSelector } from '@/app/hooks'
import type { RootState } from '@/app/store/store'
import { useUpdateGraphModelMutation } from '../slices/camApiSlice'
import {
  buildEditIndividualTypeOperations,
  buildEditEvidenceAnnotationOperations,
  buildAddEvidenceToEdgeOperations,
  buildRemoveEvidenceOperations,
  buildDeleteNodeOperations,
  buildAddNodeOperations,
} from '../services/activityOperations'
import { getNodeCategory, getExtensionRelations } from '../data/nodeCategories'
import { createEvidenceForm } from '../models/formModels'
import EditorDropdown from './forms/EditorDropdown'
import type { EditorDropdownValues } from './forms/EditorDropdown'

// ── Types ────────────────────────────────────────────────────────────

export interface DisplayTreeNode {
  node: GraphNode
  edge: Edge | null
  children: DisplayTreeNode[]
  treeLevel: number
  canDelete: boolean
  aspect: string | null
  floatingLabel: string
  showEvidence: boolean
  showMenu: boolean
  showAddButton: boolean
}

interface ActivityTableNodeProps {
  treeNode: DisplayTreeNode
  modelId: string
  userContext?: UserContext
  allEdges: Edge[]
  onNodeDeleted?: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────

function getAspectFromRootTypes(rootTypes: string[]): string | null {
  if (rootTypes.includes(RootTypes.MOLECULAR_FUNCTION)) return 'F'
  if (rootTypes.includes(RootTypes.BIOLOGICAL_PROCESS)) return 'P'
  if (rootTypes.includes(RootTypes.CELLULAR_COMPONENT)) return 'C'
  return null
}

// ── Shared cell styling (matching Angular .noc-entity-cell / .noc-box-cell) ──

const cellBase =
  'group/cell relative break-words border border-[#aaa] px-[5px] py-2 text-xs text-black hover:border-primary-500'

const floatingLabelClasses =
  'absolute left-1 -top-1.5 h-3 max-w-[80%] truncate bg-white px-1 text-[8px] leading-3 text-gray-500 group-hover/cell:text-primary-500'

// ── Evidence row ────────────────────────────────────────────────────

interface EvidenceRowProps {
  ev: Evidence
  edge: Edge
  modelId: string
  userContext?: UserContext
  onRemoveEvidence: (ev: Evidence) => void
}

const EvidenceRowComponent: React.FC<EvidenceRowProps> = ({
  ev,
  edge: _edge,
  modelId,
  userContext,
  onRemoveEvidence,
}) => {
  const [updateGraphModel] = useUpdateGraphModelMutation()

  // Cell refs for stable popover anchoring
  const evCellRef = useRef<HTMLDivElement>(null)
  const refCellRef = useRef<HTMLDivElement>(null)
  const withCellRef = useRef<HTMLDivElement>(null)

  // Which editor is open (only one at a time per evidence row)
  const [editorAnchor, setEditorAnchor] = useState<HTMLElement | null>(null)
  const [editorCategory, setEditorCategory] = useState<EditorCategory>(EditorCategory.evidence)

  const openEditor = (ref: React.RefObject<HTMLDivElement | null>, cat: EditorCategory) => {
    setEditorCategory(cat)
    setEditorAnchor(ref.current)
  }

  const closeEditor = () => setEditorAnchor(null)

  const handleEditorSave = useCallback(
    async (values: EditorDropdownValues) => {
      switch (editorCategory) {
        case EditorCategory.evidence: {
          if (!values.evidence || !ev.evidenceCode?.id) break
          const ops = buildEditIndividualTypeOperations(
            ev.uid,
            ev.evidenceCode.id,
            values.evidence.id,
            modelId
          )
          await updateGraphModel(ops)
          break
        }
        case EditorCategory.reference: {
          if (values.reference === undefined) break
          const ops = buildEditEvidenceAnnotationOperations(
            ev.uid,
            'source',
            ev.reference || '',
            values.reference,
            modelId,
            userContext
          )
          await updateGraphModel(ops)
          break
        }
        case EditorCategory.with: {
          if (values.with === undefined) break
          const ops = buildEditEvidenceAnnotationOperations(
            ev.uid,
            'with',
            ev.with || '',
            values.with,
            modelId,
            userContext
          )
          await updateGraphModel(ops)
          break
        }
      }
      closeEditor()
    },
    [editorCategory, ev, modelId, userContext, updateGraphModel]
  )

  return (
    <div className="mb-2 flex h-full flex-row items-stretch last:mb-0">
      {/* Evidence code cell — grows */}
      <div
        ref={evCellRef}
        className={`${cellBase} ml-1 flex grow flex-col items-stretch rounded-lg`}
      >
        <div className={floatingLabelClasses}>Evidence</div>
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
        <button
          onClick={() => onRemoveEvidence(ev)}
          className="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center text-red-400 hover:bg-red-400 hover:text-white group-hover/cell:flex"
        >
          <FaTrash size={10} />
        </button>
        <button
          onClick={() => openEditor(evCellRef, EditorCategory.evidence)}
          className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center text-gray-500 opacity-0 hover:bg-gray-200 group-hover/cell:opacity-100"
        >
          <FaPencilAlt size={9} />
        </button>
      </div>

      {/* Reference cell — 100px */}
      <div
        ref={refCellRef}
        className={`${cellBase} ml-1 flex w-[100px] shrink-0 flex-col items-stretch rounded-lg`}
      >
        <div className={floatingLabelClasses}>Reference</div>
        {ev.referenceUrl ? (
          <a
            href={ev.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {ev.reference}
          </a>
        ) : (
          <span>{ev.reference || '—'}</span>
        )}
        <button
          onClick={() => onRemoveEvidence(ev)}
          className="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center text-red-400 hover:bg-red-400 hover:text-white group-hover/cell:flex"
        >
          <FaTrash size={10} />
        </button>
        <button
          onClick={() => openEditor(refCellRef, EditorCategory.reference)}
          className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center text-gray-500 opacity-0 hover:bg-gray-200 group-hover/cell:opacity-100"
        >
          <FaPencilAlt size={9} />
        </button>
      </div>

      {/* With cell — 100px */}
      <div
        ref={withCellRef}
        className={`${cellBase} ml-1 flex w-[100px] shrink-0 flex-col items-stretch rounded-lg`}
      >
        <div className={floatingLabelClasses}>With</div>
        <span>{ev.with || '—'}</span>
        <button
          onClick={() => onRemoveEvidence(ev)}
          className="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center text-red-400 hover:bg-red-400 hover:text-white group-hover/cell:flex"
        >
          <FaTrash size={10} />
        </button>
        <button
          onClick={() => openEditor(withCellRef, EditorCategory.with)}
          className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center text-gray-500 opacity-0 hover:bg-gray-200 group-hover/cell:opacity-100"
        >
          <FaPencilAlt size={9} />
        </button>
      </div>

      {/* Single EditorDropdown for all evidence cell editing */}
      <EditorDropdown
        anchorEl={editorAnchor}
        category={editorCategory}
        onClose={closeEditor}
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
}) => {
  const {
    node,
    edge,
    children,
    treeLevel,
    canDelete,
    floatingLabel,
    showEvidence,
    showMenu,
    showAddButton,
  } = treeNode
  const evidence = edge?.evidence ?? []

  const termCellRef = useRef<HTMLDivElement>(null)
  const actionCellRef = useRef<HTMLDivElement>(null)

  // Entity menu
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  // Add child submenu
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)

  // EditorDropdown state (single instance for this node)
  const [editorAnchor, setEditorAnchor] = useState<HTMLElement | null>(null)
  const [editorCategory, setEditorCategory] = useState<EditorCategory>(EditorCategory.term)

  const [updateGraphModel] = useUpdateGraphModelMutation()
  const authUser = useAppSelector((state: RootState) => state.auth.user)

  const resolvedUserContext: UserContext | undefined = useMemo(() => {
    if (userContext) return userContext
    if (!authUser?.uri || !authUser?.group?.id) return undefined
    return { orcid: authUser.uri, groupUrl: authUser.group.id }
  }, [userContext, authUser])

  const category = getNodeCategory(
    node.rootTypes.find(
      rt =>
        rt === RootTypes.MOLECULAR_FUNCTION ||
        rt === RootTypes.BIOLOGICAL_PROCESS ||
        rt === RootTypes.CELLULAR_COMPONENT ||
        rt === RootTypes.MOLECULAR_ENTITY ||
        rt === RootTypes.CHEMICAL_ENTITY ||
        rt === RootTypes.PROTEIN_CONTAINING_COMPLEX ||
        rt === RootTypes.ANATOMICAL_ENTITY ||
        rt === RootTypes.CELL_TYPE ||
        rt === RootTypes.ORGANISM ||
        rt === RootTypes.BIOLOGICAL_PHASE
    ) ?? ''
  )
  const extensionRelations = category ? getExtensionRelations(category) : []

  // Angular: relationWidth = 250 - (entity.treeLevel * 16) + 'px'
  const termWidth = Math.max(250 - treeLevel * 16, 100)

  // ── Editor open helpers ──

  const openTermEditor = () => {
    setEditorCategory(EditorCategory.term)
    setEditorAnchor(termCellRef.current)
  }

  const openAddEvidenceEditor = () => {
    setEditorCategory(EditorCategory.evidenceAll)
    setEditorAnchor(actionCellRef.current)
    setMenuAnchor(null)
  }

  const closeEditor = () => setEditorAnchor(null)

  // ── Editor save handler (dispatches based on category) ──

  const handleEditorSave = useCallback(
    async (values: EditorDropdownValues) => {
      switch (editorCategory) {
        case EditorCategory.term: {
          if (!values.term) break
          const ops = buildEditIndividualTypeOperations(
            node.uid,
            node.id,
            values.term.id,
            modelId
          )
          await updateGraphModel(ops)
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
          const ops = buildAddEvidenceToEdgeOperations(
            edge.sourceId,
            edge.targetId,
            edge.id,
            ev,
            modelId,
            resolvedUserContext
          )
          await updateGraphModel(ops)
          break
        }
      }
      closeEditor()
    },
    [editorCategory, node.uid, node.id, edge, modelId, resolvedUserContext, updateGraphModel]
  )

  // ── Other handlers ──

  const handleRemoveEvidence = useCallback(
    async (ev: Evidence) => {
      const ops = buildRemoveEvidenceOperations(ev.uid, modelId)
      await updateGraphModel(ops)
    },
    [modelId, updateGraphModel]
  )

  const handleDeleteNode = useCallback(async () => {
    const nodeEdges = allEdges
      .filter(e => e.sourceId === node.uid || e.targetId === node.uid)
      .map(e => ({ sourceId: e.sourceId, targetId: e.targetId, predicateId: e.id }))
    const ops = buildDeleteNodeOperations(node.uid, nodeEdges, modelId)
    await updateGraphModel(ops)
    setMenuAnchor(null)
    onNodeDeleted?.()
  }, [node.uid, allEdges, modelId, updateGraphModel, onNodeDeleted])

  const handleInsertNode = useCallback(
    async (predicateId: string, typeId: string) => {
      const ops = buildAddNodeOperations(
        node.uid,
        predicateId,
        typeId,
        modelId,
        resolvedUserContext
      )
      await updateGraphModel(ops)
      setAddMenuAnchor(null)
      setMenuAnchor(null)
    },
    [node.uid, modelId, resolvedUserContext, updateGraphModel]
  )

  return (
    <>
      {/* Row: [term cell] [evidence cells] [action cell (40px)] */}
      <div className="mb-2 flex w-full flex-row items-stretch justify-start">
        {/* ── Term cell ── */}
        <div
          ref={termCellRef}
          className={`${cellBase} shrink-0 rounded-md`}
          style={{ flexBasis: termWidth, minWidth: termWidth }}
        >
          <div className={floatingLabelClasses}>{floatingLabel}</div>

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
            <button
              onClick={handleDeleteNode}
              className="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center text-red-400 hover:bg-red-400 hover:text-white group-hover/cell:flex"
            >
              <FaTrash size={10} />
            </button>
          )}

          <button
            onClick={openTermEditor}
            className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center text-gray-500 opacity-0 hover:bg-gray-200 group-hover/cell:opacity-100"
          >
            <FaPencilAlt size={9} />
          </button>
        </div>

        {/* ── Evidence cells — only when showEvidence ── */}
        {showEvidence && (
          <div className="flex min-w-0 flex-1 flex-col items-stretch p-0">
            {evidence.length > 0 ? (
              evidence.map(ev =>
                edge ? (
                  <EvidenceRowComponent
                    key={ev.uid}
                    ev={ev}
                    edge={edge}
                    modelId={modelId}
                    userContext={resolvedUserContext}
                    onRemoveEvidence={handleRemoveEvidence}
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

        {/* Spacer when evidence hidden */}
        {!showEvidence && <span className="grow" />}

        {/* ── Action cell (40px) ── */}
        <div
          ref={actionCellRef}
          className="flex w-10 shrink-0 flex-col items-center justify-center p-0"
        >
          {showMenu && (
            <IconButton
              size="small"
              onClick={e => setMenuAnchor(e.currentTarget)}
              className="!h-10 !w-10 !shadow-md"
            >
              <FaEllipsisV size={12} />
            </IconButton>
          )}
          {showAddButton && extensionRelations.length > 0 && (
            <IconButton
              size="small"
              onClick={() => setAddMenuAnchor(actionCellRef.current)}
              className="!h-10 !w-10 !shadow-md"
            >
              <FaPlus size={12} />
            </IconButton>
          )}
        </div>
      </div>

      {/* ── Single EditorDropdown for this node ── */}
      <EditorDropdown
        anchorEl={editorAnchor}
        category={editorCategory}
        onClose={closeEditor}
        onSave={handleEditorSave}
        termLabel={floatingLabel}
        termRootTypes={node.rootTypes}
        initialTerm={node.id ? { id: node.id, label: node.label } : null}
        initialEvidence={null}
        initialReference=""
        initialWith=""
      />

      {/* Children — always expanded */}
      {children.map(child => (
        <ActivityTableNode
          key={child.node.uid}
          treeNode={child}
          modelId={modelId}
          userContext={resolvedUserContext}
          allEdges={allEdges}
          onNodeDeleted={onNodeDeleted}
        />
      ))}

      {/* ── Entity menu (Angular: Add, Evidence > Add Evidence, Delete) ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {extensionRelations.length > 0 && (
          <MenuItem
            onClick={() => {
              setAddMenuAnchor(actionCellRef.current)
              setMenuAnchor(null)
            }}
          >
            Add
          </MenuItem>
        )}
        {edge && (
          <MenuItem onClick={openAddEvidenceEditor}>Add Evidence</MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={handleDeleteNode} className="!text-red-600">
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* ── Add child submenu (Angular: noc-extensions-menu-panel) ── */}
      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={() => setAddMenuAnchor(null)}
        slotProps={{
          paper: {
            className: '!bg-[#d2e8f8]',
            sx: { maxWidth: 'none' },
          },
        }}
      >
        {extensionRelations.flatMap(entry =>
          entry.constraint.range.map(typeId => {
            const targetCategory = getNodeCategory(typeId)
            return (
              <MenuItem
                key={`${entry.constraint.predicate.id}-${typeId}`}
                onClick={() => handleInsertNode(entry.constraint.predicate.id, typeId)}
                className="!border-b !border-[rgba(59,89,152,0.6)] !py-1 !text-[10px] !leading-3"
              >
                <div className="flex w-full flex-col items-start justify-start">
                  <span>{entry.constraint.predicate.label}</span>
                  <span className="font-bold capitalize">
                    {targetCategory?.label ?? typeId}
                  </span>
                </div>
              </MenuItem>
            )
          })
        )}
      </Menu>
    </>
  )
}

export { getAspectFromRootTypes }
export default ActivityTableNode
