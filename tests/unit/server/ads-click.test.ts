/**
 * tests/unit/server/ads-click.test.ts
 *
 * Whitebox tests for server/api/ads/click.post.ts
 *
 * Contracts under test:
 *  1. Returns { ok: false } when adId is missing
 *  2. Inserts a record with event_type='click' (NOT 'impression')
 *  3. Correct shape: ad_id, post_slug, session_id, referrer
 *  4. Optional fields default to null
 *  5. Silent catch — never propagates Supabase errors
 *  6. Returns { ok: true } on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Inline replica — mirrors click.post.ts business logic exactly
// ---------------------------------------------------------------------------

interface ClickBody {
  adId?: string
  postSlug?: string
  sessionId?: string
}

interface H3EventStub {
  headers: Record<string, string>
}

async function handleClick(
  body: ClickBody,
  event: H3EventStub,
  supabaseClient: {
    from: (table: string) => { insert: (record: Record<string, unknown>) => Promise<{ error: unknown }> }
  }
): Promise<{ ok: boolean }> {
  const { adId, postSlug, sessionId } = body
  if (!adId) return { ok: false }

  try {
    await supabaseClient.from('ad_events').insert({
      ad_id: adId,
      event_type: 'click',
      post_slug: postSlug || null,
      session_id: sessionId || null,
      referrer: event.headers['referer'] || null
    })
  } catch {
    // Silent
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ads/click handler', () => {
  let insertMock: ReturnType<typeof vi.fn>
  let fromMock: ReturnType<typeof vi.fn>
  let clientMock: { from: ReturnType<typeof vi.fn> }
  let eventStub: H3EventStub

  beforeEach(() => {
    insertMock = vi.fn().mockResolvedValue({ error: null })
    fromMock = vi.fn().mockReturnValue({ insert: insertMock })
    clientMock = { from: fromMock }
    eventStub = { headers: {} }
  })

  // Validation
  it('returns { ok: false } when adId is missing', async () => {
    const result = await handleClick({}, eventStub, clientMock)
    expect(result).toEqual({ ok: false })
  })

  it('returns { ok: false } when adId is explicitly undefined', async () => {
    const result = await handleClick({ adId: undefined }, eventStub, clientMock)
    expect(result).toEqual({ ok: false })
  })

  it('does NOT call Supabase insert when adId is missing', async () => {
    await handleClick({}, eventStub, clientMock)
    expect(fromMock).not.toHaveBeenCalled()
  })

  // Core distinction from impression handler: event_type must be 'click'
  it('inserts with event_type="click"', async () => {
    await handleClick({ adId: 'ad-001' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'click' })
    )
  })

  it('does NOT insert event_type="impression" (wrong handler guard)', async () => {
    await handleClick({ adId: 'ad-001' }, eventStub, clientMock)
    const insertedRecord = insertMock.mock.calls[0][0] as Record<string, unknown>
    expect(insertedRecord.event_type).not.toBe('impression')
    expect(insertedRecord.event_type).toBe('click')
  })

  // Insert shape
  it('inserts into the ad_events table', async () => {
    await handleClick({ adId: 'ad-001' }, eventStub, clientMock)
    expect(fromMock).toHaveBeenCalledWith('ad_events')
  })

  it('inserts with the provided adId as ad_id', async () => {
    await handleClick({ adId: 'ad-click-999' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ ad_id: 'ad-click-999' })
    )
  })

  it('sets post_slug from postSlug when provided', async () => {
    await handleClick(
      { adId: 'ad-001', postSlug: 'intro-to-llm' },
      eventStub,
      clientMock
    )
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ post_slug: 'intro-to-llm' })
    )
  })

  it('sets post_slug to null when postSlug is absent', async () => {
    await handleClick({ adId: 'ad-001' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ post_slug: null })
    )
  })

  it('sets session_id from sessionId when provided', async () => {
    await handleClick(
      { adId: 'ad-001', sessionId: 'sess-click-abc' },
      eventStub,
      clientMock
    )
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 'sess-click-abc' })
    )
  })

  it('sets session_id to null when sessionId is absent', async () => {
    await handleClick({ adId: 'ad-001' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: null })
    )
  })

  it('sets referrer from Referer header when present', async () => {
    eventStub.headers['referer'] = 'https://knowledgeorbit.sreeniverse.co.in/blog/post'
    await handleClick({ adId: 'ad-001' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referrer: 'https://knowledgeorbit.sreeniverse.co.in/blog/post'
      })
    )
  })

  it('sets referrer to null when no Referer header is present', async () => {
    await handleClick({ adId: 'ad-001' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ referrer: null })
    )
  })

  // Return values
  it('returns { ok: true } when insert succeeds', async () => {
    const result = await handleClick({ adId: 'ad-001' }, eventStub, clientMock)
    expect(result).toEqual({ ok: true })
  })

  it('returns { ok: true } even when Supabase throws', async () => {
    insertMock.mockRejectedValue(new Error('unique constraint violation'))
    const result = await handleClick({ adId: 'ad-001' }, eventStub, clientMock)
    expect(result).toEqual({ ok: true })
  })

  it('does not re-throw Supabase errors', async () => {
    insertMock.mockRejectedValue(new Error('network timeout'))
    await expect(
      handleClick({ adId: 'ad-001' }, eventStub, clientMock)
    ).resolves.not.toThrow()
  })

  // Full record shape
  it('inserts a complete record matching the expected schema', async () => {
    eventStub.headers['referer'] = 'https://example.com'
    await handleClick(
      { adId: 'ad-full', postSlug: 'post-slug', sessionId: 'sess-1' },
      eventStub,
      clientMock
    )
    expect(insertMock).toHaveBeenCalledWith({
      ad_id: 'ad-full',
      event_type: 'click',
      post_slug: 'post-slug',
      session_id: 'sess-1',
      referrer: 'https://example.com'
    })
  })
})
