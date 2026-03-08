/**
 * QA Suite 1 — Authentication
 * Covers: Registration, Login, Logout, Google OAuth presence, Role access
 * Ref: Gemini QA Q7 (Role Permissions), PRD §5.1
 */

import { test, expect } from '@playwright/test'
import { uniqueEmail, registerUser, loginUser } from './helpers'

const TEST_PASSWORD = 'TestPass123!'

test.describe('Registration', () => {
  test('new user can register with email and gets 1,000 FC welcome bonus', async ({ page }) => {
    const email = uniqueEmail('reg')
    await registerUser(page, 'Test Fighter', email, TEST_PASSWORD)

    // Should land on home page (redirected after login)
    await expect(page).toHaveURL('/')

    // Navbar should show balance
    const nav = page.locator('nav')
    await expect(nav).toContainText('1,000', { timeout: 10000 })
  })

  test('registration fails with duplicate email', async ({ page }) => {
    const email = uniqueEmail('dup')
    await registerUser(page, 'First User', email, TEST_PASSWORD)
    await page.goto('/register')
    await page.fill('input[type="text"]', 'Second User')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page.locator('text=already in use')).toBeVisible({ timeout: 8000 })
  })

  test('registration fails with short password (under 8 chars)', async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[type="text"]', 'Test User')
    await page.fill('input[type="email"]', uniqueEmail('short'))
    await page.fill('input[type="password"]', '123')
    await page.click('button[type="submit"]')
    // Should either show error or browser validation
    const url = page.url()
    expect(url).toContain('/register')
  })

  test('Google OAuth button is visible on register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Continue with Google')).toBeVisible()
  })

  test('GitHub OAuth button is visible on register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Continue with GitHub')).toBeVisible()
  })

  test('referral code field is present and accepts input', async ({ page }) => {
    await page.goto('/register')
    const referralInput = page.locator('input[placeholder*="e.g."]')
    await expect(referralInput).toBeVisible()
    await referralInput.fill('TEST123')
    await expect(referralInput).toHaveValue('TEST123')
  })
})

test.describe('Login', () => {
  test('registered user can log in', async ({ page }) => {
    const email = uniqueEmail('login')
    await registerUser(page, 'Login Tester', email, TEST_PASSWORD)
    // Sign out
    await page.click('button:has-text("chevron"), [aria-label*="user" i], nav button', { timeout: 5000 }).catch(() => {})
    await page.goto('/login')
    await loginUser(page, email, TEST_PASSWORD)
    await expect(page).toHaveURL('/')
    await expect(page.locator('nav')).toContainText('1,', { timeout: 10000 })
  })

  test('login fails with wrong password', async ({ page }) => {
    const email = uniqueEmail('wrongpw')
    await registerUser(page, 'Wrong PW', email, TEST_PASSWORD)
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'WrongPassword999!')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 20000 })
  })

  test('login fails with unknown email', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'nobody@nowhere.com')
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 20000 })
  })

  test('unauthenticated user is redirected to login from /my-bets', async ({ page }) => {
    await page.goto('/my-bets')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('unauthenticated user is redirected to login from /wallet', async ({ page }) => {
    await page.goto('/wallet')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})

test.describe('Role Permissions (Gemini QA Q7)', () => {
  test('guest user can view fights but not place bets', async ({ page }) => {
    await page.goto('/')
    // Fight cards should be visible
    await expect(page.locator('text=/vs/i').first()).toBeVisible({ timeout: 10000 })
    // Clicking a fighter redirects to login
    const fightBtn = page.locator('button').filter({ hasText: /Jones|Makhachev|Pereira|Miocic|Oliveira|Prochazka/ }).first()
    if (await fightBtn.count() > 0 && await fightBtn.isVisible()) {
      await fightBtn.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
    }
  })

  test('admin panel is not accessible to regular users', async ({ page }) => {
    const email = uniqueEmail('regularuser')
    await registerUser(page, 'Regular User', email, TEST_PASSWORD)
    await page.goto('/admin')
    // Should redirect or show access denied
    await expect(page).not.toHaveURL('/admin', { timeout: 5000 })
  })

  test('admin panel is accessible to admin user', async ({ page }) => {
    await loginUser(page, 'admin@octagonbet.com', 'admin123')
    await page.goto('/admin')
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 })
  })
})
