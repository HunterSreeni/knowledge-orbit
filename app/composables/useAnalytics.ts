export function useAnalytics() {
  const router = useRouter()

  const getSessionId = (): string => {
    if (!import.meta.client) return ''
    const key = 'ko_sid'
    let sid = sessionStorage.getItem(key)
    if (!sid) {
      sid = crypto.randomUUID()
      sessionStorage.setItem(key, sid)
    }
    return sid
  }

  const track = (path: string) => {
    if (!import.meta.client) return
    const payload = JSON.stringify({ path, sessionId: getSessionId() })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/track', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {})
    }
  }

  let removeAfterEach: (() => void) | null = null

  onMounted(() => {
    track(router.currentRoute.value.path)
    removeAfterEach = router.afterEach((to) => track(to.path))
  })

  onUnmounted(() => {
    if (removeAfterEach) removeAfterEach()
  })
}
