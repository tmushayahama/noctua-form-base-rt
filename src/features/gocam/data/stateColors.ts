const STATE_COLORS: Record<string, string> = {
  development: 'bg-orange-300 text-amber-900 border-orange-400',
  production: 'bg-green-200 text-green-900 border-green-400',
  review: 'bg-lime-200 text-yellow-900 border-lime-400',
  delete: 'bg-red-100 text-red-800 border-red-300',
}

const DEFAULT_STATE_COLOR = 'bg-gray-100 text-gray-800 border-gray-300'

export function getStateColor(stateName?: string): string {
  if (!stateName) return DEFAULT_STATE_COLOR
  return STATE_COLORS[stateName] ?? DEFAULT_STATE_COLOR
}
