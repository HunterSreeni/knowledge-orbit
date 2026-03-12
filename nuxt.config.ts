// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxtjs/seo'
  ],

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-07-15',

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://knowledgeorbit.sreeniverse.co.in',
    name: 'Knowledge Orbit',
    description: 'Diverse perspectives on anime, AI/LLM, security, and more.',
    defaultLocale: 'en'
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false,
    cookieOptions: {
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  },

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://knowledgeorbit.sreeniverse.co.in',
      siteName: 'Knowledge Orbit'
    }
  },

  routeRules: {
    // Home feed: SSR, short CDN cache (60 s) so new posts appear quickly
    '/': { headers: { 'cache-control': 's-maxage=60, stale-while-revalidate=300' } },
    // Post pages: SSR, CDN caches for 5 min, serves stale for up to 1 hour while revalidating
    '/posts/**': { headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=3600' } },
    // Tag / user / series pages: same as posts
    '/tags/**': { headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=3600' } },
    '/u/**': { headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=3600' } },
    // Auth pages: never cache
    '/login': { headers: { 'cache-control': 'no-store' } },
    '/reset-password': { headers: { 'cache-control': 'no-store' } },
    '/confirm': { headers: { 'cache-control': 'no-store' } },
    // Dashboard / write / edit: private, never cache
    '/dashboard': { headers: { 'cache-control': 'private, no-store' } },
    '/write': { headers: { 'cache-control': 'private, no-store' } },
    '/edit/**': { headers: { 'cache-control': 'private, no-store' } },
    // Admin: private
    '/admin/**': { headers: { 'cache-control': 'private, no-store' } },
    // Static info pages: cache aggressively
    '/become-a-writer': { headers: { 'cache-control': 's-maxage=3600, stale-while-revalidate=86400' } }
  },

  nitro: {
    preset: 'netlify',
    compressPublicAssets: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
