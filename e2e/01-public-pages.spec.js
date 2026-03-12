// @ts-check
const { test, expect } = require('@playwright/test')

test.describe('Homepage', () => {
  test('loads and shows hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Knowledge Orbit/)
    await expect(page.locator('h1')).toContainText(/Read freely|Write boldly/i)
  })

  test('shows nav with Sign In and Write for us buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Sign In/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Write for us/i })).toBeVisible()
  })

  test('shows topic chips', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Anime' })).toBeVisible()
    await expect(page.getByRole('link', { name: /AI & LLMs/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Security' })).toBeVisible()
  })

  test('shows feed section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Latest Posts')).toBeVisible()
  })

  test('shows writer CTA banner', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Your ideas deserve/i)).toBeVisible()
  })

  test('footer shows affiliate disclosure', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/affiliate links/i)).toBeVisible()
  })
})

test.describe('Become a Writer page', () => {
  test('loads correctly', async ({ page }) => {
    await page.goto('/become-a-writer')
    await expect(page).toHaveTitle(/Write for Knowledge Orbit/)
    await expect(page.locator('h1')).toContainText(/worth saying/i)
  })

  test('shows topic grid', async ({ page }) => {
    await page.goto('/become-a-writer')
    await expect(page.getByText('Anime & Manga')).toBeVisible()
    await expect(page.getByText('AI & LLMs')).toBeVisible()
    await expect(page.getByText('Security & CTF')).toBeVisible()
  })

  test('shows how it works steps', async ({ page }) => {
    await page.goto('/become-a-writer')
    await expect(page.getByText('Create your account')).toBeVisible()
    await expect(page.getByText('Write your first post')).toBeVisible()
    await expect(page.getByText('Publish to the world')).toBeVisible()
  })

  test('CTA links to /login?intent=write', async ({ page }) => {
    await page.goto('/become-a-writer')
    const cta = page.getByRole('link', { name: /Start writing/i }).first()
    await expect(cta).toHaveAttribute('href', '/login?intent=write')
  })
})

test.describe('Search page', () => {
  test('loads and shows search input', async ({ page }) => {
    await page.goto('/search')
    await expect(page).toHaveTitle(/Search/)
    await expect(page.getByRole('textbox')).toBeVisible()
  })
})
