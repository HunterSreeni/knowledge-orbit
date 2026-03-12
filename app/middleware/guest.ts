// Redirects already-authenticated users away from guest-only pages (e.g. /login)
export default defineNuxtRouteMiddleware(async () => {
  const client = useSupabaseClient()
  const { data: { user } } = await client.auth.getUser()
  if (user) return navigateTo('/')
})
