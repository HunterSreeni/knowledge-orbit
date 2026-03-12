// Catches Supabase auth error redirects (e.g. expired confirmation links)
// that land on any page with ?error_code= in the URL, and redirects to /login
// with a friendly query param so the user sees a helpful message.
export default defineNuxtRouteMiddleware((to) => {
  const errorCode = to.query.error_code as string | undefined
  if (!errorCode) return

  if (errorCode === 'otp_expired') {
    return navigateTo('/login?auth_error=link_expired')
  }
  if (errorCode === 'access_denied') {
    return navigateTo('/login?auth_error=access_denied')
  }
})
