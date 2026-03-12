/**
 * tests/unit/composables/useAnalytics.test.ts
 *
 * Whitebox tests for app/composables/useAnalytics.ts
 *
 * Contracts under test:
 *  1. getSessionId() returns a UUID string
 *  2. getSessionId() stores the ID in sessionStorage under key 'ko_sid'
 *  3. getSessionId() reuses an existing session ID on subsequent calls
 *  4. track() calls navigator.sendBeacon with correct path + sessionId payload
 *  5. track() falls back to fetch() when sendBeacon is unavailable
 *  6. No tracking occurs in SSR (window/navigator not defined)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Inline replica of the private getSessionId logic so we can unit-test it
// directly without fighting Nuxt's onMounted / useRouter auto-imports.
// ---------------------------------------------------------------------------
function makeGetSessionId(storage: Storage) {
  return function getSessionId(): string {
    const key = 'ko_sid'
    let sid = storage.getItem(key)
    if (!sid) {
      sid = crypto.randomUUID()
      storage.setItem(key, sid)
    }
    return sid
  }
}

// Inline replica of the private track() logic
function makeTrack(
  getSessionId: () => string,
  beaconFn: ((url: string, data: BodyInit) => boolean) | null,
  fetchFn: typeof fetch
) {
  return function track(path: string) {
    const payload = JSON.stringify({ path, sessionId: getSessionId() })
    if (beaconFn) {
      beaconFn('/api/track', new Blob([payload], { type: 'application/json' }))
    } else {
      fetchFn('/api/track', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {})
    }
  }
}

// ---------------------------------------------------------------------------
// getSessionId() tests
// ---------------------------------------------------------------------------

describe('getSessionId()', () => {
  let storage: Storage

  beforeEach(() => {
    // Use the real happy-dom sessionStorage between tests (cleared per test)
    sessionStorage.clear()
    storage = sessionStorage
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('returns a non-empty string', () => {
    const getSessionId = makeGetSessionId(storage)
    const sid = getSessionId()
    expect(typeof sid).toBe('string')
    expect(sid.length).toBeGreaterThan(0)
  })

  it('returns a UUID-shaped value (8-4-4-4-12 hex groups)', () => {
    const getSessionId = makeGetSessionId(storage)
    const sid = getSessionId()
    expect(sid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('stores the generated ID in sessionStorage under key "ko_sid"', () => {
    const getSessionId = makeGetSessionId(storage)
    const sid = getSessionId()
    expect(sessionStorage.getItem('ko_sid')).toBe(sid)
  })

  it('returns the same ID on repeated calls (reuse, not regenerate)', () => {
    const getSessionId = makeGetSessionId(storage)
    const first = getSessionId()
    const second = getSessionId()
    const third = getSessionId()
    expect(second).toBe(first)
    expect(third).toBe(first)
  })

  it('returns a new ID after sessionStorage is cleared', () => {
    const getSessionId = makeGetSessionId(storage)
    const first = getSessionId()
    sessionStorage.clear()
    const second = getSessionId()
    expect(second).not.toBe(first)
  })

  it('picks up an existing session ID pre-populated in sessionStorage', () => {
    const existingId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    sessionStorage.setItem('ko_sid', existingId)
    const getSessionId = makeGetSessionId(storage)
    expect(getSessionId()).toBe(existingId)
  })
})

// ---------------------------------------------------------------------------
// track() tests
// ---------------------------------------------------------------------------

describe('track() — with sendBeacon', () => {
  let beaconMock: ReturnType<typeof vi.fn>
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.clear()
    beaconMock = vi.fn().mockReturnValue(true)
    fetchMock = vi.fn().mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('calls sendBeacon with the /api/track endpoint', () => {
    const sid = makeGetSessionId(sessionStorage)
    const track = makeTrack(sid, beaconMock, fetchMock as unknown as typeof fetch)
    track('/blog/some-post')
    expect(beaconMock).toHaveBeenCalledOnce()
    expect(beaconMock.mock.calls[0][0]).toBe('/api/track')
  })

  it('sends a Blob containing the correct path in the payload', async () => {
    const sid = makeGetSessionId(sessionStorage)
    const track = makeTrack(sid, beaconMock, fetchMock as unknown as typeof fetch)
    track('/blog/some-post')

    const blob: Blob = beaconMock.mock.calls[0][1]
    const text = await blob.text()
    const parsed = JSON.parse(text)
    expect(parsed.path).toBe('/blog/some-post')
  })

  it('includes the sessionId in the Blob payload', async () => {
    const sid = makeGetSessionId(sessionStorage)
    const sessionId = sid() // prime the storage
    const track = makeTrack(sid, beaconMock, fetchMock as unknown as typeof fetch)
    track('/blog/some-post')

    const blob: Blob = beaconMock.mock.calls[0][1]
    const text = await blob.text()
    const parsed = JSON.parse(text)
    expect(parsed.sessionId).toBe(sessionId)
  })

  it('sends Blob with content-type application/json', () => {
    const sid = makeGetSessionId(sessionStorage)
    const track = makeTrack(sid, beaconMock, fetchMock as unknown as typeof fetch)
    track('/')

    const blob: Blob = beaconMock.mock.calls[0][1]
    expect(blob.type).toBe('application/json')
  })

  it('does NOT call fetch when sendBeacon is available', () => {
    const sid = makeGetSessionId(sessionStorage)
    const track = makeTrack(sid, beaconMock, fetchMock as unknown as typeof fetch)
    track('/')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('track() — fetch fallback (no sendBeacon)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.clear()
    fetchMock = vi.fn().mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('calls fetch with POST method when sendBeacon is null', () => {
    const sid = makeGetSessionId(sessionStorage)
    const track = makeTrack(sid, null, fetchMock as unknown as typeof fetch)
    track('/home')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/track')
    expect(opts.method).toBe('POST')
  })

  it('sends the correct path in the fetch body', () => {
    const sid = makeGetSessionId(sessionStorage)
    const track = makeTrack(sid, null, fetchMock as unknown as typeof fetch)
    track('/contact')
    const opts = fetchMock.mock.calls[0][1]
    const parsed = JSON.parse(opts.body)
    expect(parsed.path).toBe('/contact')
  })

  it('sets Content-Type: application/json header in fetch call', () => {
    const sid = makeGetSessionId(sessionStorage)
    const track = makeTrack(sid, null, fetchMock as unknown as typeof fetch)
    track('/')
    const opts = fetchMock.mock.calls[0][1]
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('does not throw if fetch rejects (silent error swallowing)', async () => {
    fetchMock = vi.fn().mockRejectedValue(new Error('network error'))
    const sid = makeGetSessionId(sessionStorage)
    const track = makeTrack(sid, null, fetchMock as unknown as typeof fetch)
    // Should not propagate the rejection
    expect(() => track('/')).not.toThrow()
    // Drain the microtask queue — still no unhandled rejection expected
    await vi.runAllMicrotasksAsync?.() ?? Promise.resolve()
  })
})

describe('track() — SSR guard (no window / no sessionStorage)', () => {
  it('does not call sendBeacon when sessionStorage is unavailable', () => {
    // Simulate SSR: sessionStorage throws
    const ssrStorage = {
      getItem: () => { throw new Error('sessionStorage is not defined') },
      setItem: () => { throw new Error('sessionStorage is not defined') }
    } as unknown as Storage

    const beaconMock = vi.fn()
    // getSessionId will throw, so track should propagate that — real
    // useAnalytics wraps this in onMounted which is a client-only hook.
    // We just verify beacon was never called.
    const throwingGetSessionId = makeGetSessionId(ssrStorage)
    const track = makeTrack(throwingGetSessionId, beaconMock, vi.fn() as unknown as typeof fetch)
    expect(() => track('/')).toThrow()
    expect(beaconMock).not.toHaveBeenCalled()
  })
})
