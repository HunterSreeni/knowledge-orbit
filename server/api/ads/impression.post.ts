import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const { adId, postSlug, sessionId } = body as {
    adId?: string
    postSlug?: string
    sessionId?: string
  }

  if (!adId) return { ok: false }

  try {
    const client = await serverSupabaseClient(event)
    await client.from('ad_events').insert({
      ad_id: adId,
      event_type: 'impression',
      post_slug: postSlug || null,
      session_id: sessionId || null,
      referrer: getHeader(event, 'referer') || null
    })
  } catch {
    // Silent — never block rendering for a failed impression ping
  }

  return { ok: true }
})
