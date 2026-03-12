export default defineNuxtRouteMiddleware(async () => {
  const client = useSupabaseClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return navigateTo('/login')

  const { data } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (data?.role !== 'admin') return navigateTo('/')
})
