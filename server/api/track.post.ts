import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const { post_id, path, sessionId } = body as {
    post_id?: string
    path?: string
    sessionId?: string
  }

  if (!path) return { ok: false }

  const ua = getHeader(event, 'user-agent') || ''
  const referrer = getHeader(event, 'referer') || ''
  const country = getHeader(event, 'cf-ipcountry') || null

  const device = /mobile/i.test(ua) ? 'mobile'
    : /tablet|ipad/i.test(ua) ? 'tablet'
    : 'desktop'

  let referrerSource = 'direct'
  if (referrer) {
    if (/google\./i.test(referrer)) referrerSource = 'google'
    else if (/twitter\.com|\/\/t\.co\//i.test(referrer)) referrerSource = 'twitter'
    else if (/linkedin\.com/i.test(referrer)) referrerSource = 'linkedin'
    else if (/reddit\.com/i.test(referrer)) referrerSource = 'reddit'
    else if (/facebook\.com/i.test(referrer)) referrerSource = 'facebook'
    else referrerSource = 'other'
  }

  try {
    const client = await serverSupabaseClient(event)
    await client.from('page_views').insert({
      post_id: post_id || null,
      path,
      referrer: referrer || null,
      referrer_source: referrerSource,
      device_type: device,
      session_id: sessionId || null,
      country
    })
  } catch {
    // Silent — never block page render for a failed view ping
  }

  return { ok: true }
})
