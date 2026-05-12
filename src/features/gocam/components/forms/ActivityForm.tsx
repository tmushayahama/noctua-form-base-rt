import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActionIcon, Button, Modal, Tooltip } from '@mantine/core'
import { resolveModalSize } from '@/@noctua.core/components/dialog/modalSize'
import DialogHeader from '@/@noctua.core/components/dialog/DialogHeader'
import { FaExclamationCircle, FaInfoCircle, FaSave } from 'react-icons/fa'
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
import type { TermNode, RelationNode, ValidationError } from '../../models/formModels'
import { ActivityType } from '../../models/cam'
import type { Evidence } from '../../models/cam'
import { referenceAllowedDBs, withFromAllowedDBs } from '../../data/allowedDatabases'
import EntityRow from './EntityRow'
import CloneEvidenceDialog from './CloneEvidenceDialog'
import AllowedDatabasesPopover from './AllowedDatabasesPopover'
import { v4 as uuidv4 } from 'uuid'
import {
  buildGroupedRows,
  findTargetUidByRelation,
} from '../../services/formUtils'
import { DisplayGroup, GROUP_ORDER } from '../../data/insertMenuConfig'
import type { GroupedRow } from '../../models/formModels'

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

interface GroupCardProps {
  group: DisplayGroup
  rows: GroupedRow[]
  errors: ValidationError[]
  bgClass: string
  displayMenuButton: boolean
  displayAddButton?: boolean
  onSearchAnnotations?: (node: TermNode, relation: RelationNode | null) => void
  onCloneEvidence?: (relationUid: string) => void
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  rows,
  errors,
  bgClass,
  displayMenuButton,
  displayAddButton,
  onSearchAnnotations,
  onCloneEvidence,
}) => {
  if (rows.length === 0) return null
  return (
    <div className={`flex w-full flex-col items-stretch ${bgClass}`}>
      {rows.map(row => (
        <div key={row.termNode.uid} className="flex flex-row items-stretch">
          {row.termNode.isComplement && (
            <div className="flex w-[28px] shrink-0 items-center justify-center bg-gray-200 text-center text-[8px] font-bold tracking-wide text-gray-700">
              IS NOT
            </div>
          )}
          <div className="w-full">
            <EntityRow
              node={row.termNode}
              relation={row.relation}
              parentTermUid={row.parentTermUid}
              treeLevel={row.treeLevel}
              displayGroup={group}
              errors={errors}
              displayMenuButton={displayMenuButton}
              displayAddButton={displayAddButton}
              onSearchAnnotations={onSearchAnnotations}
              onCloneEvidence={onCloneEvidence}
            />
          </div>
        </div>
      ))}
    </div>
  )
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

  /**
   * Build display-group cards.
   * - All nodes flatten into rows tagged with their displayGroup card.
   * - Within FD, cards render in (mf, bp, cc) order; within each card, members
   *   sort by weight. Same idea for GP (single gp card).
   * - Special case: the MF root row carries the enabled_by relation so its
   *   evidence cells render on the MF row (matches old form). The GP row's
   *   own relation is then nulled so evidence isn't shown twice.
   */
  const { gpGroups, fdGroups } = useMemo(() => {
    if (!root) {
      return {
        gpGroups: [] as Array<[DisplayGroup, GroupedRow[]]>,
        fdGroups: [] as Array<[DisplayGroup, GroupedRow[]]>,
      }
    }

    const all = buildGroupedRows(root)

    const enabledByRel = root.relations.find(r => r.predicate.id === Relations.ENABLED_BY) ?? null
    if (enabledByRel) {
      const mfRow = all.find(r => r.termNode.uid === root.uid)
      const gpRow = all.find(r => r.termNode.uid === enabledByRel.target.uid)
      if (mfRow) mfRow.relation = enabledByRel
      if (gpRow) gpRow.relation = null
    }

    const bucket = (rows: GroupedRow[]) => {
      const map = new Map<DisplayGroup, GroupedRow[]>()
      for (const r of rows) {
        const list = map.get(r.displayGroup) ?? []
        list.push(r)
        map.set(r.displayGroup, list)
      }
      // Preserve the real tree depth so MF stays at level 1 and its children
      // (GP via enabled_by, BP, CC, etc.) render one level deeper.
      for (const list of map.values()) {
        list.sort((a, b) => a.treeLevel - b.treeLevel || a.weight - b.weight)
      }
      return Array.from(map.entries()).sort(
        ([a], [b]) => (GROUP_ORDER[a] ?? 99) - (GROUP_ORDER[b] ?? 99)
      )
    }

    const gpRows = all.filter(r => r.displayGroup === DisplayGroup.GP)
    const fdRows = all.filter(r => r.displayGroup !== DisplayGroup.GP)

    return { gpGroups: bucket(gpRows), fdGroups: bucket(fdRows) }
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
          size: 'cam',
          bodyScroll: 'none',
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
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-200">
        {activityType === ActivityType.PROTEIN_COMPLEX && (
          <div className="mx-3 mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs italic text-amber-800">
            Note that this should be used rarely, and only in the case where the activity cannot be
            ascribed to a single subunit of a complex
          </div>
        )}
        {/* GP Section */}
        {gpGroups.length > 0 && (
          <div className="flex flex-col items-stretch justify-start">
            <div className="flex h-9 items-center border-b border-gray-200 bg-gray-50 px-4">
              <span className="text-sm font-semibold text-gray-700">
                {sectionTitles.gp}
              </span>
            </div>
            <div className="flex flex-col items-stretch justify-start">
              {gpGroups.map(([group, rows]) => (
                <GroupCard
                  key={group}
                  group={group}
                  rows={rows}
                  errors={errors}
                  bgClass=""
                  displayMenuButton={false}
                  displayAddButton={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* FD Section */}
        <div className="flex flex-col items-stretch justify-start">
          {/* Header mirrors EntityRow columns: [Term 250px] [Evidence 50%] [Ref 25%] [With 25%] + menu spacer */}
          <div className="flex h-9 flex-row items-stretch border-b border-t border-gray-200 bg-gray-50">
            <div
              className="flex shrink items-center p-1"
              style={{ flexBasis: 250 }}
            >
              <span className="pl-2 text-sm font-semibold text-gray-700">
                {sectionTitles.fd}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-row items-stretch">
              <div className="w-1/2 p-1" aria-hidden="true" />
              <div className="flex w-1/4 items-center justify-center p-1">
                <Tooltip
                  label="Allowed Reference DBs"
                  position="bottom"
                  withArrow
                  openDelay={300}
                >
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    aria-label="View allowed Reference DBs"
                    onClick={e => setRefInfoAnchor(e.currentTarget)}
                  >
                    <FaInfoCircle size={12} />
                  </ActionIcon>
                </Tooltip>
              </div>
              <div className="flex w-1/4 items-center justify-center p-1">
                <Tooltip
                  label="Allowed With/From DBs"
                  position="bottom"
                  withArrow
                  openDelay={300}
                >
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    aria-label="View allowed With/From DBs"
                    onClick={e => setWithInfoAnchor(e.currentTarget)}
                  >
                    <FaInfoCircle size={12} />
                  </ActionIcon>
                </Tooltip>
              </div>
            </div>
            {/* Spacer for the row's ellipsis menu (ActionIcon size md + px-2 ≈ 48px) */}
            <div className="w-12 shrink-0" aria-hidden="true" />
          </div>
          <div className="flex flex-col items-stretch justify-start">
            {fdGroups.map(([group, rows]) => (
              <GroupCard
                key={group}
                group={group}
                rows={rows}
                errors={errors}
                bgClass="bg-slate-200"
                displayMenuButton={true}
                onSearchAnnotations={handleSearchAnnotations}
                onCloneEvidence={handleCloneEvidence}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex h-[50px] shrink-0 flex-row items-center justify-end gap-2 border-t border-gray-300 bg-gray-100 px-3">
        {hasErrors && (
          <button
            type="button"
            onClick={() => setShowErrorsDialog(true)}
            className="mr-auto flex items-center gap-1.5 text-xs font-medium text-amber-700 underline decoration-dotted underline-offset-2 hover:text-amber-800"
          >
            <FaExclamationCircle size={12} />
            Why is the &quot;Save&quot; button disabled?
          </button>
        )}
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Clear
        </Button>
        <Button
          variant="filled"
          onClick={handleSave}
          disabled={isSaving || hasErrors}
          leftSection={<FaSave size={12} />}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Errors dialog */}
      <Modal
        opened={showErrorsDialog}
        onClose={() => setShowErrorsDialog(false)}
        size={resolveModalSize('sm')}
        classNames={{ content: 'overflow-hidden' }}
      >
        <DialogHeader title="Validation Errors" onClose={() => setShowErrorsDialog(false)} />
        <div className="p-4">
          <ul className="flex flex-col gap-1">
            {errors.map((err, i) => (
              <li
                key={`${err.uid}-${err.field}-${i}`}
                className="flex items-center gap-2 text-sm"
              >
                <span className="flex w-8 shrink-0 items-center justify-center">
                  <FaExclamationCircle className="text-red-500" />
                </span>
                <span>{err.message}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <Button variant="outline" onClick={() => setShowErrorsDialog(false)}>Close</Button>
        </div>
      </Modal>

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
