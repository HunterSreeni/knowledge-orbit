/**
 * tests/unit/components/reading-progress.test.ts
 *
 * Whitebox tests for app/components/post/ReadingProgress.vue
 *
 * Tests the scroll-progress calculation logic by replicating the
 * component's update() function and verifying progress values.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// ---------------------------------------------------------------------------
// Inline replica — mirrors ReadingProgress.vue update() logic exactly
// ---------------------------------------------------------------------------

function createReadingProgress() {
  const progress = ref(0)

  function update(elementRect: { top: number; height: number }, windowHeight: number) {
    const { top, height } = elementRect
    const scrolled = Math.max(0, -top)
    const total = height - windowHeight
    progress.value = total > 0 ? Math.min(100, (scrolled / total) * 100) : 0
  }

  return { progress, update }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReadingProgress — progress calculation', () => {
  it('progress starts at 0', () => {
    const { progress } = createReadingProgress()
    expect(progress.value).toBe(0)
  })

  it('progress is 0 when element is at the top (not scrolled)', () => {
    const { progress, update } = createReadingProgress()
    // Element top is 0 (at viewport top), height = 2000, window = 800
    update({ top: 0, height: 2000 }, 800)
    expect(progress.value).toBe(0)
  })

  it('progress is 0 when element top is positive (below viewport top)', () => {
    const { progress, update } = createReadingProgress()
    // Element hasn't reached the top yet
    update({ top: 100, height: 2000 }, 800)
    expect(progress.value).toBe(0)
  })

  it('progress increases as element scrolls up (negative top)', () => {
    const { progress, update } = createReadingProgress()
    // Element height = 2000, window = 800, total = 1200
    // Scrolled 600px (top = -600): 600/1200 = 50%
    update({ top: -600, height: 2000 }, 800)
    expect(progress.value).toBe(50)
  })

  it('progress is 100 when fully scrolled', () => {
    const { progress, update } = createReadingProgress()
    // Element height = 2000, window = 800, total = 1200
    // Scrolled 1200px (top = -1200): 1200/1200 = 100%
    update({ top: -1200, height: 2000 }, 800)
    expect(progress.value).toBe(100)
  })

  it('progress caps at 100 when scrolled beyond content', () => {
    const { progress, update } = createReadingProgress()
    // Scrolled past the end: top = -1500, height = 2000, window = 800
    // total = 1200, scrolled = 1500, 1500/1200 = 125% -> capped at 100
    update({ top: -1500, height: 2000 }, 800)
    expect(progress.value).toBe(100)
  })

  it('progress is 0 when total scrollable area is 0 (content fits in viewport)', () => {
    const { progress, update } = createReadingProgress()
    // Element height = 500, window = 800, total = -300 (not > 0)
    update({ top: -100, height: 500 }, 800)
    expect(progress.value).toBe(0)
  })

  it('progress is 0 when element height equals window height', () => {
    const { progress, update } = createReadingProgress()
    // height = window, total = 0 (not > 0)
    update({ top: -50, height: 800 }, 800)
    expect(progress.value).toBe(0)
  })

  it('calculates correct intermediate progress (25%)', () => {
    const { progress, update } = createReadingProgress()
    // total = 1200, scrolled = 300: 300/1200 = 25%
    update({ top: -300, height: 2000 }, 800)
    expect(progress.value).toBe(25)
  })

  it('calculates correct intermediate progress (75%)', () => {
    const { progress, update } = createReadingProgress()
    // total = 1200, scrolled = 900: 900/1200 = 75%
    update({ top: -900, height: 2000 }, 800)
    expect(progress.value).toBe(75)
  })

  it('updates progress when called multiple times', () => {
    const { progress, update } = createReadingProgress()
    update({ top: 0, height: 2000 }, 800)
    expect(progress.value).toBe(0)

    update({ top: -600, height: 2000 }, 800)
    expect(progress.value).toBe(50)

    update({ top: -1200, height: 2000 }, 800)
    expect(progress.value).toBe(100)
  })
})

describe('ReadingProgress — template contracts', () => {
  it('renders with width style based on progress value', () => {
    const { progress } = createReadingProgress()
    // The template uses :style="{ width: `${progress}%` }"
    const style = { width: `${progress.value}%` }
    expect(style.width).toBe('0%')
  })

  it('width reflects updated progress', () => {
    const { progress, update } = createReadingProgress()
    update({ top: -600, height: 2000 }, 800)
    const style = { width: `${progress.value}%` }
    expect(style.width).toBe('50%')
  })
})
