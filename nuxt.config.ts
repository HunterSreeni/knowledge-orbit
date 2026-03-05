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

  // Site config used by @nuxtjs/seo
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://knowledgeorbit.sreeniverse.co.in',
    name: 'Knowledge Orbit',
    description: 'Diverse perspectives on anime, AI/LLM, security, and more.',
    defaultLocale: 'en'
  },

  // @nuxtjs/supabase config
  supabase: {
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

  // SSR on, but prerender home page
  routeRules: {
    '/': { prerender: false }
  },

  // Netlify SSR preset
  nitro: {
    preset: 'netlify'
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
