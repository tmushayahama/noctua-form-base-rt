import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import { FaExclamationCircle, FaInfoCircle } from 'react-icons/fa'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { RootState } from '@/app/store/store'
import { Relations } from '@/@noctua.core/models/relations'
import { openDialog } from '@/@noctua.core/components/dialog/dialogSlice'
import {
  initCreateForm,
  resetForm,
  setErrors,
  setNodeEvidences,
  selectActivityForm,
  selectFormRoot,
  selectFormMode,
  selectFormType,
  selectFormErrors,
  selectExistingActivityUid,
} from '../../slices/activityFormSlice'
import { useUpdateGraphModelMutation } from '../../slices/camApiSlice'
import { validateActivityForm } from '../../services/formValidation'
import {
  buildCreateActivityOperations,
  buildEditActivityOperations,
} from '../../services/activityOperations'
import type { ActivityFormType } from '../../models/formModels'
import type { TermNode, RelationNode, ValidationError } from '../../models/formModels'
import type { Evidence } from '../../models/cam'
import { referenceAllowedDBs, withFromAllowedDBs } from '../../data/allowedDatabases'
import EntityRow from './EntityRow'
import CloneEvidenceDialog from './CloneEvidenceDialog'
import AllowedDatabasesPopover from './AllowedDatabasesPopover'
import { v4 as uuidv4 } from 'uuid'

// ── Flatten tree into renderable rows ────────────────────────────────

interface FlatRow {
  termNode: TermNode
  relation: RelationNode | null
  parentTermUid: string | null
  treeLevel: number
}

function flattenNode(
  node: TermNode,
  relation: RelationNode | null,
  parentTermUid: string | null,
  treeLevel: number,
  rows: FlatRow[]
) {
  rows.push({ termNode: node, relation, parentTermUid, treeLevel })
  for (const rel of node.relations) {
    flattenNode(rel.target, rel, node.uid, treeLevel + 1, rows)
  }
}

/** Get aspect border class for a node group */
function getAspectBorderClass(node: TermNode): string {
  switch (node.aspect) {
    case 'F':
      return 'border-l-4 border-l-blue-400'
    case 'P':
      return 'border-l-4 border-l-green-400'
    case 'C':
      return 'border-l-4 border-l-orange-400'
    default:
      return ''
  }
}

/** Collect all unique evidences from the current activity (for clone evidence) */
function collectUniqueEvidences(root: TermNode): Evidence[] {
  const seen = new Set<string>()
  const result: Evidence[] = []

  function walk(node: TermNode) {
    for (const rel of node.relations) {
      for (const ev of rel.evidence) {
        if (!ev.evidenceCode?.id) continue
        const key = `${ev.evidenceCode.id}|${ev.reference}|${ev.withFrom}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({
          uid: ev.uid,
          evidenceCode: ev.evidenceCode,
          reference: ev.reference,
          referenceUrl: '',
          with: ev.withFrom,
          groups: [],
          contributors: [],
        })
      }
      walk(rel.target)
    }
  }

  walk(root)
  return result
}

interface ActivityFormProps {
  onSaved?: () => void
  onCancel?: () => void
}

const ActivityForm: React.FC<ActivityFormProps> = ({ onSaved, onCancel }) => {
  const dispatch = useAppDispatch()
  const formState = useAppSelector(selectActivityForm)
  const root = useAppSelector(selectFormRoot)
  const mode = useAppSelector(selectFormMode)
  const activityType = useAppSelector(selectFormType)
  const errors = useAppSelector(selectFormErrors)
  const existingActivityUid = useAppSelector(selectExistingActivityUid)
  const model = useAppSelector((state: RootState) => state.cam.model)
  const [updateGraphModel, { isLoading: isSaving }] = useUpdateGraphModelMutation()

  const [showErrorsDialog, setShowErrorsDialog] = useState(false)
  const [cloneEvidenceState, setCloneEvidenceState] = useState<{
    open: boolean
    relationUid: string
  }>({ open: false, relationUid: '' })
  const [refInfoAnchor, setRefInfoAnchor] = useState<HTMLElement | null>(null)
  const [withInfoAnchor, setWithInfoAnchor] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!root && mode === 'create' && !activityType) {
      dispatch(initCreateForm('activity'))
    }
  }, [root, mode, activityType, dispatch])

  // Real-time validation: run on every form state change
  useEffect(() => {
    if (!formState.root) return
    const validationErrors = validateActivityForm(formState)
    dispatch(setErrors(validationErrors))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.root, formState.mode, formState.isDirty, dispatch])

  const hasErrors = errors.length > 0

  // Separate GP (enabled_by) and FD (everything else) sections
  const { gpRows, fdRows } = useMemo(() => {
    if (!root) return { gpRows: [] as FlatRow[], fdRows: [] as FlatRow[] }

    const gp: FlatRow[] = []
    const fd: FlatRow[] = []

    const enabledByRelation =
      root.relations.find(r => r.predicate.id === Relations.ENABLED_BY) ?? null

    // GP section
    for (const rel of root.relations) {
      if (rel.predicate.id === Relations.ENABLED_BY) {
        gp.push({
          termNode: rel.target,
          relation: null,
          parentTermUid: root.uid,
          treeLevel: 1,
        })
        for (const childRel of rel.target.relations) {
          const rows: FlatRow[] = []
          flattenNode(childRel.target, childRel, rel.target.uid, 2, rows)
          gp.push(...rows)
        }
      }
    }

    // FD section
    fd.push({
      termNode: root,
      relation: enabledByRelation,
      parentTermUid: null,
      treeLevel: 1,
    })
    for (const rel of root.relations) {
      if (rel.predicate.id !== Relations.ENABLED_BY) {
        const rows: FlatRow[] = []
        flattenNode(rel.target, rel, root.uid, 2, rows)
        fd.push(...rows)
      }
    }

    return { gpRows: gp, fdRows: fd }
  }, [root])

  const handleTypeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newType: ActivityFormType | null) => {
      if (newType) {
        dispatch(initCreateForm(newType))
      }
    },
    [dispatch]
  )

  const handleSave = useCallback(async () => {
    if (!root || !model?.id || hasErrors) return

    let operations
    if (mode === 'edit' && existingActivityUid) {
      const existingActivity = model.activities.find(
        a => a.uid === existingActivityUid
      )
      if (!existingActivity) return
      operations = buildEditActivityOperations(root, existingActivity, model.id)
    } else {
      operations = buildCreateActivityOperations(root, model.id)
    }

    await updateGraphModel(operations)
    onSaved?.()
  }, [root, model, mode, existingActivityUid, hasErrors, updateGraphModel, onSaved])

  const handleCancel = useCallback(() => {
    dispatch(resetForm())
    onCancel?.()
  }, [dispatch, onCancel])

  // Find GP node for Search Annotations (needs gpId)
  const gpNode = useMemo(() => {
    if (!root) return null
    const enabledByRel = root.relations.find(
      r => r.predicate.id === Relations.ENABLED_BY
    )
    return enabledByRel?.target ?? null
  }, [root])

  const handleSearchAnnotations = useCallback(
    (node: TermNode) => {
      if (!gpNode?.term?.id) {
        // GP not filled yet — can't search
        return
      }
      dispatch(
        openDialog({
          component: 'SearchAnnotations',
          title: 'Search Annotations',
          size: 'lg',
          customProps: {
            gpId: gpNode.term.id,
            aspect: node.aspect,
            targetNodeUid: node.uid,
          },
        })
      )
    },
    [dispatch, gpNode]
  )

  const handleCloneEvidence = useCallback((relationUid: string) => {
    setCloneEvidenceState({ open: true, relationUid })
  }, [])

  const handleCloneEvidenceSelect = useCallback(
    (selected: Evidence[]) => {
      if (!cloneEvidenceState.relationUid) return
      // Find the relation's target node uid to set evidences
      // We use the relation uid to find the right target
      const evidenceForms = selected.map(ev => ({
        uid: uuidv4(),
        evidenceCode: { id: ev.evidenceCode.id, label: ev.evidenceCode.label },
        reference: ev.reference || '',
        withFrom: ev.with || '',
      }))

      // Find target uid from relation uid by walking tree
      if (!root) return
      const targetUid = findTargetUidByRelation(root, cloneEvidenceState.relationUid)
      if (targetUid) {
        dispatch(setNodeEvidences({ uid: targetUid, evidences: evidenceForms }))
      }
    },
    [dispatch, root, cloneEvidenceState.relationUid]
  )

  const uniqueEvidences = useMemo(() => {
    if (!root) return []
    return collectUniqueEvidences(root)
  }, [root])

  if (!root) {
    return <div className="p-4 text-gray-500">Loading form...</div>
  }

  const activityTypeTitle =
    activityType === 'molecule'
      ? 'Chemical Form'
      : activityType === 'proteinComplex'
        ? 'Protein Complex Form'
        : 'Activity Unit Form'

  return (
    <div className="flex h-full w-full flex-col items-stretch justify-start">
      {/* Header */}
      <div className="flex flex-row items-center justify-start border-b px-4 py-2">
        <div className="text-sm font-semibold">{activityTypeTitle}</div>
        <span className="grow" />
        {mode === 'create' && (
          <ToggleButtonGroup
            value={activityType}
            exclusive
            onChange={handleTypeChange}
            size="small"
          >
            <ToggleButton value="activity">Default</ToggleButton>
            <ToggleButton value="molecule">Molecule</ToggleButton>
            <ToggleButton value="proteinComplex">Protein Complex</ToggleButton>
          </ToggleButtonGroup>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* GP Section */}
        {gpRows.length > 0 && (
          <div className="flex flex-col items-stretch justify-start p-2">
            <div className="flex flex-row items-center justify-start py-2">
              <div className="text-xs font-semibold uppercase text-gray-500">
                Gene Product
              </div>
            </div>
            <div className="flex flex-col items-stretch justify-start">
              {gpRows.map(row => (
                <div
                  key={row.termNode.uid}
                  className={`mb-4 bg-white px-2 pt-4 shadow ${getAspectBorderClass(row.termNode)}`}
                >
                  <EntityRow
                    node={row.termNode}
                    relation={row.relation}
                    parentTermUid={row.parentTermUid}
                    treeLevel={row.treeLevel}
                    errors={errors}
                    displayMenuButton={false}
                    displayAddButton={true}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FD Section */}
        <div className="flex flex-col items-stretch justify-start p-2">
          <div className="flex flex-row items-center justify-start py-2">
            <div className="text-xs font-semibold uppercase text-gray-500">
              Function Description
            </div>
            <span className="grow" />
            <div className="flex basis-[65%] flex-row items-center justify-end">
              <div className="w-1/4">
                <IconButton
                  size="small"
                  onClick={e => setRefInfoAnchor(e.currentTarget)}
                  title="Allowed reference databases"
                >
                  <FaInfoCircle size={14} className="text-gray-400" />
                </IconButton>
              </div>
              <div className="w-1/4">
                <IconButton
                  size="small"
                  onClick={e => setWithInfoAnchor(e.currentTarget)}
                  title="Allowed with/from databases"
                >
                  <FaInfoCircle size={14} className="text-gray-400" />
                </IconButton>
              </div>
              <span className="w-10" />
            </div>
          </div>
          <div className="flex flex-col items-stretch justify-start">
            {fdRows.map(row => {
              const isNodeGroup = row.treeLevel <= 2
              if (isNodeGroup) {
                return (
                  <div
                    key={row.termNode.uid}
                    className={`mb-4 flex flex-row items-stretch justify-start bg-white shadow ${getAspectBorderClass(row.termNode)}`}
                  >
                    {row.termNode.isComplement && (
                      <div className="flex w-[50px] flex-col items-center justify-center bg-gray-300 text-center text-[10px]">
                        <div>IS NOT</div>
                      </div>
                    )}
                    <div className="w-full px-2">
                      <EntityRow
                        node={row.termNode}
                        relation={row.relation}
                        parentTermUid={row.parentTermUid}
                        treeLevel={1}
                        errors={errors}
                        displayMenuButton={true}
                        onSearchAnnotations={handleSearchAnnotations}
                        onCloneEvidence={handleCloneEvidence}
                      />
                    </div>
                  </div>
                )
              }
              return null
            })}

            {renderNestedNodeGroups(
              root,
              errors,
              handleSearchAnnotations,
              handleCloneEvidence
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-row items-center justify-start border-t px-4 py-3">
        {hasErrors && (
          <Button
            variant="text"
            color="warning"
            size="small"
            onClick={() => setShowErrorsDialog(true)}
          >
            Why is the &quot;Save&quot; button disabled?
          </Button>
        )}
        <span className="grow" />
        <Button
          variant="outlined"
          onClick={handleCancel}
          disabled={isSaving}
          className="mr-2"
        >
          Clear
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || hasErrors}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Errors dialog */}
      <Dialog
        open={showErrorsDialog}
        onClose={() => setShowErrorsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Validation Errors</DialogTitle>
        <DialogContent>
          <List dense>
            {errors.map((err, i) => (
              <ListItem key={`${err.uid}-${err.field}-${i}`}>
                <ListItemIcon className="!min-w-[32px]">
                  <FaExclamationCircle className="text-red-500" />
                </ListItemIcon>
                <ListItemText primary={err.message} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowErrorsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Clone evidence dialog */}
      <CloneEvidenceDialog
        open={cloneEvidenceState.open}
        evidences={uniqueEvidences}
        onClose={() => setCloneEvidenceState({ open: false, relationUid: '' })}
        onSelect={handleCloneEvidenceSelect}
      />

      {/* Info popovers */}
      <AllowedDatabasesPopover
        anchorEl={refInfoAnchor}
        onClose={() => setRefInfoAnchor(null)}
        title="Allowed Reference Databases"
        databases={referenceAllowedDBs}
      />
      <AllowedDatabasesPopover
        anchorEl={withInfoAnchor}
        onClose={() => setWithInfoAnchor(null)}
        title="Allowed With/From Databases"
        databases={withFromAllowedDBs}
      />
    </div>
  )
}

/** Find the target TermNode uid for a given relation uid */
function findTargetUidByRelation(root: TermNode, relationUid: string): string | null {
  for (const rel of root.relations) {
    if (rel.uid === relationUid) return rel.target.uid
    const found = findTargetUidByRelation(rel.target, relationUid)
    if (found) return found
  }
  return null
}

/** Render FD node groups that have nested children (tree level 3+) */
function renderNestedNodeGroups(
  root: TermNode,
  errors: ValidationError[],
  onSearchAnnotations: (node: TermNode) => void,
  onCloneEvidence: (relationUid: string) => void
): React.ReactNode[] {
  const groups: React.ReactNode[] = []

  for (const rel of root.relations) {
    if (rel.predicate.id === Relations.ENABLED_BY) continue

    if (rel.target.relations.length > 0) {
      for (const childRel of rel.target.relations) {
        const rows: FlatRow[] = []
        flattenNode(childRel.target, childRel, rel.target.uid, 2, rows)

        for (const row of rows) {
          groups.push(
            <div
              key={row.termNode.uid}
              className={`mb-4 flex flex-row items-stretch justify-start bg-white shadow ${getAspectBorderClass(row.termNode)}`}
            >
              {row.termNode.isComplement && (
                <div className="flex w-[50px] flex-col items-center justify-center bg-gray-300 text-center text-[10px]">
                  <div>IS NOT</div>
                </div>
              )}
              <div className="w-full px-2">
                <EntityRow
                  node={row.termNode}
                  relation={row.relation}
                  parentTermUid={row.parentTermUid}
                  treeLevel={row.treeLevel}
                  errors={errors}
                  displayMenuButton={true}
                  onSearchAnnotations={onSearchAnnotations}
                  onCloneEvidence={onCloneEvidence}
                />
              </div>
            </div>
          )
        }
      }
    }
  }

  return groups
}

export default ActivityForm
