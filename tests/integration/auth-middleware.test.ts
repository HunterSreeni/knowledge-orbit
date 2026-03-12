/**
 * tests/integration/auth-middleware.test.ts
 *
 * Integration-style unit tests for the three route middleware files:
 *   - app/middleware/auth.ts          (protect authenticated-only routes)
 *   - app/middleware/guest.ts         (block logged-in users from guest pages)
 *   - app/middleware/admin.ts         (restrict admin-only pages)
 *   - app/middleware/auth-error.global.ts (redirect Supabase error query params)
 *
 * NOTE: @nuxt/test-utils requires a running Nuxt server and Playwright,
 * which cannot be spun up in a plain vitest run without `@nuxt/test-utils`
 * + happy-dom environment. These tests exercise the middleware *logic*
 * directly by calling the factory functions with mock route/user state,
 * which is the whitebox contract we care about.
 *
 * Each middleware is loaded as a plain TS module. Nuxt auto-import globals
 * (useSupabaseUser, useSupabaseClient, navigateTo, defineNuxtRouteMiddleware)
 * are provided by tests/setup.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Helper: build a minimal RouteLocation stub
// ---------------------------------------------------------------------------
function makeRoute(path: string, query: Record<string, string> = {}) {
  return { path, query, fullPath: path, name: path }
}

// ---------------------------------------------------------------------------
// auth middleware
// ---------------------------------------------------------------------------

describe('auth middleware — unauthenticated users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as Record<string, unknown>).navigateTo = vi.fn((path: string) => path)
  })

  it('redirects to /login when user is null', async () => {
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => ({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
    }))
    const { default: authMiddleware } = await import('../../app/middleware/auth.ts')
    await authMiddleware(makeRoute('/write'), makeRoute('/login'))
    expect((globalThis.navigateTo as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('/login')
  })

  it('redirects to /login when accessing /write unauthenticated', async () => {
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => ({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
    }))
    const { default: authMiddleware } = await import('../../app/middleware/auth.ts')
    const result = await authMiddleware(makeRoute('/write'), makeRoute('/'))
    expect(result).toBe('/login')
  })

  it('redirects to /login when accessing /admin unauthenticated', async () => {
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => ({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
    }))
    const { default: authMiddleware } = await import('../../app/middleware/auth.ts')
    const result = await authMiddleware(makeRoute('/admin'), makeRoute('/'))
    expect(result).toBe('/login')
  })

  it('does not redirect when user IS authenticated', async () => {
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => ({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) }
    }))
    ;(globalThis as Record<string, unknown>).navigateTo = vi.fn()
    const { default: authMiddleware } = await import('../../app/middleware/auth.ts')
    const result = await authMiddleware(makeRoute('/write'), makeRoute('/'))
    expect(globalThis.navigateTo as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// guest middleware
// ---------------------------------------------------------------------------

describe('guest middleware — authenticated users on guest pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as Record<string, unknown>).navigateTo = vi.fn((path: string) => path)
  })

  it('redirects authenticated user away from /login to /', async () => {
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => ({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) }
    }))
    const { default: guestMiddleware } = await import('../../app/middleware/guest.ts')
    const result = await guestMiddleware(makeRoute('/login'), makeRoute('/'))
    expect(result).toBe('/')
  })

  it('calls navigateTo("/") when authenticated user hits a guest-only route', async () => {
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => ({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) }
    }))
    const { default: guestMiddleware } = await import('../../app/middleware/guest.ts')
    await guestMiddleware(makeRoute('/login'), makeRoute('/'))
    expect(globalThis.navigateTo as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('/')
  })

  it('allows unauthenticated user through (no redirect)', async () => {
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => ({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
    }))
    ;(globalThis as Record<string, unknown>).navigateTo = vi.fn()
    const { default: guestMiddleware } = await import('../../app/middleware/guest.ts')
    const result = await guestMiddleware(makeRoute('/login'), makeRoute('/'))
    expect(globalThis.navigateTo as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// admin middleware
// ---------------------------------------------------------------------------

describe('admin middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as Record<string, unknown>).navigateTo = vi.fn((path: string) => path)
  })

  function makeClientMock(userId: string | null, role?: string) {
    const getUserMock = vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } })
    const singleMock = vi.fn().mockResolvedValue({ data: role ? { role } : null })
    const eqMock = vi.fn().mockReturnValue({ single: singleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })
    return { auth: { getUser: getUserMock }, from: fromMock, _mocks: { fromMock, selectMock, eqMock, singleMock } }
  }

  it('redirects unauthenticated user to /login', async () => {
    const client = makeClientMock(null)
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => client)
    const { default: adminMiddleware } = await import('../../app/middleware/admin.ts')
    const result = await adminMiddleware(makeRoute('/admin'), makeRoute('/'))
    expect(result).toBe('/login')
  })

  it('redirects non-admin user to / when role is "member"', async () => {
    const client = makeClientMock('member-user-id', 'member')
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => client)
    const { default: adminMiddleware } = await import('../../app/middleware/admin.ts')
    const result = await adminMiddleware(makeRoute('/admin'), makeRoute('/'))
    expect(result).toBe('/')
  })

  it('allows admin user through without redirecting', async () => {
    ;(globalThis as Record<string, unknown>).navigateTo = vi.fn()
    const client = makeClientMock('admin-user-id', 'admin')
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => client)
    const { default: adminMiddleware } = await import('../../app/middleware/admin.ts')
    const result = await adminMiddleware(makeRoute('/admin'), makeRoute('/'))
    const nav = globalThis.navigateTo as ReturnType<typeof vi.fn>
    const callsToRoot = nav.mock.calls.filter((c) => c[0] === '/')
    expect(callsToRoot).toHaveLength(0)
    expect(result).toBeUndefined()
  })

  it('queries the profiles table with the authenticated user id', async () => {
    const userId = 'query-test-id'
    const client = makeClientMock(userId, 'admin')
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => client)
    const { default: adminMiddleware } = await import('../../app/middleware/admin.ts')
    await adminMiddleware(makeRoute('/admin'), makeRoute('/'))
    expect(client._mocks.fromMock).toHaveBeenCalledWith('profiles')
    expect(client._mocks.selectMock).toHaveBeenCalledWith('role')
    expect(client._mocks.eqMock).toHaveBeenCalledWith('id', userId)
  })

  it('redirects to / when profiles returns null data', async () => {
    const client = makeClientMock('some-id', undefined)
    ;(globalThis as Record<string, unknown>).useSupabaseClient = vi.fn(() => client)
    const { default: adminMiddleware } = await import('../../app/middleware/admin.ts')
    const result = await adminMiddleware(makeRoute('/admin'), makeRoute('/'))
    expect(result).toBe('/')
  })
})

// ---------------------------------------------------------------------------
// auth-error.global middleware
// ---------------------------------------------------------------------------

describe('auth-error.global middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as Record<string, unknown>).navigateTo = vi.fn((path: string) => path)
  })

  it('does nothing when no error_code query param is present', async () => {
    const { default: authErrorMiddleware } = await import(
      '../../app/middleware/auth-error.global.ts'
    )
    const result = authErrorMiddleware(makeRoute('/some-page', {}), makeRoute('/'))
    expect(globalThis.navigateTo as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('redirects to /login?auth_error=link_expired for error_code=otp_expired', async () => {
    const { default: authErrorMiddleware } = await import(
      '../../app/middleware/auth-error.global.ts'
    )
    const result = authErrorMiddleware(
      makeRoute('/confirm', { error_code: 'otp_expired' }),
      makeRoute('/')
    )
    expect(result).toBe('/login?auth_error=link_expired')
  })

  it('redirects to /login?auth_error=access_denied for error_code=access_denied', async () => {
    const { default: authErrorMiddleware } = await import(
      '../../app/middleware/auth-error.global.ts'
    )
    const result = authErrorMiddleware(
      makeRoute('/confirm', { error_code: 'access_denied' }),
      makeRoute('/')
    )
    expect(result).toBe('/login?auth_error=access_denied')
  })

  it('does nothing for an unrecognised error_code', async () => {
    const { default: authErrorMiddleware } = await import(
      '../../app/middleware/auth-error.global.ts'
    )
    const result = authErrorMiddleware(
      makeRoute('/confirm', { error_code: 'unknown_error' }),
      makeRoute('/')
    )
    // Not a known code — middleware returns undefined (no redirect)
    expect(result).toBeUndefined()
    expect(globalThis.navigateTo as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
  })
})
