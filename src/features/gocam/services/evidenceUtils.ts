import type { Entity, EvidenceForm } from '../models/cam'
import type { GOlrResponse } from '@/features/search/models/search'

/** Check if an evidence row has a valid evidence code selected. */
export const isValidEvidence = (ev: EvidenceForm): boolean => !!ev.evidenceCode?.id

/** Pick just {id, label} from a GOlrResponse to store as Entity. */
export const toEntity = (golr: GOlrResponse): Entity => ({
  id: golr.id,
  label: golr.label,
})
