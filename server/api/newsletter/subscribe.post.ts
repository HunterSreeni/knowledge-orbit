import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { email } = await readBody(event)
  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, message: 'Invalid email' })
  }

  const client = await serverSupabaseClient(event)
  const { error } = await client
    .from('newsletter_subscribers')
    .insert({ email })

  // 23505 = unique_violation (already subscribed) — treat as success
  if (error && error.code !== '23505') {
    console.error('Newsletter subscribe error:', error)
    throw createError({ statusCode: 500, message: 'Subscription failed' })
  }

  return { ok: true }
})
