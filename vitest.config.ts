import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'app/composables/**/*.ts',
        'app/middleware/**/*.ts',
        'server/api/**/*.ts'
      ]
    }
  },
  resolve: {
    alias: {
      // Nuxt auto-imports that unit tests need to resolve
      '#app': resolve(__dirname, 'tests/__mocks__/nuxt-app.ts'),
      '#supabase/server': resolve(__dirname, 'tests/__mocks__/supabase-server.ts'),
      '~': resolve(__dirname, 'app'),
      '@': resolve(__dirname, 'app')
    }
  }
})
