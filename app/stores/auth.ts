import { defineStore } from 'pinia'
import type { Profile } from '~/types'

// SSR-safe: all useSupabaseClient/useSupabaseUser calls are INSIDE functions,
// never at the store setup root (that causes Pinia SSR crash)
export const useAuthStore = defineStore('auth', () => {
  const profile = ref<Profile | null>(null)
  const loading = ref(false)
  const isAdmin = computed(() => profile.value?.role === 'admin')

  async function fetchProfile(userId: string) {
    const client = useSupabaseClient()
    const { data } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    profile.value = data
  }

  const getOrigin = () => import.meta.client ? window.location.origin : useRequestURL().origin

  async function signInWithGoogle() {
    const client = useSupabaseClient()
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${getOrigin()}/confirm` }
    })
    if (error) throw error
  }

  async function signInWithGitHub() {
    const client = useSupabaseClient()
    const { error } = await client.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${getOrigin()}/confirm` }
    })
    if (error) throw error
  }

  async function signInWithLinkedIn() {
    const client = useSupabaseClient()
    const { error } = await client.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: `${getOrigin()}/confirm` }
    })
    if (error) throw error
  }

  async function signInWithEmail(email: string, password: string) {
    const client = useSupabaseClient()
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const client = useSupabaseClient()
    const { error } = await client.auth.signUp({ email, password })
    if (error) throw error
  }

  async function resendConfirmation(email: string) {
    const client = useSupabaseClient()
    const { error } = await client.auth.resend({ type: 'signup', email })
    if (error) throw error
  }

  async function requestPasswordReset(email: string) {
    const client = useSupabaseClient()
    const redirectTo = `${getOrigin()}/reset-password`
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }

  async function updatePassword(newPassword: string) {
    const client = useSupabaseClient()
    const { error } = await client.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  async function signOut() {
    const client = useSupabaseClient()
    await client.auth.signOut()
    profile.value = null
    await navigateTo('/login')
  }

  return {
    profile,
    loading,
    isAdmin,
    fetchProfile,
    signInWithGoogle,
    signInWithGitHub,
    signInWithLinkedIn,
    signInWithEmail,
    signUp,
    resendConfirmation,
    requestPasswordReset,
    updatePassword,
    signOut
  }
})
