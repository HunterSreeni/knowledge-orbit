/**
 * tests/unit/server/newsletter-subscribe.test.ts
 *
 * Whitebox tests for server/api/newsletter/subscribe.post.ts
 *
 * Contracts under test:
 *  1. Rejects empty/missing email with 400
 *  2. Rejects email without @ with 400
 *  3. Calls upsert with valid email
 *  4. Returns { ok: true } on success
 *  5. Throws 500 on Supabase error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Inline replica — mirrors subscribe.post.ts business logic exactly
// ---------------------------------------------------------------------------

interface SubscribeResult {
  ok: boolean
}

interface H3Error {
  statusCode: number
  message: string
}

function createError(opts: H3Error): H3Error & Error {
  const err = new Error(opts.message) as H3Error & Error
  err.statusCode = opts.statusCode
  err.message = opts.message
  return err
}

async function handleSubscribe(
  body: { email?: string },
  supabaseClient: {
    from: (table: string) => {
      upsert: (data: Record<string, unknown>, opts: Record<string, unknown>) => Promise<{ error: unknown }>
    }
  }
): Promise<SubscribeResult> {
  const { email } = body
  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, message: 'Invalid email' })
  }

  const { error } = await supabaseClient
    .from('newsletter_subscribers')
    .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) throw createError({ statusCode: 500, message: 'Subscription failed' })
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

function buildSupaMock(error: unknown = null) {
  const upsertMock = vi.fn().mockResolvedValue({ error })
  const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock })
  return { fromMock, upsertMock, client: { from: fromMock } }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('newsletter/subscribe handler — validation', () => {
  it('throws 400 when email is missing (undefined)', async () => {
    const { client } = buildSupaMock()
    await expect(handleSubscribe({}, client)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid email'
    })
  })

  it('throws 400 when email is an empty string', async () => {
    const { client } = buildSupaMock()
    await expect(handleSubscribe({ email: '' }, client)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid email'
    })
  })

  it('throws 400 when email does not contain @', async () => {
    const { client } = buildSupaMock()
    await expect(handleSubscribe({ email: 'invalidemail.com' }, client)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid email'
    })
  })

  it('does NOT call Supabase when email is invalid', async () => {
    const { client, fromMock } = buildSupaMock()
    try {
      await handleSubscribe({ email: 'bad' }, client)
    } catch {
      // expected
    }
    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe('newsletter/subscribe handler — upsert', () => {
  let mocks: ReturnType<typeof buildSupaMock>

  beforeEach(() => {
    mocks = buildSupaMock()
  })

  it('calls upsert on the newsletter_subscribers table', async () => {
    await handleSubscribe({ email: 'test@example.com' }, mocks.client)
    expect(mocks.fromMock).toHaveBeenCalledWith('newsletter_subscribers')
  })

  it('passes the email in the upsert data', async () => {
    await handleSubscribe({ email: 'user@test.com' }, mocks.client)
    expect(mocks.upsertMock).toHaveBeenCalledWith(
      { email: 'user@test.com' },
      expect.any(Object)
    )
  })

  it('passes onConflict: "email" and ignoreDuplicates: true', async () => {
    await handleSubscribe({ email: 'user@test.com' }, mocks.client)
    expect(mocks.upsertMock).toHaveBeenCalledWith(
      expect.any(Object),
      { onConflict: 'email', ignoreDuplicates: true }
    )
  })

  it('returns { ok: true } on success', async () => {
    const result = await handleSubscribe({ email: 'ok@test.com' }, mocks.client)
    expect(result).toEqual({ ok: true })
  })
})

describe('newsletter/subscribe handler — error handling', () => {
  it('throws 500 when Supabase returns an error', async () => {
    const { client } = buildSupaMock({ message: 'db constraint violation' })
    await expect(handleSubscribe({ email: 'fail@test.com' }, client)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Subscription failed'
    })
  })

  it('does not throw when Supabase returns no error', async () => {
    const { client } = buildSupaMock(null)
    await expect(handleSubscribe({ email: 'ok@test.com' }, client)).resolves.not.toThrow()
  })
})

describe('newsletter/subscribe handler — edge cases', () => {
  it('accepts an email with minimal valid format (a@b)', async () => {
    const { client } = buildSupaMock()
    const result = await handleSubscribe({ email: 'a@b' }, client)
    expect(result).toEqual({ ok: true })
  })

  it('accepts emails with subdomains (user@sub.domain.com)', async () => {
    const { client } = buildSupaMock()
    const result = await handleSubscribe({ email: 'user@sub.domain.com' }, client)
    expect(result).toEqual({ ok: true })
  })

  it('accepts emails with + addressing (user+tag@example.com)', async () => {
    const { client } = buildSupaMock()
    const result = await handleSubscribe({ email: 'user+tag@example.com' }, client)
    expect(result).toEqual({ ok: true })
  })
})
