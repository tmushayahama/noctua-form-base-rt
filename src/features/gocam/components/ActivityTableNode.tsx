import type React from 'react'
import { useState, useCallback, useMemo, useRef } from 'react'
import { IconButton, Menu, MenuItem, Popover } from '@mui/material'
import { FaEllipsisV, FaPencilAlt, FaTrash } from 'react-icons/fa'
import { FaRegCircleXmark, FaRegCircleCheck } from 'react-icons/fa6'
import type { GraphNode, Edge, Evidence, UserContext } from '../models/cam'
import { RootTypes } from '../models/cam'
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
import TermAutocomplete from '@/features/search/components/Autocomplete'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse } from '@/features/search/models/search'
import { createEvidenceForm } from '../models/formModels'
import ReferenceDropdown from './forms/ReferenceDropdown'
import WithDropdown from './forms/WithDropdown'

// ── Types ────────────────────────────────────────────────────────────

export interface DisplayTreeNode {
  node: GraphNode
  edge: Edge | null
  children: DisplayTreeNode[]
  treeLevel: number
  canDelete: boolean
  aspect: string | null
  floatingLabel: string
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
  'group/cell relative break-words border-[1px] border-[#aaa] px-[5px] py-[8px] text-xs text-black hover:border-primary-500'

const floatingLabelClasses =
  'absolute left-[4px] top-[-6px] h-[12px] max-w-[80%] truncate bg-white px-[4px] text-[8px] leading-[12px] text-[#656565] group-hover/cell:text-primary-500'

// ── Evidence row with editable cells ────────────────────────────────

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

  // Edit state
  const [evEditOpen, setEvEditOpen] = useState(false)
  const [refEditOpen, setRefEditOpen] = useState(false)
  const [withEditOpen, setWithEditOpen] = useState(false)

  // Buffered selection for evidence code (user must confirm)
  const [pendingEvCode, setPendingEvCode] = useState<GOlrResponse | null>(null)

  // Evidence code save (on OK click)
  const handleEvidenceCodeSave = useCallback(async () => {
    if (!pendingEvCode || !ev.evidenceCode?.id) {
      setEvEditOpen(false)
      setPendingEvCode(null)
      return
    }
    const ops = buildEditIndividualTypeOperations(
      ev.uid,
      ev.evidenceCode.id,
      pendingEvCode.id,
      modelId
    )
    await updateGraphModel(ops)
    setEvEditOpen(false)
    setPendingEvCode(null)
  }, [pendingEvCode, ev.uid, ev.evidenceCode?.id, modelId, updateGraphModel])

  // Reference edit: change the 'source' annotation
  const handleReferenceSave = useCallback(
    async (newValue: string) => {
      const ops = buildEditEvidenceAnnotationOperations(
        ev.uid,
        'source',
        ev.reference || '',
        newValue,
        modelId,
        userContext
      )
      await updateGraphModel(ops)
    },
    [ev.uid, ev.reference, modelId, userContext, updateGraphModel]
  )

  // With edit: change the 'with' annotation
  const handleWithSave = useCallback(
    async (newValue: string) => {
      const ops = buildEditEvidenceAnnotationOperations(
        ev.uid,
        'with',
        ev.with || '',
        newValue,
        modelId,
        userContext
      )
      await updateGraphModel(ops)
    },
    [ev.uid, ev.with, modelId, userContext, updateGraphModel]
  )

  return (
    <div className="mb-2 flex h-full flex-row items-stretch last:mb-0">
      {/* Evidence code cell — grows */}
      <div
        ref={evCellRef}
        className={`${cellBase} ml-[4px] flex grow flex-col items-stretch rounded-lg`}
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
        {/* Delete evidence */}
        <button
          onClick={() => onRemoveEvidence(ev)}
          className="absolute right-0 top-0 hidden h-[20px] w-[20px] items-center justify-center text-[#ee7979] hover:bg-[#ee7979] hover:text-white group-hover/cell:flex"
        >
          <FaTrash size={10} />
        </button>
        {/* Edit evidence code */}
        <button
          onClick={() => {
            setPendingEvCode(null)
            setEvEditOpen(true)
          }}
          className="absolute bottom-0 right-0 flex h-[20px] w-[20px] items-center justify-center text-[#656565] opacity-0 hover:bg-gray-200 group-hover/cell:opacity-100"
        >
          <FaPencilAlt size={9} />
        </button>
      </div>

      {/* Reference cell — 100px */}
      <div
        ref={refCellRef}
        className={`${cellBase} ml-[4px] flex w-[100px] shrink-0 flex-col items-stretch rounded-lg`}
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
          className="absolute right-0 top-0 hidden h-[20px] w-[20px] items-center justify-center text-[#ee7979] hover:bg-[#ee7979] hover:text-white group-hover/cell:flex"
        >
          <FaTrash size={10} />
        </button>
        <button
          onClick={() => setRefEditOpen(true)}
          className="absolute bottom-0 right-0 flex h-[20px] w-[20px] items-center justify-center text-[#656565] opacity-0 hover:bg-gray-200 group-hover/cell:opacity-100"
        >
          <FaPencilAlt size={9} />
        </button>
      </div>

      {/* With cell — 100px */}
      <div
        ref={withCellRef}
        className={`${cellBase} ml-[4px] flex w-[100px] shrink-0 flex-col items-stretch rounded-lg`}
      >
        <div className={floatingLabelClasses}>With</div>
        <span>{ev.with || '—'}</span>
        <button
          onClick={() => onRemoveEvidence(ev)}
          className="absolute right-0 top-0 hidden h-[20px] w-[20px] items-center justify-center text-[#ee7979] hover:bg-[#ee7979] hover:text-white group-hover/cell:flex"
        >
          <FaTrash size={10} />
        </button>
        <button
          onClick={() => setWithEditOpen(true)}
          className="absolute bottom-0 right-0 flex h-[20px] w-[20px] items-center justify-center text-[#656565] opacity-0 hover:bg-gray-200 group-hover/cell:opacity-100"
        >
          <FaPencilAlt size={9} />
        </button>
      </div>

      {/* ── Edit popovers ── */}

      {/* Evidence code popover — autocomplete with cancel/OK */}
      <Popover
        open={evEditOpen}
        anchorEl={evCellRef.current}
        onClose={() => {
          setEvEditOpen(false)
          setPendingEvCode(null)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className="flex w-[300px] flex-row items-center p-2">
          <div className="flex-1">
            <TermAutocomplete
              label="Evidence Code"
              name={`ev-edit-${ev.uid}`}
              autocompleteType={AutocompleteType.EVIDENCE_CODE}
              rootTypeIds={[RootTypes.EVIDENCE]}
              value={
                pendingEvCode ??
                (ev.evidenceCode?.id
                  ? ({ id: ev.evidenceCode.id, label: ev.evidenceCode.label } as GOlrResponse)
                  : null)
              }
              onChange={val => {
                if (val && typeof val === 'object') setPendingEvCode(val)
              }}
              variant="outlined"
            />
          </div>
          <IconButton
            size="small"
            onClick={() => {
              setEvEditOpen(false)
              setPendingEvCode(null)
            }}
            title="Cancel"
          >
            <FaRegCircleXmark size={16} />
          </IconButton>
          <IconButton size="small" onClick={handleEvidenceCodeSave} title="Save">
            <FaRegCircleCheck size={16} />
          </IconButton>
        </div>
      </Popover>

      {/* Reference popover — reuse existing ReferenceDropdown */}
      <ReferenceDropdown
        anchorEl={refEditOpen ? refCellRef.current : null}
        currentValue={ev.reference || ''}
        onClose={() => setRefEditOpen(false)}
        onSave={handleReferenceSave}
      />

      {/* With popover — reuse existing WithDropdown */}
      <WithDropdown
        anchorEl={withEditOpen ? withCellRef.current : null}
        currentValue={ev.with || ''}
        onClose={() => setWithEditOpen(false)}
        onSave={handleWithSave}
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
  const { node, edge, children, treeLevel, canDelete, floatingLabel } = treeNode
  const evidence = edge?.evidence ?? []

  // Ref for term cell (stable popover anchor)
  const termCellRef = useRef<HTMLDivElement>(null)
  const [termEditOpen, setTermEditOpen] = useState(false)
  const [pendingTerm, setPendingTerm] = useState<GOlrResponse | null>(null)

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
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

  // Term save (on OK click)
  const handleTermSave = useCallback(async () => {
    if (!pendingTerm) {
      setTermEditOpen(false)
      setPendingTerm(null)
      return
    }
    const ops = buildEditIndividualTypeOperations(node.uid, node.id, pendingTerm.id, modelId)
    await updateGraphModel(ops)
    setTermEditOpen(false)
    setPendingTerm(null)
  }, [pendingTerm, node.uid, node.id, modelId, updateGraphModel])

  const handleAddEvidence = useCallback(async () => {
    if (!edge) return
    const ev = createEvidenceForm()
    const ops = buildAddEvidenceToEdgeOperations(
      edge.sourceId,
      edge.targetId,
      edge.id,
      ev,
      modelId,
      resolvedUserContext
    )
    await updateGraphModel(ops)
    setMenuAnchor(null)
  }, [edge, modelId, resolvedUserContext, updateGraphModel])

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
      {/* Row: [term cell] [evidence cells (grow)] [spacer] [action cell (40px)] */}
      <div className="mb-2 flex w-full flex-row items-stretch justify-start">
        {/* ── Term cell ── */}
        <div
          ref={termCellRef}
          className={`${cellBase} shrink-0 rounded-[5px]`}
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
            <span className="italic text-[#aaa]">—</span>
          )}

          {/* Delete — top right */}
          {canDelete && (
            <button
              onClick={handleDeleteNode}
              className="absolute right-0 top-0 hidden h-[20px] w-[20px] items-center justify-center text-[#ee7979] hover:bg-[#ee7979] hover:text-white group-hover/cell:flex"
            >
              <FaTrash size={10} />
            </button>
          )}

          {/* Edit — bottom right, opens term edit popover */}
          <button
            onClick={() => {
              setPendingTerm(null)
              setTermEditOpen(true)
            }}
            className="absolute bottom-0 right-0 flex h-[20px] w-[20px] items-center justify-center text-[#656565] opacity-0 hover:bg-gray-200 group-hover/cell:opacity-100"
          >
            <FaPencilAlt size={9} />
          </button>
        </div>

        {/* ── Evidence cells (grow) ── */}
        <div className="flex grow flex-col items-stretch p-0">
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
            <div className="flex items-center px-2 py-[3px] text-[10px] italic text-[#aaa]">
              no evidence present.
            </div>
          )}
        </div>

        {/* ── Spacer ── */}
        <span className="grow" />

        {/* ── Action cell (40px) ── */}
        <div className="flex w-[40px] shrink-0 flex-col items-center justify-center p-0">
          <IconButton
            size="small"
            onClick={e => setMenuAnchor(e.currentTarget)}
            className="!h-[40px] !w-[40px] !shadow-md"
          >
            <FaEllipsisV size={12} />
          </IconButton>
        </div>
      </div>

      {/* Term edit popover — autocomplete with cancel/OK */}
      <Popover
        open={termEditOpen}
        anchorEl={termCellRef.current}
        onClose={() => {
          setTermEditOpen(false)
          setPendingTerm(null)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className="flex w-[300px] flex-row items-center p-2">
          <div className="flex-1">
            <TermAutocomplete
              label={floatingLabel}
              name={`term-edit-${node.uid}`}
              autocompleteType={AutocompleteType.TERM}
              rootTypeIds={node.rootTypes}
              value={
                pendingTerm ??
                (node.id ? ({ id: node.id, label: node.label } as GOlrResponse) : null)
              }
              onChange={val => {
                if (val && typeof val === 'object') setPendingTerm(val)
              }}
              variant="outlined"
            />
          </div>
          <IconButton
            size="small"
            onClick={() => {
              setTermEditOpen(false)
              setPendingTerm(null)
            }}
            title="Cancel"
          >
            <FaRegCircleXmark size={16} />
          </IconButton>
          <IconButton size="small" onClick={handleTermSave} title="Save">
            <FaRegCircleCheck size={16} />
          </IconButton>
        </div>
      </Popover>

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

      {/* ── Entity menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setPendingTerm(null)
            setTermEditOpen(true)
            setMenuAnchor(null)
          }}
        >
          Edit Term
        </MenuItem>
        {edge && <MenuItem onClick={handleAddEvidence}>Add Evidence</MenuItem>}
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
        {canDelete && (
          <MenuItem onClick={handleDeleteNode} className="!text-red-600">
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* ── Add child submenu ── */}
      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={() => setAddMenuAnchor(null)}
      >
        {extensionRelations.map(entry => {
          const targetTypeId = entry.constraint.range[0]
          const targetCategory = getNodeCategory(targetTypeId)
          return (
            <MenuItem
              key={`${entry.constraint.predicate.id}-${entry.key}`}
              onClick={() => handleInsertNode(entry.constraint.predicate.id, targetTypeId)}
            >
              <div className="flex flex-col">
                <span className="text-sm">{entry.constraint.predicate.label}</span>
                <span className="text-xs text-gray-500">
                  {targetCategory?.label ?? targetTypeId}
                </span>
              </div>
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}

export { getAspectFromRootTypes }
export default ActivityTableNode
