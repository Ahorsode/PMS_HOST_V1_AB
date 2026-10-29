import { MetadataRoute } from 'next'

// Public pages only. Keep this static: it used to build a Supabase client at
// import time and query a non-existent `posts` table, which failed builds
// without Supabase env vars and listed pages that 404 (OPS-02).
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://poultryledger.com').replace(/\/$/, '')

  return [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/signup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/login`, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
