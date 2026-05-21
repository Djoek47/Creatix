import { test, expect } from '@playwright/test'

/**
 * Public routes only (no auth). Runs once per Playwright project (Chromium, Firefox, WebKit, 2 mobile profiles).
 */
test.describe('localhost smoke — all browser projects', () => {
  test('home responds and shows Circe / Creatix branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Circe|Creatix/i)
    await expect(page.locator('body')).toBeVisible()
  })

  test('pricing page loads', async ({ page }) => {
    const res = await page.goto('/pricing')
    expect(res?.ok()).toBeTruthy()
    await expect(page.locator('body')).toBeVisible()
  })

  test('features page loads', async ({ page }) => {
    const res = await page.goto('/features')
    expect(res?.ok()).toBeTruthy()
    await expect(page.locator('body')).toBeVisible()
  })

  test('login page loads', async ({ page }) => {
    const res = await page.goto('/auth/login')
    expect(res?.ok()).toBeTruthy()
    await expect(page.locator('body')).toBeVisible()
  })
})
