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
      event_type: 'click',
      post_slug: postSlug || null,
      session_id: sessionId || null,
      referrer: getHeader(event, 'referer') || null
    })
  } catch {
    // Silent
  }

  return { ok: true }
})
