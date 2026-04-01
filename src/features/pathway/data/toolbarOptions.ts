import type { LayoutDetail, LayoutSpacing } from '../graph/camCanvas'

export const layoutDetailOptions: { id: LayoutDetail; label: string }[] = [
  { id: 'detailed', label: 'Detailed' },
  { id: 'activity', label: 'Activity' },
  { id: 'simple', label: 'Simple' },
]

export const spacingOptions: { id: LayoutSpacing; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'relaxed', label: 'Loose' },
]
