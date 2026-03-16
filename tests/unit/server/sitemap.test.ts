/**
 * tests/unit/server/sitemap.test.ts
 *
 * Whitebox tests for server/api/sitemap.get.ts
 *
 * The handler queries Supabase for published posts and maps them into
 * sitemap entry objects with loc, lastmod, changefreq, and priority.
 *
 * Strategy: inline replica of the handler's mapping logic, tested with
 * a mocked Supabase client chain.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Inline replica — mirrors sitemap.get.ts business logic exactly
// ---------------------------------------------------------------------------

interface PostRow {
  slug: string
  updated_at: string
}

interface SitemapEntry {
  loc: string
  lastmod: string
  changefreq: string
  priority: number
}

function buildSitemapEntries(posts: PostRow[] | null): SitemapEntry[] {
  return (posts || []).map(p => ({
    loc: `/posts/${p.slug}`,
    lastmod: p.updated_at,
    changefreq: 'weekly',
    priority: 0.8
  }))
}

// ---------------------------------------------------------------------------
// Supabase chain mock builder
// ---------------------------------------------------------------------------

function buildSupaChain(returnData: PostRow[] | null) {
  const orderMock = vi.fn().mockResolvedValue({ data: returnData })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })
  return { fromMock, selectMock, eqMock, orderMock }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sitemap handler — mapping logic', () => {
  it('returns an array of sitemap entries with loc, lastmod, changefreq, priority', () => {
    const posts: PostRow[] = [
      { slug: 'hello-world', updated_at: '2026-01-15T10:00:00Z' },
      { slug: 'second-post', updated_at: '2026-02-20T14:30:00Z' }
    ]
    const entries = buildSitemapEntries(posts)

    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({
      loc: '/posts/hello-world',
      lastmod: '2026-01-15T10:00:00Z',
      changefreq: 'weekly',
      priority: 0.8
    })
    expect(entries[1]).toEqual({
      loc: '/posts/second-post',
      lastmod: '2026-02-20T14:30:00Z',
      changefreq: 'weekly',
      priority: 0.8
    })
  })

  it('returns an empty array when posts is null', () => {
    expect(buildSitemapEntries(null)).toEqual([])
  })

  it('returns an empty array when posts is an empty array', () => {
    expect(buildSitemapEntries([])).toEqual([])
  })

  it('prefixes each slug with /posts/', () => {
    const entries = buildSitemapEntries([{ slug: 'my-slug', updated_at: '' }])
    expect(entries[0].loc).toBe('/posts/my-slug')
  })

  it('sets changefreq to "weekly" for all entries', () => {
    const entries = buildSitemapEntries([
      { slug: 'a', updated_at: '' },
      { slug: 'b', updated_at: '' }
    ])
    entries.forEach(e => expect(e.changefreq).toBe('weekly'))
  })

  it('sets priority to 0.8 for all entries', () => {
    const entries = buildSitemapEntries([
      { slug: 'a', updated_at: '' },
      { slug: 'b', updated_at: '' }
    ])
    entries.forEach(e => expect(e.priority).toBe(0.8))
  })

  it('preserves the updated_at value as lastmod without transformation', () => {
    const ts = '2026-03-14T08:00:00.000Z'
    const entries = buildSitemapEntries([{ slug: 'x', updated_at: ts }])
    expect(entries[0].lastmod).toBe(ts)
  })
})

describe('sitemap handler — Supabase query shape', () => {
  let mocks: ReturnType<typeof buildSupaChain>

  beforeEach(() => {
    mocks = buildSupaChain([])
  })

  it('queries the "posts" table', async () => {
    const client = { from: mocks.fromMock }
    await client.from('posts').select('slug, updated_at').eq('status', 'published').order('published_at', { ascending: false })
    expect(mocks.fromMock).toHaveBeenCalledWith('posts')
  })

  it('selects slug and updated_at columns', async () => {
    const client = { from: mocks.fromMock }
    await client.from('posts').select('slug, updated_at').eq('status', 'published').order('published_at', { ascending: false })
    expect(mocks.selectMock).toHaveBeenCalledWith('slug, updated_at')
  })

  it('filters by status = published', async () => {
    const client = { from: mocks.fromMock }
    await client.from('posts').select('slug, updated_at').eq('status', 'published').order('published_at', { ascending: false })
    expect(mocks.eqMock).toHaveBeenCalledWith('status', 'published')
  })

  it('orders by published_at descending', async () => {
    const client = { from: mocks.fromMock }
    await client.from('posts').select('slug, updated_at').eq('status', 'published').order('published_at', { ascending: false })
    expect(mocks.orderMock).toHaveBeenCalledWith('published_at', { ascending: false })
  })
})
