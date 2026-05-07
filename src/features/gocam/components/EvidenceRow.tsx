import type React from 'react'
import { useState, useCallback, useRef } from 'react'
import type { Evidence, UserContext } from '../models/cam'
import { EditorCategory } from '../models/editorCategory'
import { AnnotationKey } from '../models/operations'
import { useUpdateGraphModelMutation } from '../slices/camApiSlice'
import {
  buildEditIndividualTypeOperations,
  buildEditEvidenceAnnotationOperations,
} from '../services/activityOperations'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'
import EditableCell from '@/@noctua.core/components/cell/EditableCell'
import EditorDropdown from './forms/EditorDropdown'
import type { EditorDropdownValues } from './forms/EditorDropdown'

interface EvidenceRowProps {
  ev: Evidence
  modelId: string
  userContext?: UserContext
  onRemoveEvidence: (ev: Evidence) => void
  onClearField: (ev: Evidence, key: AnnotationKey.SOURCE | AnnotationKey.WITH) => void
}

const EvidenceRow: React.FC<EvidenceRowProps> = ({
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
              ev.uid, AnnotationKey.SOURCE, ev.reference || '', values.reference, modelId, userContext
            )
          )
          break
        }
        case EditorCategory.with: {
          if (values.with === undefined) break
          await updateGraphModel(
            buildEditEvidenceAnnotationOperations(
              ev.uid, AnnotationKey.WITH, ev.with || '', values.with, modelId, userContext
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
      <EditableCell
        ref={evCellRef}
        label="Evidence"
        className="ml-1 grow"
        onEdit={() => openEditor(evCellRef, EditorCategory.evidence)}
        onDelete={() => onRemoveEvidence(ev)}
      >
        <span>
          {ev.evidenceCode?.label || '—'}
          {ev.evidenceCode?.id && (
            <>
              <br />
              <a
                href={`${ENVIRONMENT.amigoTermUrl}${ev.evidenceCode.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {ev.evidenceCode.id}
              </a>
            </>
          )}
        </span>
      </EditableCell>

      <EditableCell
        ref={refCellRef}
        label="Reference"
        className="ml-1 w-[100px] shrink-0"
        onEdit={() => openEditor(refCellRef, EditorCategory.reference)}
        onDelete={ev.reference ? () => onClearField(ev, AnnotationKey.SOURCE) : undefined}
      >
        {ev.referenceUrl ? (
          <a href={ev.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {ev.reference}
          </a>
        ) : (
          <span>{ev.reference || '—'}</span>
        )}
      </EditableCell>

      <EditableCell
        ref={withCellRef}
        label="With"
        className="ml-1 w-[100px] shrink-0"
        onEdit={() => openEditor(withCellRef, EditorCategory.with)}
        onDelete={ev.with ? () => onClearField(ev, AnnotationKey.WITH) : undefined}
      >
        <span>{ev.with || '—'}</span>
      </EditableCell>

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

export default EvidenceRow
