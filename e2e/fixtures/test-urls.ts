export const buildModelUrl = (modelId: string, opts: { baristaToken?: string } = {}): string => {
  const params = new URLSearchParams({ model_id: modelId })
  if (opts.baristaToken) params.set('barista_token', opts.baristaToken)
  return `/?${params.toString()}`
}
