const { chromium } = require('playwright')

const BASE = 'http://localhost:3001'
const EMAIL = 'sreeni4298@gmail.com'
const PASS = 'Sreeni@123'
const COVER_URL = 'https://i.imgur.com/6bRPO0t.jpeg'

const log = (msg) => console.log(`\n[TEST] ${msg}`)
const ok = (msg) => console.log(`  ✅ ${msg}`)
const fail = (msg) => console.log(`  ❌ ${msg}`)
const info = (msg) => console.log(`  ℹ  ${msg}`)

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  // Collect console errors
  const consoleErrors = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', e => consoleErrors.push(e.message))

  try {
    // ── 1. HOME PAGE ──────────────────────────────────────
    log('HOME PAGE')
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 })
    const title = await page.title()
    info(`Title: ${title}`)
    if (title.includes('Knowledge Orbit')) { ok('Title correct') } else { fail(`Bad title: ${title}`) }

    const hero = await page.locator('h1').first().textContent()
    info(`Hero text: ${hero?.trim()}`)
    if (hero?.includes('Knowledge')) { ok('Hero visible') } else { fail('Hero not found') }

    const header = await page.locator('header').first().isVisible()
    if (header) { ok('Header present') } else { fail('No header') }

    // ── 2. LOGIN PAGE ─────────────────────────────────────
    log('LOGIN PAGE')
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 })

    const emailInput = page.locator('input[type="email"]')
    const passInput = page.locator('input[type="password"]')
    await emailInput.waitFor({ timeout: 5000 })
    if (await emailInput.isVisible()) { ok('Email input visible') } else { fail('Email input missing') }
    if (await passInput.isVisible()) { ok('Password input visible') } else { fail('Password input missing') }

    const oauthBtns = await page.locator('button:has-text("Google"), button:has-text("GitHub"), button:has-text("LinkedIn")').count()
    info(`OAuth buttons found: ${oauthBtns}`)
    if (oauthBtns >= 2) { ok('OAuth buttons present') } else { fail('Missing OAuth buttons') }

    // ── 3. SIGN UP (create user) ──────────────────────────
    log(`SIGN UP with ${EMAIL}`)
    const signupBtn = page.locator('button:has-text("Sign up free")')
    await signupBtn.click()
    await page.waitForTimeout(300)

    await emailInput.fill(EMAIL)
    await passInput.fill(PASS)
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)

    const alertText = await page.locator('[role="alert"], .text-green-500, [class*="success"], [class*="info"]').first().textContent().catch(() => '')
    const errText = await page.locator('[role="alert"]').first().textContent().catch(() => '')
    info(`Response after signup: ${alertText || errText || '(no alert shown)'}`)

    if (alertText?.includes('email') || alertText?.includes('confirm') || errText?.includes('exists') || errText?.includes('email')) {
      ok('Signup responded correctly')
    } else {
      info('Signup response unclear — may need email confirmation')
    }

    // ── 4. SIGN IN ─────────────────────────────────────────
    log(`SIGN IN with ${EMAIL}`)
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 })

    // Switch to signin
    const switchSignin = page.locator('button:has-text("Sign in")')
    if (await switchSignin.isVisible()) await switchSignin.click()
    await page.waitForTimeout(200)

    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('input[type="password"]').fill(PASS)
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(4000)

    const afterSignin = page.url()
    info(`URL after signin: ${afterSignin}`)
    if (afterSignin.includes('/login')) {
      const signinErr = await page.locator('[role="alert"]').first().textContent().catch(() => '')
      info(`Sign-in error: ${signinErr}`)
      info('Sign-in failed — email may need confirmation first. Continuing tests...')
    } else {
      ok(`Signed in, redirected to: ${afterSignin}`)
    }

    // ── 5. WRITE PAGE (unauthenticated test) ──────────────
    log('WRITE PAGE (redirect test if unauthed)')
    await page.goto(`${BASE}/write`, { waitUntil: 'networkidle', timeout: 15000 })
    const writeUrl = page.url()
    info(`Write page URL: ${writeUrl}`)
    if (writeUrl.includes('/login')) ok('Correctly redirected unauthed user to login')
    else if (writeUrl.includes('/write')) ok('Write page loaded (user is authed)')
    else fail(`Unexpected URL: ${writeUrl}`)

    // ── 6. DASHBOARD (auth protected) ─────────────────────
    log('DASHBOARD (redirect test if unauthed)')
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 })
    const dashUrl = page.url()
    info(`Dashboard URL: ${dashUrl}`)
    if (dashUrl.includes('/login')) ok('Correctly redirected unauthed user to login')
    else if (dashUrl.includes('/dashboard')) ok('Dashboard loaded (user authed)')
    else fail(`Unexpected URL: ${dashUrl}`)

    // ── 7. SEARCH PAGE ─────────────────────────────────────
    log('SEARCH PAGE')
    await page.goto(`${BASE}/search`, { waitUntil: 'networkidle', timeout: 15000 })
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]')
    if (await searchInput.isVisible()) ok('Search input visible')
    else fail('Search input missing')

    // ── 8. 404 PAGE ────────────────────────────────────────
    log('404 PAGE')
    await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: 'networkidle', timeout: 15000 })
    const is404 = (await page.locator('body').textContent())?.toLowerCase()
    if (is404?.includes('404') || is404?.includes('not found') || is404?.includes('page')) {
      ok('404 page renders')
    } else {
      fail('404 page content unclear')
    }

    // ── 9. IF SIGNED IN: write & save draft ───────────────
    // Re-check if we're signed in by checking for avatar in header
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 })
    const isSignedIn = await page.locator('[aria-label="Write"], a[href="/write"]').first().isVisible().catch(() => false)

    if (isSignedIn) {
      log('WRITE + SAVE DRAFT (signed in)')
      await page.goto(`${BASE}/write`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(1500)

      const titleArea = page.locator('textarea').first()
      await titleArea.fill('My First Draft Post — Space & AI')
      await page.waitForTimeout(500)

      // Click into editor and type some content
      const editor = page.locator('.tiptap, [contenteditable="true"]').first()
      await editor.click()
      await editor.type('This is a test post about space exploration and AI. The future is exciting!')
      await page.waitForTimeout(500)

      // Save as draft (top bar)
      const saveDraftBtn = page.locator('button:has-text("Save Draft")')
      await saveDraftBtn.click()
      await page.waitForTimeout(3000)

      const afterSave = page.url()
      info(`URL after save draft: ${afterSave}`)
      if (afterSave.includes('/posts/')) ok('Draft saved and redirected to post')
      else {
        const saveErr = await page.locator('[role="alert"]').first().textContent().catch(() => '')
        info(`Save error: ${saveErr}`)
        fail('Draft save may have failed')
      }

      // Now test with cover image via publish panel
      log('WRITE with cover image via publish panel')
      await page.goto(`${BASE}/write`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(1500)

      const titleArea2 = page.locator('textarea').first()
      await titleArea2.fill('Beautiful Space Imagery — Exploration Beyond Earth')
      await page.waitForTimeout(300)

      const editor2 = page.locator('.tiptap, [contenteditable="true"]').first()
      await editor2.click()
      await editor2.type('Space is vast and beautiful. Here is a look at some stunning imagery from the cosmos.')
      await page.waitForTimeout(300)

      // Click Continue
      const continueBtn = page.locator('button:has-text("Continue")')
      await continueBtn.click()
      await page.waitForTimeout(800)

      // Fill in the publish panel
      const coverInput = page.locator('input[placeholder*="https"]').first()
      if (await coverInput.isVisible()) {
        await coverInput.fill(COVER_URL)
        ok('Cover URL entered')
      }

      const summaryArea = page.locator('textarea').last()
      await summaryArea.fill('A visual journey through the cosmos — stunning images of space exploration.')
      ok('Summary entered')

      // Add a tag
      const tagInput = page.locator('input[placeholder*="tag"]').first()
      if (await tagInput.isVisible()) {
        await tagInput.fill('space')
        await tagInput.press('Enter')
        await page.waitForTimeout(300)
        await tagInput.fill('ai')
        await tagInput.press('Enter')
        ok('Tags added')
      }

      // Save as draft
      const saveDraftPanel = page.locator('button:has-text("Save as draft")')
      await saveDraftPanel.click()
      await page.waitForTimeout(3000)

      const afterPanelSave = page.url()
      info(`URL after panel save: ${afterPanelSave}`)
      if (afterPanelSave.includes('/posts/')) ok('Post with cover image saved successfully')
      else {
        const panelErr = await page.locator('[role="alert"]').first().textContent().catch(() => '')
        info(`Panel save result: ${panelErr}`)
      }

    } else {
      info('User not signed in — skipping write/dashboard tests (email confirmation needed)')
    }

    // ── 10. UI SPOT CHECKS ─────────────────────────────────
    log('UI SPOT CHECKS')

    // Color mode toggle
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 })
    const colorToggle = page.locator('button[aria-label*="color"], button[aria-label*="mode"], button[aria-label*="theme"]').first()
    if (await colorToggle.isVisible()) ok('Color mode toggle present')
    else info('Color mode toggle not found by aria-label (may still exist)')

    // Footer
    const footer = await page.locator('footer').first().isVisible()
    if (footer) { ok('Footer visible') } else { fail('Footer missing') }

    // ── SUMMARY ────────────────────────────────────────────
    log('CONSOLE ERRORS COLLECTED')
    const relevant = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('CORS') &&
      !e.includes('net::ERR')
    )
    if (relevant.length === 0) {
      ok('No significant console errors')
    } else {
      relevant.slice(0, 8).forEach(e => fail(e.substring(0, 120)))
    }

  } catch (e) {
    console.error('\n[PLAYWRIGHT ERROR]', e.message)
  } finally {
    await browser.close()
    console.log('\n── Test run complete ──')
  }
})()
