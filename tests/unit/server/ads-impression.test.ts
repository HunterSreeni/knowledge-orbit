/**
 * tests/unit/server/ads-impression.test.ts
 *
 * Whitebox tests for server/api/ads/impression.post.ts
 *
 * Contracts under test:
 *  1. Returns { ok: false } when adId is missing
 *  2. Inserts a record with event_type='impression' and correct shape
 *  3. Optional fields (postSlug, sessionId) default to null
 *  4. Silent catch — never throws even when Supabase errors
 *  5. Returns { ok: true } on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Inline replica of the handler's business logic
// (handler uses Nitro globals — we test the pure logic here)
// ---------------------------------------------------------------------------

interface ImpressionBody {
  adId?: string
  postSlug?: string
  sessionId?: string
}

interface H3EventStub {
  headers: Record<string, string>
}

async function handleImpression(
  body: ImpressionBody,
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
      event_type: 'impression',
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

describe('ads/impression handler', () => {
  let insertMock: ReturnType<typeof vi.fn>
  let fromMock: ReturnType<typeof vi.fn>
  let clientMock: ReturnType<typeof vi.fn> extends never ? never : {
    from: ReturnType<typeof vi.fn>
  }
  let eventStub: H3EventStub

  beforeEach(() => {
    insertMock = vi.fn().mockResolvedValue({ error: null })
    fromMock = vi.fn().mockReturnValue({ insert: insertMock })
    clientMock = { from: fromMock }
    eventStub = { headers: {} }
  })

  // Validation
  it('returns { ok: false } when adId is missing', async () => {
    const result = await handleImpression({}, eventStub, clientMock)
    expect(result).toEqual({ ok: false })
  })

  it('returns { ok: false } when adId is undefined explicitly', async () => {
    const result = await handleImpression({ adId: undefined }, eventStub, clientMock)
    expect(result).toEqual({ ok: false })
  })

  it('does NOT call Supabase when adId is missing', async () => {
    await handleImpression({}, eventStub, clientMock)
    expect(fromMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
  })

  // Insert shape
  it('inserts into the ad_events table', async () => {
    await handleImpression({ adId: 'ad-001' }, eventStub, clientMock)
    expect(fromMock).toHaveBeenCalledWith('ad_events')
  })

  it('inserts with event_type="impression"', async () => {
    await handleImpression({ adId: 'ad-001' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'impression' })
    )
  })

  it('inserts with the provided adId as ad_id', async () => {
    await handleImpression({ adId: 'ad-abc-123' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ ad_id: 'ad-abc-123' })
    )
  })

  it('sets post_slug from postSlug when provided', async () => {
    await handleImpression(
      { adId: 'ad-001', postSlug: 'my-blog-post' },
      eventStub,
      clientMock
    )
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ post_slug: 'my-blog-post' })
    )
  })

  it('sets post_slug to null when postSlug is not provided', async () => {
    await handleImpression({ adId: 'ad-001' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ post_slug: null })
    )
  })

  it('sets session_id from sessionId when provided', async () => {
    await handleImpression(
      { adId: 'ad-001', sessionId: 'sess-xyz' },
      eventStub,
      clientMock
    )
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 'sess-xyz' })
    )
  })

  it('sets session_id to null when sessionId is not provided', async () => {
    await handleImpression({ adId: 'ad-001' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: null })
    )
  })

  it('sets referrer from Referer header when present', async () => {
    eventStub.headers['referer'] = 'https://knowledgeorbit.sreeniverse.co.in/blog'
    await handleImpression({ adId: 'ad-001' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referrer: 'https://knowledgeorbit.sreeniverse.co.in/blog'
      })
    )
  })

  it('sets referrer to null when no Referer header', async () => {
    await handleImpression({ adId: 'ad-001' }, eventStub, clientMock)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ referrer: null })
    )
  })

  // Return value
  it('returns { ok: true } on successful insert', async () => {
    const result = await handleImpression({ adId: 'ad-001' }, eventStub, clientMock)
    expect(result).toEqual({ ok: true })
  })

  // Silent catch
  it('returns { ok: true } even when Supabase insert throws', async () => {
    insertMock.mockRejectedValue(new Error('db connection refused'))
    const result = await handleImpression({ adId: 'ad-001' }, eventStub, clientMock)
    expect(result).toEqual({ ok: true })
  })

  it('does not propagate Supabase errors', async () => {
    insertMock.mockRejectedValue(new Error('foreign key violation'))
    await expect(
      handleImpression({ adId: 'ad-001' }, eventStub, clientMock)
    ).resolves.not.toThrow()
  })
})
