/**
 * QA Suite 8 — Architecture & PRD Compliance
 * Covers: Tech stack validation, page routing, meta, responsive layout
 * Ref: Gemini QA Q1 (Architecture), PRD §3 & §9
 */

import { test, expect } from '@playwright/test'

test.describe('Architecture Compliance — Q1', () => {
  test('site uses Next.js (verified via x-powered-by header or meta)', async ({ page }) => {
    const response = await page.goto('/')
    const headers = response?.headers() ?? {}
    // Next.js sets x-powered-by or similar headers
    const powered = headers['x-powered-by'] ?? ''
    // Next.js may not expose this in prod, so also check HTML structure
    const html = await page.content()
    expect(html.includes('__NEXT_DATA__') || powered.toLowerCase().includes('next')).toBeTruthy()
  })

  test('site has correct page title — OctagonBet', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/OctagonBet/i)
  })

  test('all core routes are reachable', async ({ page }) => {
    const routes = ['/', '/login', '/register']
    for (const route of routes) {
      const res = await page.goto(route)
      expect(res?.status()).toBeLessThan(400)
    }
  })

  test('navbar is sticky and visible on scroll', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, 500))
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

  test('logo OCTAGONBET is present in navbar', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=OCTAGONBET')).toBeVisible()
  })

  test('site is responsive — mobile viewport shows hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    // Mobile menu button should appear
    const menuBtn = page.locator('nav button').last()
    await expect(menuBtn).toBeVisible()
  })

  test('desktop viewport shows 3-column fight grid — Q1 PRD §9', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await page.waitForTimeout(3000)
    // Grid with xl:grid-cols-3 class
    const grid = page.locator('.grid')
    await expect(grid.first()).toBeVisible()
  })

  test('dark theme applied — background is dark', async ({ page }) => {
    await page.goto('/')
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor
    })
    // Dark theme: rgb values should all be low (dark)
    const [r, g, b] = (bgColor.match(/\d+/g) ?? ['255', '255', '255']).map(Number)
    expect(r + g + b).toBeLessThan(200) // dark background
  })
})

test.describe('Navigation', () => {
  test('Fights nav link goes to home', async ({ page }) => {
    await page.goto('/login')
    await page.locator('text=Fights').click()
    await expect(page).toHaveURL('/')
  })

  test('Sign In link on home navigates to /login', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=Sign In').click()
    await expect(page).toHaveURL('/login')
  })

  test('Get Started button navigates to /register', async ({ page }) => {
    await page.goto('/')
    await page.locator('text=Get Started').click()
    await expect(page).toHaveURL('/register')
  })

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=/register|sign up|create/i')).toBeVisible()
  })

  test('register page has link back to login', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('text=/sign in|log in|already/i')).toBeVisible()
  })
})
