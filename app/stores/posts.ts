import { defineStore } from 'pinia'
import type { Post, PostDraft } from '~/types'

const PAGE_SIZE = 12

const POST_SELECT = `
  id, title, slug, excerpt, cover_image_url, status,
  reading_time_mins, published_at, created_at, updated_at,
  author:profiles(id, username, full_name, avatar_url),
  tags:post_tags(tag:tags(id, name, slug)),
  likes:likes(count)
`

export const usePostsStore = defineStore('posts', () => {
  const posts = ref<Post[]>([])
  const current = ref<Post | null>(null)
  const loading = ref(false)
  const hasMore = ref(true)
  const page = ref(0) // ref so Pinia serializes it on SSR → hydration (keeps "Load more" correct)

  function normalise(raw: Post): Post {
    return {
      ...raw,
      tags: (raw.tags as unknown as { tag: { id: number; name: string; slug: string } }[])
        ?.map(pt => pt.tag) ?? []
    }
  }

  async function fetchFeed(reset = false) {
    if (reset) { posts.value = []; page.value = 0; hasMore.value = true }
    if (!hasMore.value) return
    loading.value = true
    const client = useSupabaseClient()
    const { data } = await client
      .from('posts')
      .select(POST_SELECT)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE - 1)
    loading.value = false
    if (!data?.length) { hasMore.value = false; return }
    posts.value.push(...data.map(normalise))
    if (data.length < PAGE_SIZE) hasMore.value = false
    page.value++
  }

  async function fetchBySlug(slug: string, allowDraft = false) {
    loading.value = true
    const client = useSupabaseClient()
    let query = client
      .from('posts')
      .select(POST_SELECT + ', series:series(id, title, slug), content')
      .eq('slug', slug)
    if (!allowDraft) query = query.eq('status', 'published')
    const { data } = await query.single()
    loading.value = false
    current.value = data ? normalise(data) : null
    return current.value
  }

  async function fetchMyPosts() {
    const client = useSupabaseClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user?.id) return []
    loading.value = true
    const { data } = await client
      .from('posts')
      .select(POST_SELECT + ', content')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
    loading.value = false
    return (data ?? []).map(normalise)
  }

  async function fetchByTag(tagSlug: string, reset = false) {
    if (reset) { posts.value = []; page.value = 0; hasMore.value = true }
    if (!hasMore.value) return
    loading.value = true
    const client = useSupabaseClient()
    const { data } = await client
      .from('posts')
      .select(POST_SELECT + ', post_tags!inner(tag:tags!inner(slug))')
      .eq('status', 'published')
      .eq('post_tags.tag.slug', tagSlug)
      .order('published_at', { ascending: false })
      .range(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE - 1)
    loading.value = false
    if (!data?.length) { hasMore.value = false; return }
    posts.value.push(...data.map(normalise))
    if (data.length < PAGE_SIZE) hasMore.value = false
    page.value++
  }

  async function fetchByAuthor(username: string) {
    loading.value = true
    const client = useSupabaseClient()
    const { data: profile } = await client
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()
    if (!profile) { loading.value = false; return [] }
    const { data } = await client
      .from('posts')
      .select(POST_SELECT)
      .eq('status', 'published')
      .eq('author_id', profile.id)
      .order('published_at', { ascending: false })
    loading.value = false
    return (data ?? []).map(normalise)
  }

  async function searchPosts(query: string) {
    loading.value = true
    const client = useSupabaseClient()
    const { data } = await client
      .from('posts')
      .select(POST_SELECT)
      .eq('status', 'published')
      .textSearch('search_vector', query, { type: 'websearch' })
      .limit(20)
    loading.value = false
    return (data ?? []).map(normalise)
  }

  async function createPost(draft: PostDraft, authorId: string) {
    const client = useSupabaseClient()
    const { tag_ids, ...rest } = draft
    const { data, error } = await client
      .from('posts')
      .insert({ ...rest, author_id: authorId })
      .select('id, slug')
      .single()
    if (error) throw error
    if (tag_ids.length) {
      await client.from('post_tags').insert(
        tag_ids.map(tid => ({ post_id: data.id, tag_id: tid }))
      )
    }
    return data
  }

  async function updatePost(id: string, patch: Partial<PostDraft>) {
    const client = useSupabaseClient()
    const { tag_ids, ...rest } = patch
    if (Object.keys(rest).length) {
      const { error } = await client.from('posts').update(rest).eq('id', id)
      if (error) throw error
    }
    if (tag_ids !== undefined) {
      await client.from('post_tags').delete().eq('post_id', id)
      if (tag_ids.length) {
        await client.from('post_tags').insert(
          tag_ids.map(tid => ({ post_id: id, tag_id: tid }))
        )
      }
    }
  }

  async function deletePost(id: string) {
    const client = useSupabaseClient()
    const { error } = await client.from('posts').delete().eq('id', id)
    if (error) throw error
  }

  async function publishPost(id: string) {
    const client = useSupabaseClient()
    await client.from('posts').update({
      status: 'published',
      published_at: new Date().toISOString()
    }).eq('id', id)
  }

  async function unpublishPost(id: string) {
    const client = useSupabaseClient()
    await client.from('posts').update({
      status: 'draft',
      published_at: null
    }).eq('id', id)
  }

  return {
    posts, current, loading, hasMore,
    fetchFeed, fetchBySlug, fetchMyPosts, fetchByTag,
    fetchByAuthor, searchPosts, createPost, updatePost,
    deletePost, publishPost, unpublishPost
  }
})
