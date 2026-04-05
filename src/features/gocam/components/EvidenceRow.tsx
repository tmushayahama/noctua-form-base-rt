import type React from 'react'
import { useState, useCallback, useRef } from 'react'
import { FaPencilAlt, FaTrash } from 'react-icons/fa'
import type { Evidence, UserContext } from '../models/cam'
import { EditorCategory } from '../models/editorCategory'
import { AnnotationKey } from '../models/operations'
import { useUpdateGraphModelMutation } from '../slices/camApiSlice'
import {
  buildEditIndividualTypeOperations,
  buildEditEvidenceAnnotationOperations,
} from '../services/activityOperations'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'
import EditorDropdown from './forms/EditorDropdown'
import type { EditorDropdownValues } from './forms/EditorDropdown'

const cellBase =
  'group/cell relative min-h-[38px] border border-blue-800/30 px-2 py-1 text-[10px] leading-tight'

const floatingLabel =
  'pointer-events-none absolute -top-2 left-1.5 z-10 bg-white px-0.5 text-[9px] font-semibold text-gray-500'

const deleteBtn =
  'absolute right-0 top-0 hidden h-5 w-5 items-center justify-center text-red-400 hover:bg-red-400 hover:text-white group-hover/cell:flex'

const editBtn =
  'absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center text-gray-500 opacity-0 hover:bg-gray-200 group-hover/cell:opacity-100'

export interface EvidenceRowProps {
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
      <div ref={evCellRef} className={`${cellBase} ml-1 flex grow flex-col items-stretch rounded-lg`}>
        <div className={floatingLabel}>Evidence</div>
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
        <button onClick={() => onRemoveEvidence(ev)} className={deleteBtn}>
          <FaTrash size={10} />
        </button>
        <button onClick={() => openEditor(evCellRef, EditorCategory.evidence)} className={editBtn}>
          <FaPencilAlt size={9} />
        </button>
      </div>

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
          <button onClick={() => onClearField(ev, AnnotationKey.SOURCE)} className={deleteBtn}>
            <FaTrash size={10} />
          </button>
        )}
        <button onClick={() => openEditor(refCellRef, EditorCategory.reference)} className={editBtn}>
          <FaPencilAlt size={9} />
        </button>
      </div>

      <div ref={withCellRef} className={`${cellBase} ml-1 flex w-[100px] shrink-0 flex-col items-stretch rounded-lg`}>
        <div className={floatingLabel}>With</div>
        <span>{ev.with || '—'}</span>
        {ev.with && (
          <button onClick={() => onClearField(ev, AnnotationKey.WITH)} className={deleteBtn}>
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

export default EvidenceRow
