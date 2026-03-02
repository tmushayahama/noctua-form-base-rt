import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { RootState } from '@/app/store/store'
import type React from 'react'
import { useState, useEffect, useRef, useMemo } from 'react'
import type { TreeNode } from '../../models/cam'
import { NodeType, ActivityType, RootTypes, BP_ONLY_EDGES } from '../../models/cam'
import { resetForm, setActivityType, setBpOnlyEdge } from '../../slices/activityFormSlice'
import {
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Select,
  MenuItem,
} from '@mui/material'
import { convertTreeToJson, findNodeByNodeType } from '../../services/addActivityServices'
import { useUpdateGraphModelMutation } from '../../slices/camApiSlice'
import NodeForm from './NodeForm'
import { openDialog } from '@/@noctua.core/components/dialog/dialogSlice'
import { getAspect } from '../../services/graphServices'
import { validateActivityForm } from '../../services/formValidation'
import { Relations } from '@/@noctua.core/models/relations'
import { FiX, FiInfo } from 'react-icons/fi'

interface ActivityFormProps {
  onSaved?: () => void
  onClose?: () => void
}

/** Map rootType IDs to aspect border color classes (matches Angular SCSS) */
const getAspectBorderClass = (node: TreeNode): string => {
  for (const rt of node.rootTypes) {
    switch (rt.id) {
      case RootTypes.MOLECULAR_FUNCTION:
        return 'border-l-green-400'
      case RootTypes.BIOLOGICAL_PROCESS:
        return 'border-l-orange-300'
      case RootTypes.CELLULAR_COMPONENT:
      case RootTypes.CELLULAR_ANATOMICAL:
        return 'border-l-purple-400'
    }
  }
  return 'border-l-transparent'
}

/** Check if a child node belongs to the GP section (enabledBy gene product) */
const isGPChild = (node: TreeNode): boolean =>
  node.rootTypes.some(
    rt => rt.id === RootTypes.MOLECULAR_ENTITY || rt.id === RootTypes.PROTEIN_CONTAINING_COMPLEX
  )

/** Activity type → form title (matches Angular switch in activity-form.component.html) */
const formTitle: Record<ActivityType, string> = {
  [ActivityType.ACTIVITY]: 'Activity Unit Form',
  [ActivityType.BP_ONLY]: 'BP Annotation Form',
  [ActivityType.CC_ONLY]: 'CC Annotation Form',
  [ActivityType.MOLECULE]: 'Chemical Form',
  [ActivityType.PROTEIN_COMPLEX]: 'Protein Complex Form',
}

const ActivityForm: React.FC<ActivityFormProps> = ({ onSaved, onClose }) => {
  const dispatch = useAppDispatch()
  const [updateGraphModel, { isLoading: isSaving }] = useUpdateGraphModelMutation()
  const model = useAppSelector((state: RootState) => state.cam.model)
  const tree = useAppSelector((state: RootState) => state.activityForm.tree)
  const editingActivityUid = useAppSelector(
    (state: RootState) => state.activityForm.editingActivityUid
  )
  const activityType = useAppSelector((state: RootState) => state.activityForm.activityType)
  const initialized = useRef<boolean>(false)
  const [showErrorsDialog, setShowErrorsDialog] = useState(false)

  const isEditMode = !!editingActivityUid

  const gpSectionTitle = activityType === ActivityType.MOLECULE ? 'Chemical' : 'Gene Product'
  const fdSectionTitle =
    activityType === ActivityType.CC_ONLY
      ? 'Localization Description'
      : activityType === ActivityType.MOLECULE
        ? 'Location (optional)'
        : 'Function Description'

  const validationErrors = useMemo(
    () => validateActivityForm(tree, activityType),
    [tree, activityType]
  )
  const hasErrors = validationErrors.length > 0

  useEffect(() => {
    if (!initialized.current && tree.length === 0 && !isEditMode) {
      initialized.current = true
      dispatch(setActivityType(ActivityType.ACTIVITY))
    }
  }, [dispatch, tree.length, isEditMode])

  // Split tree into GP section and FD section
  const root = tree[0] || null
  const rootInGPSection =
    activityType === ActivityType.CC_ONLY || activityType === ActivityType.MOLECULE
  const gpChildren = useMemo(() => (root ? root.children.filter(isGPChild) : []), [root])
  const fdChildren = useMemo(() => (root ? root.children.filter(c => !isGPChild(c)) : []), [root])

  // bpOnly: find the BP node's current relation for the causal dropdown
  const bpNode = useMemo(
    () =>
      activityType === ActivityType.BP_ONLY
        ? root?.children.find(
            c =>
              c.rootTypes.some(rt => rt.id === RootTypes.BIOLOGICAL_PROCESS) &&
              c.relation?.id !== Relations.ENABLED_BY
          )
        : null,
    [activityType, root]
  )
  const currentBpEdge = bpNode?.relation?.id ?? BP_ONLY_EDGES[0].id

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!model || !model.id) return

    const modelId = model.id

    if (isEditMode) {
      const originalActivity = model.activities.find(a => a.uid === editingActivityUid)
      if (originalActivity) {
        const deleteOps: Record<string, unknown>[] = []
        for (const edge of originalActivity.edges) {
          deleteOps.push({
            entity: 'edge',
            operation: 'remove',
            arguments: {
              'model-id': modelId,
              subject: edge.sourceId,
              object: edge.targetId,
              predicate: edge.id,
            },
          })
        }
        for (const node of originalActivity.nodes) {
          deleteOps.push({
            entity: 'individual',
            operation: 'remove',
            arguments: { 'model-id': modelId, individual: node.uid },
          })
        }
        deleteOps.push({
          entity: 'model',
          operation: 'store',
          arguments: { 'model-id': modelId },
        })
        await updateGraphModel(deleteOps).unwrap()
      }
    }

    const ops = convertTreeToJson(tree, modelId)
    await updateGraphModel(ops).unwrap()
    dispatch(resetForm())
    onSaved?.()
  }

  const handleClear = () => {
    dispatch(resetForm())
    dispatch(setActivityType(activityType))
  }

  const handleClose = () => {
    dispatch(resetForm())
    onClose?.()
  }

  const handleOpenDialog = (node: TreeNode) => {
    const gpNode = findNodeByNodeType(tree, NodeType.MOLECULAR_ENTITY)
    const gpId = gpNode?.term?.id || ''
    if (gpId) {
      dispatch(
        openDialog({
          component: 'SearchAnnotations',
          title: 'Search Annotations',
          size: 'lg',
          customProps: {
            gpId,
            aspect: getAspect(node.rootTypes),
            term: node.term,
            targetNodeUid: node.uid,
          },
        })
      )
    }
  }

  /**
   * Render a node + its extension children inside a shadow box.
   * showChildren=false skips rendering children (used for root node whose
   * children are rendered as separate cards in GP/FD sections).
   */
  const renderNodeGroup = (
    node: TreeNode,
    aspectClass: string,
    showMenu: boolean,
    showAdd: boolean,
    showChildren = true
  ) => (
    <div
      key={node.uid}
      className={`mb-4 flex items-stretch overflow-hidden bg-white px-2 shadow ${aspectClass ? `border-l-4 ${aspectClass}` : ''}`}
    >
      {node.isComplement && (
        <div className="flex w-[50px] shrink-0 flex-col items-center justify-center bg-gray-300 text-[10px]">
          <div>IS NOT</div>
        </div>
      )}
      <div className="w-full">
        <NodeForm
          node={node}
          onOpenDialog={handleOpenDialog}
          displayMenuButton={showMenu}
          displayAddButton={showAdd}
        />
        {/* Extension children rendered flat inside the same shadow box */}
        {showChildren &&
          node.children.map(child => (
            <NodeForm
              key={child.uid}
              node={child}
              onOpenDialog={handleOpenDialog}
              displayMenuButton={showMenu}
            />
          ))}
      </div>
    </div>
  )

  if (!root) {
    return <p className="p-4 text-sm text-gray-500">Loading tree...</p>
  }

  return (
    <form onSubmit={handleFormSubmit} className="flex h-full w-full flex-col items-stretch">
      {/* Header */}
      <div className="flex items-center border-b border-gray-200 px-4 py-2">
        <div className="text-sm font-semibold">{formTitle[activityType]}</div>
        <span className="grow" />
        {onClose && (
          <IconButton size="small" onClick={handleClose} title="Close">
            <FiX size={16} />
          </IconButton>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {activityType === ActivityType.PROTEIN_COMPLEX && (
          <div className="mb-0 w-full border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Note that this should be used rarely, and only in the case where the activity cannot be
            ascribed to a single subunit of a complex
          </div>
        )}

        {/* GP Section (gene product / annotated) */}
        {(rootInGPSection || gpChildren.length > 0) && (
          <div className="flex flex-col items-stretch">
            <div className="flex items-center px-4 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {gpSectionTitle}
              </div>
            </div>
            <div className="flex flex-col items-stretch p-0">
              {rootInGPSection
                ? renderNodeGroup(root, 'border-l-transparent', true, true, false)
                : gpChildren.map(gpNode =>
                    renderNodeGroup(gpNode, 'border-l-transparent', false, true)
                  )}
            </div>
          </div>
        )}

        {/* FD Section (functional description) */}
        {(!rootInGPSection ||
          fdChildren.length > 0 ||
          (rootInGPSection && root.children.length > 0)) && (
          <div className="flex flex-col items-stretch">
            <div className="flex items-center px-4 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {fdSectionTitle}
              </div>
              <span className="grow" />
              {/* Info buttons aligned with evidence columns (matches Angular) */}
              <div className="flex basis-[65%] items-center justify-end">
                <div className="w-1/4">
                  <IconButton
                    size="small"
                    title="Allowed reference databases: PMID, DOI, GO_REF"
                    className="!text-gray-400"
                  >
                    <FiInfo size={14} />
                  </IconButton>
                </div>
                <div className="w-1/4">
                  <IconButton
                    size="small"
                    title="Allowed with/from databases"
                    className="!text-gray-400"
                  >
                    <FiInfo size={14} />
                  </IconButton>
                </div>
                <span className="w-10" />
              </div>
            </div>
            <div className="flex flex-col items-stretch p-0">
              {/* bpOnly: readonly MF field + causal relation dropdown (MF is hidden) */}
              {activityType === ActivityType.BP_ONLY && (
                <div className="mb-4 flex items-center gap-2 border-l-4 border-l-green-400 bg-white px-2 shadow">
                  <div className="flex-1 p-4">
                    <input
                      type="text"
                      readOnly
                      value="molecular_function (GO:0003674)"
                      className="w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                  <div className="w-[600px] p-4">
                    <Select
                      size="small"
                      value={currentBpEdge}
                      onChange={e => {
                        const edge = BP_ONLY_EDGES.find(be => be.id === e.target.value)
                        if (edge) dispatch(setBpOnlyEdge({ id: edge.id, label: edge.label }))
                      }}
                      className="w-full text-sm"
                      displayEmpty
                    >
                      {BP_ONLY_EDGES.map(edge => (
                        <MenuItem key={edge.id} value={edge.id}>
                          {edge.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              {/* Root node (MF) — NOT rendered for bpOnly (hidden, replaced by readonly above) */}
              {/* For Activity/ProteinComplex: render root WITHOUT children (children are separate cards below) */}
              {!rootInGPSection &&
                activityType !== ActivityType.BP_ONLY &&
                renderNodeGroup(root, getAspectBorderClass(root), true, false, false)}

              {/* FD children as separate cards (BP, CC, extensions) */}
              {!rootInGPSection &&
                fdChildren.map(fdNode =>
                  renderNodeGroup(fdNode, getAspectBorderClass(fdNode), true, false)
                )}

              {/* When root is in GP section (ccOnly/molecule), render its children as FD cards */}
              {rootInGPSection &&
                root.children.map(child =>
                  renderNodeGroup(child, getAspectBorderClass(child), true, false)
                )}
            </div>
          </div>
        )}
      </div>

      {/* Footer — matches Angular: [Why disabled?] <grow> [Clear] [Save] */}
      <div className="flex items-center border-t border-gray-200 px-4 py-2">
        {hasErrors && (
          <Button
            color="warning"
            size="small"
            className="!text-xs !normal-case"
            onClick={() => setShowErrorsDialog(true)}
          >
            Why is the &quot;Save&quot; button disabled?
          </Button>
        )}
        <span className="grow" />
        <Button
          variant="text"
          size="small"
          onClick={handleClear}
          disabled={isSaving}
          className="!mr-2"
        >
          Clear
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="small"
          disabled={tree.length === 0 || isSaving || hasErrors}
        >
          {isSaving ? (
            <CircularProgress size={20} color="inherit" />
          ) : isEditMode ? (
            'Update'
          ) : (
            'Save'
          )}
        </Button>
      </div>

      {/* Error dialog */}
      <Dialog
        open={showErrorsDialog}
        onClose={() => setShowErrorsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="flex items-center justify-between border-b pb-2">
          <span className="text-lg font-medium">Errors</span>
          <IconButton size="small" onClick={() => setShowErrorsDialog(false)}>
            <FiX />
          </IconButton>
        </DialogTitle>
        <DialogContent className="!p-4">
          {validationErrors.map((err, i) => (
            <div key={i} className="mb-2 flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-200 text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-sm">{err.message}</span>
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </form>
  )
}

export default ActivityForm
