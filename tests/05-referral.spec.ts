/**
 * QA Suite 5 — Referral Program
 * Covers: Referral code generation, referrer bonus, invalid codes
 * Ref: Gemini QA Q2 (Referral Logic), Q10 (Referral Tracking fields), PRD §4
 */

import { test, expect } from '@playwright/test'
import { uniqueEmail, registerUser } from './helpers'

const TEST_PASSWORD = 'TestPass123!'

test.describe('Referral Code Generation', () => {
  test('new user gets a referral code after registration', async ({ page }) => {
    const email = uniqueEmail('refgen')
    await registerUser(page, 'Ashwin Ref', email, TEST_PASSWORD)
    await page.goto('/wallet')

    // Referral code should be visible in the "Refer Friends" section
    const codeArea = page.locator('text=Refer Friends').locator('..')
    await expect(codeArea).toBeVisible()

    // Code format: FIRSTNAME + 3 digits e.g. ASHWIN123
    const code = page.locator('text=/^[A-Z]{2,8}\\d{3}$/')
    await expect(code).toBeVisible({ timeout: 8000 })
  })

  test('referral code follows FIRSTNAME+3digit format', async ({ page }) => {
    await registerUser(page, 'Jon Jones', uniqueEmail('jon'), TEST_PASSWORD)
    await page.goto('/wallet')

    // Should start with JON
    await expect(page.locator('text=/^JON\\d{3}$/')).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Referral Reward Logic — Q2', () => {
  test('referrer gets 500 FC bonus when friend signs up with their code', async ({ page, browser }) => {
    // Step 1: Register the referrer
    const referrerEmail = uniqueEmail('referrer')
    await registerUser(page, 'Referrer User', referrerEmail, TEST_PASSWORD)

    // Step 2: Get referrer's code
    await page.goto('/wallet')
    const codeEl = page.locator('text=/^[A-Z]{2,8}\\d{3}$/')
    await expect(codeEl).toBeVisible({ timeout: 8000 })
    const referralCode = await codeEl.textContent()

    // Step 3: New user registers with the referral code
    const newUserEmail = uniqueEmail('newuser')
    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    await page2.goto('/register')
    await page2.fill('input[type="text"]', 'New User')
    await page2.fill('input[type="email"]', newUserEmail)
    await page2.fill('input[type="password"]', TEST_PASSWORD)
    await page2.fill('input[placeholder*="e.g."]', referralCode!)
    await page2.click('button[type="submit"]')
    await page2.waitForURL('/', { timeout: 15000 })
    await ctx2.close()

    // Step 4: Referrer's balance should now be 1500 (1000 welcome + 500 bonus)
    await page.goto('/wallet')
    await expect(page.locator('text=/1,500|1500/')).toBeVisible({ timeout: 10000 })

    // Referral bonus transaction should appear
    await expect(page.locator('text=/Referral bonus/i').first()).toBeVisible()
  })

  test('Q2: only the referrer gets 500 FC — new user gets 1000 FC welcome only', async ({ page, browser }) => {
    const referrerEmail = uniqueEmail('refcheck')
    await registerUser(page, 'Ref Checker', referrerEmail, TEST_PASSWORD)
    await page.goto('/wallet')
    const codeEl = page.locator('text=/^[A-Z]{2,8}\\d{3}$/')
    await expect(codeEl).toBeVisible({ timeout: 8000 })
    const referralCode = await codeEl.textContent()

    const newUserEmail = uniqueEmail('newref')
    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    await page2.goto('/register')
    await page2.fill('input[type="text"]', 'New Ref User')
    await page2.fill('input[type="email"]', newUserEmail)
    await page2.fill('input[type="password"]', TEST_PASSWORD)
    await page2.fill('input[placeholder*="e.g."]', referralCode!)
    await page2.click('button[type="submit"]')
    await page2.waitForURL('/', { timeout: 15000 })

    // New user gets 1000, NOT 1500
    await page2.goto('/wallet')
    await expect(page2.locator('text=/1,000|1000/')).toBeVisible({ timeout: 10000 })
    // No referral bonus for the new user
    await expect(page2.locator('text=/Referral bonus/i')).not.toBeVisible()
    await ctx2.close()
  })

  test('invalid referral code shows error on register', async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[type="text"]', 'Test User')
    await page.fill('input[type="email"]', uniqueEmail('badref'))
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.fill('input[placeholder*="e.g."]', 'INVALID999')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/invalid.*referral|referral.*invalid/i')).toBeVisible({ timeout: 8000 })
  })

  test('registration works without a referral code', async ({ page }) => {
    const email = uniqueEmail('noref')
    await registerUser(page, 'No Ref User', email, TEST_PASSWORD)
    await expect(page).toHaveURL('/')
    await expect(page.locator('nav').locator('text=/1,/')).toBeVisible({ timeout: 8000 })
  })
})
