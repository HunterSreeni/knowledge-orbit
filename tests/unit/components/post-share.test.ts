/**
 * tests/unit/components/post-share.test.ts
 *
 * Whitebox tests for app/components/post/PostShare.vue
 *
 * Tests the computed share links and clipboard copy logic by
 * replicating the component's script setup logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed } from 'vue'

// ---------------------------------------------------------------------------
// Inline replica — mirrors PostShare.vue script setup logic
// ---------------------------------------------------------------------------

interface ShareLink {
  label: string
  icon: string
  href: string
}

function usePostShare(title: string, url: string) {
  const copied = ref(false)

  const shareLinks = computed<ShareLink[]>(() => [
    {
      label: 'Twitter',
      icon: 'i-simple-icons-x',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    },
    {
      label: 'LinkedIn',
      icon: 'i-simple-icons-linkedin',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    },
    {
      label: 'WhatsApp',
      icon: 'i-simple-icons-whatsapp',
      href: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`
    }
  ])

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }

  return { copied, shareLinks, copyLink }
}

// ---------------------------------------------------------------------------
// Tests — Share links
// ---------------------------------------------------------------------------

describe('PostShare — share links', () => {
  const title = 'My Blog Post'
  const url = 'https://knowledgeorbit.sreeniverse.co.in/posts/my-blog-post'

  it('generates exactly 3 share links (Twitter, LinkedIn, WhatsApp)', () => {
    const { shareLinks } = usePostShare(title, url)
    expect(shareLinks.value).toHaveLength(3)
  })

  it('includes a Twitter share link', () => {
    const { shareLinks } = usePostShare(title, url)
    const twitter = shareLinks.value.find(l => l.label === 'Twitter')
    expect(twitter).toBeDefined()
  })

  it('includes a LinkedIn share link', () => {
    const { shareLinks } = usePostShare(title, url)
    const linkedin = shareLinks.value.find(l => l.label === 'LinkedIn')
    expect(linkedin).toBeDefined()
  })

  it('includes a WhatsApp share link', () => {
    const { shareLinks } = usePostShare(title, url)
    const whatsapp = shareLinks.value.find(l => l.label === 'WhatsApp')
    expect(whatsapp).toBeDefined()
  })

  it('Twitter link contains encoded title', () => {
    const { shareLinks } = usePostShare(title, url)
    const twitter = shareLinks.value.find(l => l.label === 'Twitter')!
    expect(twitter.href).toContain(encodeURIComponent(title))
  })

  it('Twitter link contains encoded URL', () => {
    const { shareLinks } = usePostShare(title, url)
    const twitter = shareLinks.value.find(l => l.label === 'Twitter')!
    expect(twitter.href).toContain(encodeURIComponent(url))
  })

  it('Twitter link uses the correct intent URL base', () => {
    const { shareLinks } = usePostShare(title, url)
    const twitter = shareLinks.value.find(l => l.label === 'Twitter')!
    expect(twitter.href).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?/)
  })

  it('LinkedIn link contains encoded URL', () => {
    const { shareLinks } = usePostShare(title, url)
    const linkedin = shareLinks.value.find(l => l.label === 'LinkedIn')!
    expect(linkedin.href).toContain(encodeURIComponent(url))
  })

  it('LinkedIn link uses the correct share-offsite URL base', () => {
    const { shareLinks } = usePostShare(title, url)
    const linkedin = shareLinks.value.find(l => l.label === 'LinkedIn')!
    expect(linkedin.href).toMatch(/^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\//)
  })

  it('WhatsApp link contains both title and URL', () => {
    const { shareLinks } = usePostShare(title, url)
    const whatsapp = shareLinks.value.find(l => l.label === 'WhatsApp')!
    expect(whatsapp.href).toContain(encodeURIComponent(title + ' ' + url))
  })

  it('WhatsApp link uses the correct wa.me URL base', () => {
    const { shareLinks } = usePostShare(title, url)
    const whatsapp = shareLinks.value.find(l => l.label === 'WhatsApp')!
    expect(whatsapp.href).toMatch(/^https:\/\/wa\.me\//)
  })

  it('properly encodes special characters in title', () => {
    const specialTitle = 'C++ & JavaScript: A "Guide"'
    const { shareLinks } = usePostShare(specialTitle, url)
    const twitter = shareLinks.value.find(l => l.label === 'Twitter')!
    expect(twitter.href).toContain(encodeURIComponent(specialTitle))
    // Should not contain raw & or " in the URL
    expect(twitter.href).not.toContain('C++ & JavaScript')
  })
})

// ---------------------------------------------------------------------------
// Tests — Copy to clipboard
// ---------------------------------------------------------------------------

describe('PostShare — copy link', () => {
  const title = 'Test'
  const url = 'https://example.com/post'

  let writeTextMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls navigator.clipboard.writeText with the URL', async () => {
    const { copyLink } = usePostShare(title, url)
    await copyLink()
    expect(writeTextMock).toHaveBeenCalledWith(url)
  })

  it('sets copied to true after calling copyLink', async () => {
    const { copied, copyLink } = usePostShare(title, url)
    expect(copied.value).toBe(false)
    await copyLink()
    expect(copied.value).toBe(true)
  })

  it('resets copied to false after 2000ms', async () => {
    const { copied, copyLink } = usePostShare(title, url)
    await copyLink()
    expect(copied.value).toBe(true)
    vi.advanceTimersByTime(2000)
    expect(copied.value).toBe(false)
  })

  it('copied starts as false', () => {
    const { copied } = usePostShare(title, url)
    expect(copied.value).toBe(false)
  })
})
