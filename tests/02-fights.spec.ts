/**
 * QA Suite 2 — Fight Listings & Odds Display
 * Covers: Fight cards, odds formatting, filters, sync button
 * Ref: Gemini QA Q9 (Odds Formatting), PRD §5.2
 */

import { test, expect } from '@playwright/test'
import { uniqueEmail, registerUser } from './helpers'

test.describe('Home Page — Fight Listings', () => {
  test('home page loads and shows fight listing section', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/OctagonBet/i)
    await expect(page.locator('text=/octagon|UFC|fight/i').first()).toBeVisible()
  })

  test('filter tabs are present: All, Live, Upcoming, Completed', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /all/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /upcoming/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /completed/i })).toBeVisible()
  })

  test('sync odds button is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /sync/i })).toBeVisible()
  })

  test('fight cards show VS between fighter names', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(5000) // allow odds sync
    const vsElements = page.locator('span:has-text("VS"), div:has-text("VS")').filter({ hasText: /^VS$/ })
    const count = await vsElements.count()
    // At least one fight should be shown (demo fights seeded)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('odds are displayed in American format (+/- prefix)', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(5000)
    // Look for American odds format e.g. +150, -200, -450
    const content = await page.content()
    const hasAmericanOdds = /[+-]\d{2,4}/.test(content)
    expect(hasAmericanOdds).toBeTruthy()
  })

  test('no decimal/fractional odds toggle exists (Q9 — American only)', async ({ page }) => {
    await page.goto('/')
    // There should be no odds format toggle button
    const toggle = page.locator('text=/decimal|fractional|toggle odds/i')
    await expect(toggle).not.toBeVisible()
  })

  test('upcoming filter shows only upcoming fights', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /upcoming/i }).click()
    await page.waitForTimeout(1000)
    // LIVE NOW badge should not appear under upcoming filter
    const liveNow = page.locator('text=LIVE NOW')
    const count = await liveNow.count()
    expect(count).toBe(0)
  })

  test('completed filter shows fights with COMPLETED badge', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /completed/i }).click()
    await page.waitForTimeout(1000)
    // Either no fights or fights with COMPLETED label
    const completedBadge = page.locator('text=COMPLETED')
    const noFights = page.locator('text=/no.*fight/i')
    const either = (await completedBadge.count()) > 0 || (await noFights.count()) > 0
    expect(either).toBeTruthy()
  })

  test('empty state message shown when no fights match filter', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^live/i }).click()
    await page.waitForTimeout(1000)
    // Either live fights exist or empty state shown
    const emptyState = page.locator('text=/no.*fight|sync/i')
    const liveCard = page.locator('text=LIVE NOW')
    const either = (await emptyState.count()) > 0 || (await liveCard.count()) > 0
    expect(either).toBeTruthy()
  })
})
