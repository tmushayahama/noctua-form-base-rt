import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAW_DIR = path.resolve(__dirname, '..', '..', 'tests', 'fixtures', 'raw')

export type FixtureName = 'swiss-1' | 'another-model' | 'large-val'

export const loadRaw = (name: FixtureName): unknown => {
  return JSON.parse(readFileSync(path.join(RAW_DIR, `${name}.json`), 'utf-8'))
}

const fakeUsers = [
  {
    nickname: 'Test User',
    uri: 'https://orcid.org/0000-0000-0000-0000',
    group: 'http://geneontology.org/groups/test',
    color: '#3b82f6',
  },
]

const fakeGroups = [
  { label: 'Test Group', id: 'http://geneontology.org/groups/test' },
]

const jsonResponse = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

export const mockBaristaMetadata = async (page: Page): Promise<void> => {
  await page.route('**/users', route => route.fulfill(jsonResponse(fakeUsers)))
  await page.route('**/groups', route => route.fulfill(jsonResponse(fakeGroups)))
}

export const mockBaristaModel = async (
  page: Page,
  fixture: FixtureName | unknown
): Promise<void> => {
  const raw =
    typeof fixture === 'string'
      ? loadRaw(fixture as FixtureName)
      : fixture
  await page.route('**/m3Batch*', route =>
    route.fulfill(jsonResponse({ data: raw }))
  )
}

export const getModelIdFromRaw = (raw: unknown): string => {
  if (!raw || typeof raw !== 'object') throw new Error('raw fixture is not an object')
  const id = (raw as { id?: unknown }).id
  if (typeof id !== 'string') throw new Error('raw fixture has no string id')
  return id
}

export const getTitleFromRaw = (raw: unknown): string => {
  if (!raw || typeof raw !== 'object') throw new Error('raw fixture is not an object')
  const annotations = (raw as { annotations?: Array<{ key: string; value: string }> }).annotations
  const title = annotations?.find(a => a.key === 'title')?.value
  if (!title) throw new Error('raw fixture has no title annotation')
  return title
}
