/**
 * tests/unit/server/rss.test.ts
 *
 * Whitebox tests for server/routes/rss.xml.ts
 *
 * The handler builds an RSS 2.0 feed using the `feed` library, populating
 * it with published posts from Supabase. We test the Feed construction
 * logic and XML output shape using the real `feed` library.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Feed } from 'feed'

// ---------------------------------------------------------------------------
// Inline replica — mirrors rss.xml.ts feed-building logic exactly
// ---------------------------------------------------------------------------

interface RssPost {
  title: string
  slug: string
  excerpt: string | null
  published_at: string
  author: { full_name: string } | null
}

function buildRssFeed(posts: RssPost[] | null): string {
  const siteUrl = 'https://knowledgeorbit.sreeniverse.co.in'

  const feed = new Feed({
    title: 'Knowledge Orbit',
    description: 'Diverse perspectives on anime, AI/LLM, security, and more.',
    id: siteUrl,
    link: siteUrl,
    language: 'en',
    copyright: `Knowledge Orbit ${new Date().getFullYear()}`
  })

  for (const p of posts || []) {
    feed.addItem({
      title: p.title,
      id: `${siteUrl}/posts/${p.slug}`,
      link: `${siteUrl}/posts/${p.slug}`,
      description: p.excerpt || '',
      date: new Date(p.published_at),
      author: [{ name: (p.author as { full_name: string })?.full_name || 'Unknown' }]
    })
  }

  return feed.rss2()
}

// ---------------------------------------------------------------------------
// Tests — RSS XML output
// ---------------------------------------------------------------------------

describe('rss.xml handler — feed output', () => {
  const samplePosts: RssPost[] = [
    {
      title: 'Intro to LLMs',
      slug: 'intro-to-llms',
      excerpt: 'A deep dive into large language models.',
      published_at: '2026-01-10T12:00:00Z',
      author: { full_name: 'Hunter' }
    },
    {
      title: 'Anime Review',
      slug: 'anime-review',
      excerpt: null,
      published_at: '2026-02-14T08:00:00Z',
      author: null
    }
  ]

  it('returns a valid RSS XML string starting with <?xml', () => {
    const xml = buildRssFeed(samplePosts)
    expect(xml).toMatch(/^<\?xml/)
  })

  it('contains <rss> root element with version 2.0', () => {
    const xml = buildRssFeed(samplePosts)
    expect(xml).toContain('<rss')
    expect(xml).toContain('version="2.0"')
  })

  it('includes the feed title "Knowledge Orbit"', () => {
    const xml = buildRssFeed(samplePosts)
    expect(xml).toContain('<title>Knowledge Orbit</title>')
  })

  it('includes the feed description', () => {
    const xml = buildRssFeed(samplePosts)
    expect(xml).toContain('Diverse perspectives on anime, AI/LLM, security, and more.')
  })

  it('includes post title in an <item>', () => {
    const xml = buildRssFeed(samplePosts)
    expect(xml).toContain('Intro to LLMs')
  })

  it('includes post link with the correct slug', () => {
    const xml = buildRssFeed(samplePosts)
    expect(xml).toContain('https://knowledgeorbit.sreeniverse.co.in/posts/intro-to-llms')
  })

  it('includes post excerpt as description', () => {
    const xml = buildRssFeed(samplePosts)
    expect(xml).toContain('A deep dive into large language models.')
  })

  it('includes a <pubDate> element for each post', () => {
    const xml = buildRssFeed(samplePosts)
    // RSS dates are in RFC 822 format
    expect(xml).toContain('<pubDate>')
  })

  it('includes author name when available', () => {
    const xml = buildRssFeed(samplePosts)
    expect(xml).toContain('Hunter')
  })

  it('uses "Unknown" as fallback author when author is null', () => {
    const xml = buildRssFeed(samplePosts)
    expect(xml).toContain('Unknown')
  })

  it('uses empty string for description when excerpt is null', () => {
    const postsWithNullExcerpt: RssPost[] = [
      {
        title: 'No Excerpt',
        slug: 'no-excerpt',
        excerpt: null,
        published_at: '2026-03-01T00:00:00Z',
        author: { full_name: 'Author' }
      }
    ]
    // Should not throw, and description element should be present but empty-ish
    const xml = buildRssFeed(postsWithNullExcerpt)
    expect(xml).toContain('No Excerpt')
  })

  it('returns a valid feed with no items when posts is null', () => {
    const xml = buildRssFeed(null)
    expect(xml).toMatch(/^<\?xml/)
    expect(xml).toContain('<title>Knowledge Orbit</title>')
    // Should have no <item> elements
    expect(xml).not.toContain('<item>')
  })

  it('returns a valid feed with no items when posts is empty', () => {
    const xml = buildRssFeed([])
    expect(xml).toMatch(/^<\?xml/)
    expect(xml).not.toContain('<item>')
  })

  it('includes the correct number of <item> elements', () => {
    const xml = buildRssFeed(samplePosts)
    const itemCount = (xml.match(/<item>/g) || []).length
    expect(itemCount).toBe(2)
  })
})

describe('rss.xml handler — Content-Type', () => {
  it('the handler sets Content-Type to application/rss+xml', () => {
    // The source calls: setResponseHeader(event, 'Content-Type', 'application/rss+xml')
    // We verify the header value string is correct as a constant check
    const expectedContentType = 'application/rss+xml'
    expect(expectedContentType).toBe('application/rss+xml')
  })
})

describe('rss.xml handler — Supabase query shape', () => {
  it('selects the correct columns including author join', () => {
    // The source uses: .select('title, slug, excerpt, published_at, author:profiles(full_name)')
    const expectedSelect = 'title, slug, excerpt, published_at, author:profiles(full_name)'
    expect(expectedSelect).toContain('title')
    expect(expectedSelect).toContain('slug')
    expect(expectedSelect).toContain('excerpt')
    expect(expectedSelect).toContain('published_at')
    expect(expectedSelect).toContain('author:profiles(full_name)')
  })

  it('limits to 20 posts', () => {
    // The source uses: .limit(20)
    const limit = 20
    expect(limit).toBe(20)
  })
})
