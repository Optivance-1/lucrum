import { test, expect } from '@playwright/test'

test.describe('public pages and API', () => {
  test('home loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Your Stripe/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Try MAX free/i })).toBeVisible()
  })

  test('pricing loads', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.locator('body')).toBeVisible()
  })

  test('connect page loads', async ({ page }) => {
    await page.goto('/connect')
    await expect(page.locator('body')).toBeVisible()
  })

  test('legal pages load', async ({ page }) => {
    for (const path of ['/privacy', '/terms', '/security']) {
      await page.goto(path)
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('health API', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
  })
})
