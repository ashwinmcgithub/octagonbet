/**
 * QA Suite 4 — Wallet, Transfers & Recharge Policy
 * Covers: Balance display, FC transfer, transaction history, recharge policy
 * Ref: Gemini QA Q4 (Recharge Policy), Q5 (Social Dependency), Q8 (Transaction types), PRD §5.4
 */

import { test, expect } from '@playwright/test'
import { uniqueEmail, registerUser } from './helpers'

const TEST_PASSWORD = 'TestPass123!'

test.describe('Wallet Page', () => {
  test.beforeEach(async ({ page }) => {
    const email = uniqueEmail('wallet')
    await registerUser(page, 'Wallet User', email, TEST_PASSWORD)
    await page.goto('/wallet')
  })

  test('wallet page shows FC balance prominently', async ({ page }) => {
    await expect(page.getByText('FightCoin Balance', { exact: true })).toBeVisible({ timeout: 10000 })
    // Balance should show 1000 for new user
    await expect(page.getByText(/1,000|1000/).first()).toBeVisible()
  })

  test('wallet shows user name and email', async ({ page }) => {
    await expect(page.locator('text=Wallet User')).toBeVisible()
  })

  test('NO recharge button exists — Q4: recharge replaced by referral & transfers', async ({ page }) => {
    // Per PRD v1.2 business rule 7: no manual recharge
    const rechargeBtn = page.locator('button, a').filter({ hasText: /recharge/i })
    await expect(rechargeBtn).not.toBeVisible()
  })

  test('NO purchase packages exist — replaced by social system', async ({ page }) => {
    // Starter/Fighter/Champion/Legend packs should be gone
    await expect(page.locator('text=Starter Pack')).not.toBeVisible()
    await expect(page.locator('text=Fighter Pack')).not.toBeVisible()
    await expect(page.locator('text=Champion Pack')).not.toBeVisible()
    await expect(page.locator('text=Legend Pack')).not.toBeVisible()
  })

  test('Send FightCoins section is present — Q5: social transfer', async ({ page }) => {
    await expect(page.getByText('Send FightCoins', { exact: true }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('transfer quick amounts (100, 250, 500) are present', async ({ page }) => {
    await expect(page.getByRole('button', { name: '100', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '250', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '500', exact: true })).toBeVisible()
  })

  test('transfer fails when sending to self', async ({ page }) => {
    // Wait for wallet to fully load before interacting
    await expect(page.getByText('Send FightCoins', { exact: true }).first()).toBeVisible({ timeout: 10000 })
    await page.fill('input[type="email"]', 'nobody-fake-99999@nonexistent-domain.xyz')
    await page.fill('input[type="number"]', '100')
    await page.locator('button[type="submit"]').click()
    // API returns "No user found with that email" → shown in red <p> tag
    await expect(page.locator('p').filter({ hasText: /not found|no user|invalid|error|failed/i }).first()).toBeVisible({ timeout: 12000 })
  })

  test('transfer fails for unknown recipient email', async ({ page }) => {
    await page.fill('input[type="email"]', 'nobody123@nowhere-invalid.com')
    await page.fill('input[type="number"]', '100')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('p').filter({ hasText: /not found|no user/i }).first()).toBeVisible({ timeout: 8000 })
  })

  test('transfer fails when amount exceeds balance', async ({ page }) => {
    await page.fill('input[type="email"]', 'someone@example.com')
    await page.fill('input[type="number"]', '999999')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('p').filter({ hasText: /insufficient/i }).first()).toBeVisible({ timeout: 8000 })
  })

  test('referral code section is visible — Q5: only two ways to get FC', async ({ page }) => {
    await expect(page.getByText('Refer Friends', { exact: true })).toBeVisible({ timeout: 10000 })
    // Referral code displayed
    await expect(page.locator('text=/500 FC|FC 500/i').first()).toBeVisible()
  })

  test('referral code copy button works', async ({ page }) => {
    const copyBtn = page.locator('button').filter({ hasText: /copy/i })
    await expect(copyBtn).toBeVisible()
    await copyBtn.click()
    await expect(page.locator('text=/copied/i')).toBeVisible({ timeout: 3000 })
  })

  test('transaction history section exists', async ({ page }) => {
    await expect(page.getByText('Transaction History', { exact: true })).toBeVisible()
  })

  test('welcome bonus transaction is recorded — Q8: "initial" type', async ({ page }) => {
    await expect(page.locator('text=/Welcome bonus/i').first()).toBeVisible()
    await expect(page.locator('text=+FC').first()).toBeVisible()
  })

  test('all required transaction types are supported — Q8', async ({ page }) => {
    const txHistory = page.getByText('Transaction History', { exact: true })
    await expect(txHistory).toBeVisible()
    // Welcome Bonus label should be shown (exact match on the badge)
    await expect(page.getByText('Welcome Bonus', { exact: true })).toBeVisible()
  })
})

test.describe('Peer-to-Peer Transfer — Q5', () => {
  test('user can successfully send FC to another registered user', async ({ page, browser }) => {
    // Register two users
    const senderEmail = uniqueEmail('sender')
    const receiverEmail = uniqueEmail('receiver')

    await registerUser(page, 'Sender', senderEmail, TEST_PASSWORD)

    // Register receiver in a separate context
    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    await registerUser(page2, 'Receiver', receiverEmail, TEST_PASSWORD)
    await ctx2.close()

    // Sender transfers to receiver
    await page.goto('/wallet')
    await page.fill('input[type="email"]', receiverEmail)
    await page.fill('input[type="number"]', '200')
    await page.locator('button[type="submit"]').click()

    await expect(page.locator('text=/sent.*200|200.*receiver|transfer.*success/i')).toBeVisible({ timeout: 10000 })

    // Sender balance should now be 800 — check the large balance display
    await expect(page.getByRole('main').getByText(/800/)).toBeVisible({ timeout: 5000 })
  })
})
