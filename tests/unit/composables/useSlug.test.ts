/**
 * tests/unit/composables/useSlug.test.ts
 *
 * Whitebox tests for app/composables/useSlug.ts
 *
 * toSlug() pipeline:
 *   1. toLowerCase()
 *   2. trim()
 *   3. remove non-word, non-space, non-hyphen characters
 *   4. collapse whitespace / underscores / hyphens into a single hyphen
 *   5. strip leading/trailing hyphens
 */

import { describe, it, expect } from 'vitest'
import { useSlug } from '../../../app/composables/useSlug.ts'

describe('useSlug — toSlug()', () => {
  const { toSlug } = useSlug()

  // Basic transforms
  it('converts uppercase to lowercase', () => {
    expect(toSlug('Hello World')).toBe('hello-world')
  })

  it('replaces spaces with hyphens', () => {
    expect(toSlug('hello world')).toBe('hello-world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(toSlug('  hello world  ')).toBe('hello-world')
  })

  it('collapses multiple spaces into a single hyphen', () => {
    expect(toSlug('hello   world')).toBe('hello-world')
  })

  // Special character removal
  it('strips special characters like !, @, #, $, %', () => {
    expect(toSlug('Hello! @World#')).toBe('hello-world')
  })

  it('strips punctuation — commas, periods, colons, semicolons', () => {
    expect(toSlug('Hello, World: Part 1.')).toBe('hello-world-part-1')
  })

  it('strips Unicode characters outside the \w set', () => {
    expect(toSlug('Héllo Wörld')).toBe('hllo-wrld')
  })

  it('removes apostrophes', () => {
    expect(toSlug("it's alive")).toBe('its-alive')
  })

  it('removes parentheses', () => {
    expect(toSlug('Vue (3.x) Guide')).toBe('vue-3x-guide')
  })

  // Hyphen and underscore handling
  it('replaces underscores with hyphens', () => {
    expect(toSlug('hello_world')).toBe('hello-world')
  })

  it('collapses multiple hyphens into one', () => {
    expect(toSlug('hello--world')).toBe('hello-world')
  })

  it('strips leading hyphens from result', () => {
    expect(toSlug('---hello')).toBe('hello')
  })

  it('strips trailing hyphens from result', () => {
    expect(toSlug('hello---')).toBe('hello')
  })

  it('handles a mix of underscores, spaces and hyphens', () => {
    expect(toSlug('hello - world_foo')).toBe('hello-world-foo')
  })

  // Numbers
  it('preserves numbers', () => {
    expect(toSlug('Chapter 1 — Introduction')).toBe('chapter-1-introduction')
  })

  it('handles a numeric-only string', () => {
    expect(toSlug('42')).toBe('42')
  })

  // Edge cases
  it('returns an empty string for an empty input', () => {
    expect(toSlug('')).toBe('')
  })

  it('returns an empty string for whitespace-only input', () => {
    expect(toSlug('   ')).toBe('')
  })

  it('returns an empty string for special-character-only input', () => {
    expect(toSlug('!!!')).toBe('')
  })

  it('handles a single word without transforms needed', () => {
    expect(toSlug('hello')).toBe('hello')
  })

  it('handles a realistic blog post title', () => {
    expect(toSlug('Top 5 AI/LLM Tools in 2025!')).toBe('top-5-aillm-tools-in-2025')
  })

  it('handles a security-style title with colons', () => {
    expect(toSlug('XSS: Understanding Cross-Site Scripting')).toBe('xss-understanding-cross-site-scripting')
  })
})
