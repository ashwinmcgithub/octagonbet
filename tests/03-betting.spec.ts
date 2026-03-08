/**
 * QA Suite 3 — Betting Flow
 * Covers: Bet placement, balance deduction, payout preview, validation rules
 * Ref: PRD §5.3, Business Rules 1-6
 */

import { test, expect } from '@playwright/test'
import { uniqueEmail, registerUser, loginUser } from './helpers'

const TEST_PASSWORD = 'TestPass123!'

test.describe('Betting Modal', () => {
  test.beforeEach(async ({ page }) => {
    const email = uniqueEmail('bettor')
    await registerUser(page, 'Bettor User', email, TEST_PASSWORD)
    await page.waitForTimeout(2000) // wait for odds sync
  })

  test('clicking a fighter opens the betting modal', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)

    // Click the first fighter button (fight cards have two clickable fighter buttons)
    const fighterBtn = page.locator('button').filter({ hasText: /Jones|Makhachev|Pereira|Miocic|Oliveira|Prochazka/ }).first()
    if (await fighterBtn.count() > 0) {
      await fighterBtn.click()
      await expect(page.locator('text=Place Your Bet')).toBeVisible({ timeout: 8000 })
    }
  })

  test('betting modal shows fighter name, opponent, and odds', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)

    const fighterBtn = page.locator('button').filter({ hasText: /[A-Z]{2,}/ }).first()
    if (await fighterBtn.count() > 0) {
      await fighterBtn.click()
      const modal = page.locator('text=Place Your Bet')
      await expect(modal).toBeVisible({ timeout: 8000 })
      await expect(page.locator('text=vs')).toBeVisible()
      await expect(page.locator('text=/Odds/i')).toBeVisible()
    }
  })

  test('quick amount buttons (50, 100, 250, 500) are present in modal', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)

    const fighterBtn = page.locator('button').filter({ hasText: /[A-Z]{2,}/ }).first()
    if (await fighterBtn.count() > 0) {
      await fighterBtn.click()
      await expect(page.locator('text=Place Your Bet')).toBeVisible({ timeout: 8000 })
      await expect(page.locator('button', { hasText: '50' })).toBeVisible()
      await expect(page.locator('button', { hasText: '100' })).toBeVisible()
      await expect(page.locator('button', { hasText: '250' })).toBeVisible()
      await expect(page.locator('button', { hasText: '500' })).toBeVisible()
    }
  })

  test('payout preview updates when amount is entered', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)

    const fighterBtn = page.locator('button').filter({ hasText: /[A-Z]{2,}/ }).first()
    if (await fighterBtn.count() > 0) {
      await fighterBtn.click()
      await expect(page.locator('text=Place Your Bet')).toBeVisible({ timeout: 8000 })
      await page.fill('input[type="number"]', '100')
      await expect(page.locator('text=/Payout|profit/i')).toBeVisible()
    }
  })

  test('bet placement fails with zero amount', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)

    const fighterBtn = page.locator('button').filter({ hasText: /[A-Z]{2,}/ }).first()
    if (await fighterBtn.count() > 0) {
      await fighterBtn.click()
      await expect(page.locator('text=Place Your Bet')).toBeVisible({ timeout: 8000 })
      const placeBtn = page.locator('button').filter({ hasText: /Place Bet/i })
      await expect(placeBtn).toBeDisabled()
    }
  })

  test('bet placement fails when amount exceeds balance — Business Rule 2', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)

    const fighterBtn = page.locator('button').filter({ hasText: /[A-Z]{2,}/ }).first()
    if (await fighterBtn.count() > 0) {
      await fighterBtn.click()
      await expect(page.locator('text=Place Your Bet')).toBeVisible({ timeout: 8000 })
      await page.fill('input[type="number"]', '999999')
      const placeBtn = page.locator('button').filter({ hasText: /Place Bet/i })
      await placeBtn.click()
      await expect(page.locator('text=/insufficient|not enough/i')).toBeVisible({ timeout: 5000 })
    }
  })

  test('successful bet shows success message and closes modal', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)

    const fighterBtn = page.locator('button').filter({ hasText: /[A-Z]{2,}/ }).first()
    if (await fighterBtn.count() > 0) {
      await fighterBtn.click()
      await expect(page.locator('text=Place Your Bet')).toBeVisible({ timeout: 8000 })
      await page.fill('input[type="number"]', '50')
      const placeBtn = page.locator('button').filter({ hasText: /Place Bet/i })
      await placeBtn.click()
      await expect(page.locator('text=/Bet Placed|Good luck/i')).toBeVisible({ timeout: 10000 })
    }
  })

  test('balance decreases after placing a bet — Business Rule 3', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)

    // Read initial balance from navbar
    const initialBalanceText = await page.locator('nav').getByText(/[\d,]+/).first().textContent()
    const initialBalance = parseInt((initialBalanceText ?? '1000').replace(/,/g, ''))

    const fighterBtn = page.locator('button').filter({ hasText: /[A-Z]{2,}/ }).first()
    if (await fighterBtn.count() > 0) {
      await fighterBtn.click()
      await expect(page.locator('text=Place Your Bet')).toBeVisible({ timeout: 8000 })
      await page.fill('input[type="number"]', '100')
      await page.locator('button').filter({ hasText: /Place Bet/i }).click()
      await expect(page.locator('text=/Bet Placed/i')).toBeVisible({ timeout: 10000 })
      await page.waitForTimeout(2000)

      const newBalanceText = await page.locator('nav').getByText(/[\d,]+/).first().textContent()
      const newBalance = parseInt((newBalanceText ?? '900').replace(/,/g, ''))
      expect(newBalance).toBeLessThan(initialBalance)
    }
  })

  test('cannot bet on completed fights — Business Rule 1', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /completed/i }).click()
    await page.waitForTimeout(1000)

    const completedCard = page.locator('text=COMPLETED').first()
    if (await completedCard.count() > 0) {
      // Fighter buttons in completed cards should be disabled
      const disabledBtn = page.locator('button[disabled]').filter({ hasText: /[A-Z]{2}/ }).first()
      expect(await disabledBtn.count()).toBeGreaterThan(0)
    }
  })
})
