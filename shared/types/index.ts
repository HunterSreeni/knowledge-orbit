export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  role: 'member' | 'admin'
  created_at: string
}

export interface Tag {
  id: number
  name: string
  slug: string
}

export interface Series {
  id: string
  author_id: string
  title: string
  description: string | null
  slug: string
  created_at: string
}

export interface Post {
  id: string
  author_id: string
  series_id: string | null
  title: string
  slug: string
  content: Record<string, unknown> | null
  cover_image_url: string | null
  excerpt: string | null
  status: 'draft' | 'published'
  reading_time_mins: number
  published_at: string | null
  created_at: string
  updated_at: string
  // Joined
  author?: Profile
  tags?: Tag[]
  series?: Series | null
  likes?: { count: number }[]
}

export interface PostDraft {
  title: string
  slug: string
  content: Record<string, unknown> | null
  cover_image_url: string | null
  excerpt: string
  series_id: string | null
  reading_time_mins: number
  tag_ids: number[]
}
