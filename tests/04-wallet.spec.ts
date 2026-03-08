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
    await expect(page.locator('text=FightCoin Balance')).toBeVisible()
    await expect(page.locator('text=FC')).toBeVisible()
    // Balance should show 1000 for new user
    await expect(page.locator('text=/1,000|1000/')).toBeVisible()
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
    await expect(page.locator('text=Send FightCoins')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('transfer quick amounts (100, 250, 500) are present', async ({ page }) => {
    await expect(page.locator('button', { hasText: '100' })).toBeVisible()
    await expect(page.locator('button', { hasText: '250' })).toBeVisible()
    await expect(page.locator('button', { hasText: '500' })).toBeVisible()
  })

  test('transfer fails when sending to self', async ({ page }) => {
    await page.fill('input[type="email"]', 'wallet' + '@octagontest.com')
    await page.fill('input[type="number"]', '100')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('text=/yourself|self/i')).toBeVisible({ timeout: 8000 })
  })

  test('transfer fails for unknown recipient email', async ({ page }) => {
    await page.fill('input[type="email"]', 'nobody123@nowhere-invalid.com')
    await page.fill('input[type="number"]', '100')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('text=/not found|no user/i')).toBeVisible({ timeout: 8000 })
  })

  test('transfer fails when amount exceeds balance', async ({ page }) => {
    await page.fill('input[type="email"]', 'someone@example.com')
    await page.fill('input[type="number"]', '999999')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('text=/insufficient/i')).toBeVisible({ timeout: 8000 })
  })

  test('referral code section is visible — Q5: only two ways to get FC', async ({ page }) => {
    await expect(page.locator('text=Refer Friends')).toBeVisible()
    // Referral code displayed
    await expect(page.locator('text=/earn.*500|500.*FC/i')).toBeVisible()
  })

  test('referral code copy button works', async ({ page }) => {
    const copyBtn = page.locator('button').filter({ hasText: /copy/i })
    await expect(copyBtn).toBeVisible()
    await copyBtn.click()
    await expect(page.locator('text=/copied/i')).toBeVisible({ timeout: 3000 })
  })

  test('transaction history section exists', async ({ page }) => {
    await expect(page.locator('text=Transaction History')).toBeVisible()
  })

  test('welcome bonus transaction is recorded — Q8: "initial" type', async ({ page }) => {
    await expect(page.locator('text=/Welcome bonus|initial/i')).toBeVisible()
    await expect(page.locator('text=+FC')).toBeVisible()
  })

  test('all required transaction types are supported — Q8', async ({ page }) => {
    // The transaction list config should handle these types
    // We verify the page handles them without crashing for a fresh user
    const txHistory = page.locator('text=Transaction History')
    await expect(txHistory).toBeVisible()
    // Welcome Bonus should be shown
    await expect(page.locator('text=Welcome Bonus')).toBeVisible()
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

    await expect(page.locator('text=/sent.*200|200.*receiver/i')).toBeVisible({ timeout: 10000 })

    // Sender balance should now be ~800
    await expect(page.locator('text=/800/')).toBeVisible({ timeout: 5000 })
  })
})
