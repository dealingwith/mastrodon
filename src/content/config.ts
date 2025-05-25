import { defineCollection, z } from 'astro:content';

const mastodonPost = z.object({
  id: z.string(),
  created_at: z.string(),
  content: z.string(),
  url: z.string().optional(),
  visibility: z.string(),
  sensitive: z.boolean(),
  spoiler_text: z.string().optional(),
  media_attachments: z.array(z.object({
    id: z.string(),
    type: z.enum(['image', 'video', 'audio', 'unknown']),
    url: z.string(),
    preview_url: z.string(),
    description: z.string().optional()
  })).optional(),
  account: z.object({
    id: z.string(),
    username: z.string(),
    display_name: z.string(),
    avatar: z.string(),
    url: z.string()
  }),
  replies_count: z.number(),
  reblogs_count: z.number(),
  favourites_count: z.number(),
  reblog: z.any().optional()
});

export const collections = {
  posts: defineCollection({
    type: 'data',
    schema: z.array(mastodonPost)
  })
};