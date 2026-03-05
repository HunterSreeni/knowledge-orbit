import { defineStore } from 'pinia'
import type { Profile } from '~/types'

export const useAuthStore = defineStore('auth', () => {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const profile = ref<Profile | null>(null)
  const loading = ref(false)

  const isAuthed = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')

  async function fetchProfile() {
    if (!user.value) return
    const { data } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()
    profile.value = data
  }

  async function signInWithGoogle() {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/confirm` }
    })
    if (error) throw error
  }

  async function signInWithGitHub() {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/confirm` }
    })
    if (error) throw error
  }

  async function signInWithLinkedIn() {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: `${window.location.origin}/confirm` }
    })
    if (error) throw error
  }

  async function signInWithEmail(email: string, password: string) {
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    await fetchProfile()
  }

  async function signUp(email: string, password: string) {
    const { error } = await client.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await client.auth.signOut()
    profile.value = null
  }

  // Watch for user changes
  watch(user, (u) => {
    if (u) fetchProfile()
    else profile.value = null
  }, { immediate: true })

  return {
    profile,
    loading,
    isAuthed,
    isAdmin,
    fetchProfile,
    signInWithGoogle,
    signInWithGitHub,
    signInWithLinkedIn,
    signInWithEmail,
    signUp,
    signOut
  }
})
