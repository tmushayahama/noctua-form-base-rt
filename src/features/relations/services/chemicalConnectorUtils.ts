export interface ChemicalParticipant {
  id: string
  label: string
  selected: boolean
}

export interface CategorizedParticipants {
  common: ChemicalParticipant[]
  subjectOnly: ChemicalParticipant[]
  objectOnly: ChemicalParticipant[]
}

/**
 * Categorize chemical participants from two activities into:
 * - common: present in both subject and object
 * - subjectOnly: present only in subject (upstream)
 * - objectOnly: present only in object (downstream)
 *
 */
export function categorizeParticipants(
  subjectParticipants: Array<{ id: string; label: string }>,
  objectParticipants: Array<{ id: string; label: string }>
): CategorizedParticipants {
  const objectIds = new Set(objectParticipants.map(p => p.id))
  const subjectIds = new Set(subjectParticipants.map(p => p.id))

  const common: ChemicalParticipant[] = subjectParticipants
    .filter(p => objectIds.has(p.id))
    .map(p => ({ ...p, selected: true }))

  const subjectOnly: ChemicalParticipant[] = subjectParticipants
    .filter(p => !objectIds.has(p.id))
    .map(p => ({ ...p, selected: false }))

  const objectOnly: ChemicalParticipant[] = objectParticipants
    .filter(p => !subjectIds.has(p.id))
    .map(p => ({ ...p, selected: false }))

  return { common, subjectOnly, objectOnly }
}
