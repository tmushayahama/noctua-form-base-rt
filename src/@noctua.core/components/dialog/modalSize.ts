/** Maps MUI Dialog `maxWidth` breakpoint names to pixel widths so Mantine
 * Modal sizing matches what the codebase used to get from MUI. */
export const MODAL_SIZE_PX: Record<string, number> = {
  xs: 444,
  sm: 600,
  cam: 800,
  md: 900,
  lg: 1200,
  xl: 1536,
}

export const resolveModalSize = (
  size: string | number | undefined,
  fallback: keyof typeof MODAL_SIZE_PX = 'md'
): number => {
  if (typeof size === 'number') return size
  if (typeof size === 'string' && size in MODAL_SIZE_PX) return MODAL_SIZE_PX[size]
  return MODAL_SIZE_PX[fallback]
}
