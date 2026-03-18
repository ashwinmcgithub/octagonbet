import { Page } from '@playwright/test'

export const BASE_URL = process.env.BASE_URL || 'https://octagonbet.vercel.app'

// Unique email per test run to avoid conflicts
export function uniqueEmail(prefix = 'testuser') {
  return `${prefix}+${Date.now()}@octagontest.com`
}

export async function registerUser(page: Page, name: string, email: string, password: string, referralCode?: string) {
  await page.goto('/register')
  // Use placeholder-based selectors to avoid ambiguity with multiple text inputs
  await page.fill('input[placeholder="Jon Jones"]', name)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  if (referralCode) {
    await page.fill('input[placeholder*="e.g."]', referralCode)
  }
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 45000 })
}

export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  // Wait for any navigation away from /login (could go to / or /admin)
  await page.waitForFunction(
    () => !window.location.pathname.startsWith('/login'),
    { timeout: 30000 }
  )
}

export async function getBalance(page: Page): Promise<number> {
  const balanceText = await page.locator('nav').getByText(/\d+/).first().textContent()
  return parseInt((balanceText ?? '0').replace(/,/g, ''))
}
