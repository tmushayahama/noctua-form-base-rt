import { test, expect } from '@playwright/test'
import { buildModelUrl } from './fixtures/test-urls'
import {
  getModelIdFromRaw,
  getTitleFromRaw,
  loadRaw,
  mockBaristaMetadata,
  mockBaristaModel,
} from './mocks/barista'

test.describe('model loading', () => {
  test('loads a model end-to-end with mocked Barista (no token, read-only)', async ({ page }) => {
    const raw = loadRaw('another-model')
    const modelId = getModelIdFromRaw(raw)

    await mockBaristaMetadata(page)
    await mockBaristaModel(page, raw)

    await page.goto(buildModelUrl(modelId))

    // Splash dismisses once users + groups resolve (+ 500ms delay).
    await expect(page.locator('img[alt="App Logo"]')).toBeHidden({ timeout: 10_000 })

    // Model fetch resolves — "Loading..." overlay should be gone.
    await expect(page.getByText('Loading...', { exact: true })).toBeHidden()

    // No transport error.
    await expect(page.getByText('Error loading graph data')).toHaveCount(0)

    // We didn't pass a barista_token, so the read-only banner should be visible.
    await expect(page.getByText('Not Logged In:')).toBeVisible()

    // Toolbar reflects the loaded model — proves the cam slice was hydrated and the
    // toolbar re-rendered. Title comes from the raw fixture's top-level annotations.
    const expectedTitle = getTitleFromRaw(raw)
    await expect(page.getByTestId('model-title')).toContainText(expectedTitle)
  })

  test('clicking the title pen opens the edit-model dialog', async ({ page }) => {
    const raw = loadRaw('another-model')
    await mockBaristaMetadata(page)
    await mockBaristaModel(page, raw)

    await page.goto(buildModelUrl(getModelIdFromRaw(raw)))

    // Wait for the toolbar to be populated before interacting.
    await expect(page.getByTestId('model-title')).toBeVisible({ timeout: 10_000 })

    await page.getByTestId('edit-model-title').click()

    // GlobalDialog renders the CamMetadataForm wrapped in a SimpleDialog with the
    // title "Edit Model" passed via openDialog(). Asserting the dialog by role
    // scoped to the header keeps the assertion stable across body changes.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Edit Model')
  })

  test('shows a friendly message when navigated without model_id', async ({ page }) => {
    await mockBaristaMetadata(page)
    await page.goto('/')

    await expect(page.locator('img[alt="App Logo"]')).toBeHidden({ timeout: 10_000 })
    await expect(page.getByText('No model ID provided')).toBeVisible()

    // Visual regression baseline. This is a fully static empty state — safe
    // for full-page diffing. Re-baseline with `npx playwright test -u`.
    await expect(page).toHaveScreenshot('no-model-id.png', { fullPage: true })
  })
})
