import type React from 'react'
import { useCallback, useEffect, useMemo } from 'react'
import { Button, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { RootState } from '@/app/store/store'
import { Relations } from '@/@noctua.core/models/relations'
import {
  initCreateForm,
  resetForm,
  setErrors,
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
import EntityRow from './EntityRow'

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

  useEffect(() => {
    if (!root && mode === 'create' && !activityType) {
      dispatch(initCreateForm('activity'))
    }
  }, [root, mode, activityType, dispatch])

  // Separate GP (enabled_by) and FD (everything else) sections
  const { gpRows, fdRows } = useMemo(() => {
    if (!root) return { gpRows: [] as FlatRow[], fdRows: [] as FlatRow[] }

    const gp: FlatRow[] = []
    const fd: FlatRow[] = []

    // Find the enabled_by relation (evidence lives here but displays on MF row)
    const enabledByRelation =
      root.relations.find(r => r.predicate.id === Relations.ENABLED_BY) ?? null

    // GP section: enabled_by targets, NO evidence (just the term + add button)
    for (const rel of root.relations) {
      if (rel.predicate.id === Relations.ENABLED_BY) {
        // Pass relation=null so no evidence columns are shown on GP row
        gp.push({
          termNode: rel.target,
          relation: null,
          parentTermUid: root.uid,
          treeLevel: 1,
        })
        // If the GP target has children (e.g. protein complex has_part), flatten those
        for (const childRel of rel.target.relations) {
          const rows: FlatRow[] = []
          flattenNode(childRel.target, childRel, rel.target.uid, 2, rows)
          gp.push(...rows)
        }
      }
    }

    // FD section: root MF node (with enabled_by evidence) + non-enabled_by relations
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
    if (!root || !model?.id) return

    const validationErrors = validateActivityForm(formState)
    dispatch(setErrors(validationErrors))
    if (validationErrors.length > 0) return

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
  }, [formState, root, model, mode, existingActivityUid, dispatch, updateGraphModel, onSaved])

  const handleCancel = useCallback(() => {
    dispatch(resetForm())
    onCancel?.()
  }, [dispatch, onCancel])

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
                      />
                    </div>
                  </div>
                )
              }
              // Deeper nested rows rendered inside the previous node group
              return null
            })}

            {/* Render deeper rows grouped under their parent */}
            {renderNestedNodeGroups(root, errors)}
          </div>
        </div>
      </div>

      {/* Footer */}
      {errors.some(e => e.field === 'activity') && (
        <div className="px-4 text-sm text-red-500">
          {errors.find(e => e.field === 'activity')?.message}
        </div>
      )}
      <div className="flex flex-row items-center justify-start border-t px-4 py-3">
        <span className="grow" />
        <Button
          variant="outlined"
          onClick={handleCancel}
          disabled={isSaving}
          className="mr-2"
        >
          Clear
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

/** Render FD node groups that have nested children (tree level 3+) */
function renderNestedNodeGroups(
  root: TermNode,
  errors: ValidationError[]
): React.ReactNode[] {
  const groups: React.ReactNode[] = []

  for (const rel of root.relations) {
    if (rel.predicate.id === Relations.ENABLED_BY) continue

    // Check if this target has its own children
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
