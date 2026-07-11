import { expect, test } from '@playwright/test'

test('public landing reaches the auth shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Meet a Strangr.' })).toBeVisible()
  await page.getByRole('link', { name: 'Create your account ↗' }).click()
  await expect(page.getByRole('heading', { name: 'Come meet someone new.' })).toBeVisible()
})

test('account shell exposes core destinations', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByRole('heading', { name: 'Meet someone new.' })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Mobile navigation', includeHidden: true }),
  ).toBeAttached()
})

test('report actions remain distinct in the call room', async ({ page }) => {
  await page.goto('/conversation/text')
  await page.getByRole('button', { name: 'Report conversation' }).click()
  await expect(page.getByRole('button', { name: 'Submit report' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit and leave' })).toBeVisible()
})

test('admin remains a separate surface', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/')
  await expect(page.getByRole('heading', { name: 'Admin access.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue to MFA' })).toBeDisabled()
})
