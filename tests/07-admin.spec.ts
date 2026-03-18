/**
 * QA Suite 7 — Admin Panel
 * Covers: Admin access, stats dashboard, sync & settle, fight/user management
 * Ref: Gemini QA Q7 (Role Permissions), PRD §5.6
 */

import { test, expect } from '@playwright/test'
import { uniqueEmail, registerUser, loginUser } from './helpers'

const TEST_PASSWORD = 'TestPass123!'
const ADMIN_EMAIL = 'admin@octagonbet.com'
const ADMIN_PASSWORD = 'admin123'

test.describe('Admin Access Control — Q7', () => {
  test('admin can access /admin panel', async ({ page }) => {
    await loginUser(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 })
  })

  test('admin panel shows stat cards: Users, Fights, Bets, Pending', async ({ page }) => {
    await loginUser(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/admin')
    await expect(page.locator('text=Total Users')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('text=Active Fights')).toBeVisible()
    await expect(page.locator('text=Total Bets')).toBeVisible()
    await expect(page.locator('text=Pending Bets')).toBeVisible()
  })

  test('admin panel shows pending bet volume', async ({ page }) => {
    await loginUser(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/admin')
    await expect(page.locator('text=Pending Bet Volume')).toBeVisible({ timeout: 8000 })
  })

  test('Sync Odds & Settle button is visible and clickable', async ({ page }) => {
    await loginUser(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/admin')
    const syncBtn = page.locator('button', { hasText: /Sync.*Settle|Settle/i })
    await expect(syncBtn).toBeVisible({ timeout: 8000 })
    await syncBtn.click()
    // Should show syncing state or result
    await expect(page.locator('text=/syncing|synced|settled/i').first()).toBeVisible({ timeout: 15000 })
  })

  test('admin can navigate to /admin/fights', async ({ page }) => {
    await loginUser(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/admin/fights')
    await expect(page).toHaveURL('/admin/fights')
    await expect(page.locator('body')).not.toContainText('Access Denied')
  })

  test('admin can navigate to /admin/users', async ({ page }) => {
    await loginUser(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/admin/users')
    await expect(page).toHaveURL('/admin/users')
    await expect(page.locator('body')).not.toContainText('Access Denied')
  })

  test('admin link appears in user dropdown for admin users', async ({ page }) => {
    await loginUser(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.waitForSelector('nav', { timeout: 10000 })
    // The user menu button has rounded-full styling (not the mobile hamburger)
    const userMenuBtn = page.locator('nav button.rounded-full')
    await expect(userMenuBtn).toBeVisible({ timeout: 10000 })
    await userMenuBtn.click()
    await expect(page.locator('text=Admin Panel').first()).toBeVisible({ timeout: 5000 })
  })

  test('regular user cannot access /admin — Q7 contrast', async ({ page }) => {
    const email = uniqueEmail('regular')
    await registerUser(page, 'Regular Joe', email, TEST_PASSWORD)
    await page.goto('/admin')
    // Should be redirected or blocked
    await page.waitForTimeout(3000)
    await expect(page).not.toHaveURL('/admin')
  })

  test('admin panel is NOT visible in dropdown for regular users', async ({ page }) => {
    const email = uniqueEmail('nodropdown')
    await registerUser(page, 'No Admin', email, TEST_PASSWORD)
    await page.waitForSelector('nav', { timeout: 10000 })
    const userMenuBtn = page.locator('nav button.rounded-full')
    await expect(userMenuBtn).toBeVisible({ timeout: 10000 })
    await userMenuBtn.click()
    await expect(page.locator('text=Admin Panel')).not.toBeVisible({ timeout: 3000 })
  })
})
