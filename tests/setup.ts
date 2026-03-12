import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Nuxt auto-import globals — make them available in every test file so
// composables / middleware that call e.g. ref(), computed(), navigateTo()
// don't throw ReferenceError.
// ---------------------------------------------------------------------------
import {
  ref,
  computed,
  onMounted,
  watch
} from 'vue'

Object.assign(globalThis, {
  ref,
  computed,
  onMounted,
  watch,
  // navigateTo stub — tests that care about navigation replace this per-test
  navigateTo: vi.fn((path: string) => path),
  // defineNuxtRouteMiddleware: just call the factory and return the fn
  defineNuxtRouteMiddleware: (fn: (...args: unknown[]) => unknown) => fn,
  // useSupabaseClient / useSupabaseUser stubs — overridden per-test
  useSupabaseClient: vi.fn(),
  useSupabaseUser: vi.fn(),
  useRouter: vi.fn(),
})
