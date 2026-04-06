import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import { FaExclamationCircle, FaInfoCircle } from 'react-icons/fa'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useUserContext } from '@/app/hooks/useUserContext'
import { selectCamModel } from '../../slices/camSlice'
import { Relations } from '@/@noctua.core/models/relations'
import { DialogComponent, openDialog } from '@/@noctua.core/components/dialog/dialogSlice'
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
import { FormMode } from '../../models/formModels'
import type { TermNode, RelationNode, FlatRow } from '../../models/formModels'
import { ActivityType } from '../../models/cam'
import type { Evidence } from '../../models/cam'
import { referenceAllowedDBs, withFromAllowedDBs } from '../../data/allowedDatabases'
import EntityRow from './EntityRow'
import NestedNodeGroups from './NestedNodeGroups'
import CloneEvidenceDialog from './CloneEvidenceDialog'
import AllowedDatabasesPopover from './AllowedDatabasesPopover'
import { v4 as uuidv4 } from 'uuid'
import { flattenNode, getAspectBorderClass, findTargetUidByRelation } from '../../services/formUtils'

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
  const model = useAppSelector(selectCamModel)
  const userContext = useUserContext()
  const [updateGraphModel, { isLoading: isSaving }] = useUpdateGraphModelMutation()

  const [showErrorsDialog, setShowErrorsDialog] = useState(false)
  const [cloneEvidenceState, setCloneEvidenceState] = useState<{
    open: boolean
    relationUid: string
  }>({ open: false, relationUid: '' })
  const [refInfoAnchor, setRefInfoAnchor] = useState<HTMLElement | null>(null)
  const [withInfoAnchor, setWithInfoAnchor] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!root && mode === FormMode.CREATE && !activityType) {
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

  const sectionTitles = useMemo(() => {
    switch (activityType) {
      case ActivityType.MOLECULE:
        return { gp: 'Chemical', fd: 'Location (optional)' }
      default:
        return { gp: 'Gene Product', fd: 'Function Description' }
    }
  }, [activityType])

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

    // FD section — skip hidden nodes (e.g. MF root in Protein Complex)
    if (root.visible !== false) {
      fd.push({
        termNode: root,
        relation: enabledByRelation,
        parentTermUid: null,
        treeLevel: 1,
      })
    }
    for (const rel of root.relations) {
      if (rel.predicate.id !== Relations.ENABLED_BY) {
        const rows: FlatRow[] = []
        flattenNode(rel.target, rel, root.uid, 2, rows)
        fd.push(...rows)
      }
    }

    return { gpRows: gp, fdRows: fd }
  }, [root])

  const handleSave = useCallback(async () => {
    if (!root || !model?.id || hasErrors) return

    let operations
    if (mode === FormMode.EDIT && existingActivityUid) {
      const existingActivity = model.activities.find(
        a => a.uid === existingActivityUid
      )
      if (!existingActivity) return
      operations = buildEditActivityOperations(root, existingActivity, model.id, userContext)
    } else {
      operations = buildCreateActivityOperations(root, model.id, userContext)
    }

    await updateGraphModel(operations)
    onSaved?.()
  }, [root, model, mode, existingActivityUid, hasErrors, updateGraphModel, onSaved, userContext])

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
    (node: TermNode, relation: RelationNode | null) => {
      if (!gpNode?.term?.id) {
        // GP not filled yet — can't search
        return
      }
      dispatch(
        openDialog({
          component: DialogComponent.SEARCH_ANNOTATIONS,
          title: 'Search Annotations',
          size: 'lg',
          customProps: {
            gpId: gpNode.term.id,
            aspect: node.aspect,
            targetNodeUid: node.uid,
            relationUid: relation?.uid,
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

  return (
    <div className="flex h-full w-full flex-col items-stretch justify-start">
      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {activityType === ActivityType.PROTEIN_COMPLEX && (
          <div className="mx-3 mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs italic text-amber-800">
            Note that this should be used rarely, and only in the case where the activity cannot be
            ascribed to a single subunit of a complex
          </div>
        )}
        {/* GP Section */}
        {gpRows.length > 0 && (
          <div className="flex flex-col items-stretch justify-start">
            <div className="flex h-[30px] items-center bg-[rgba(121,143,184,0.3)] px-3">
              <span className="text-xs text-gray-600">{sectionTitles.gp}</span>
            </div>
            <div className="flex flex-col items-stretch justify-start px-2 py-1">
              {gpRows.map(row => (
                <div
                  key={row.termNode.uid}
                  className={`mb-1 bg-white ${getAspectBorderClass(row.termNode)}`}
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
        <div className="flex flex-col items-stretch justify-start">
          <div className="flex h-[30px] items-center bg-[rgba(121,143,184,0.3)] px-3">
            <span className="flex-1 text-xs text-gray-600">{sectionTitles.fd}</span>
            <div className="flex basis-[65%] items-center">
              <span className="w-1/2" />
              <div className="flex w-1/4 justify-center">
                <IconButton
                  size="small"
                  onClick={e => setRefInfoAnchor(e.currentTarget)}
                  title="Allowed reference databases"
                >
                  <FaInfoCircle size={12} className="text-gray-500" />
                </IconButton>
              </div>
              <div className="flex w-1/4 justify-center">
                <IconButton
                  size="small"
                  onClick={e => setWithInfoAnchor(e.currentTarget)}
                  title="Allowed with/from databases"
                >
                  <FaInfoCircle size={12} className="text-gray-500" />
                </IconButton>
              </div>
            </div>
            <span className="w-10 flex-shrink-0" />
          </div>
          <div className="flex flex-col items-stretch justify-start px-2 py-1">
            {fdRows.map(row => {
              const isNodeGroup = row.treeLevel <= 2
              if (isNodeGroup) {
                return (
                  <div
                    key={row.termNode.uid}
                    className={`mb-1 flex flex-row items-stretch justify-start bg-white ${getAspectBorderClass(row.termNode)}`}
                  >
                    {row.termNode.isComplement && (
                      <div className="flex w-[50px] flex-col items-center justify-center bg-gray-300 text-center text-[10px]">
                        <div>IS NOT</div>
                      </div>
                    )}
                    <div className="w-full">
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

            <NestedNodeGroups
              root={root}
              errors={errors}
              onSearchAnnotations={handleSearchAnnotations}
              onCloneEvidence={handleCloneEvidence}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex h-[50px] flex-shrink-0 flex-row items-center justify-start border-t border-gray-300 bg-gray-100 px-3">
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
        PaperProps={{ className: 'overflow-hidden rounded-lg' }}
      >
        <div className="flex h-10 flex-shrink-0 items-center border-b border-gray-200 bg-white px-3">
          <span className="text-sm font-bold text-gray-800">Validation Errors</span>
        </div>
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

export default ActivityForm
