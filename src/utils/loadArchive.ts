import type { MastodonArchive, MastodonPost } from "../types/mastodon";
import { findImageFile } from "./imageUtils";

export async function loadMastodonArchive(): Promise<MastodonPost[]> {
  try {
    // Try to load from public/outbox.json
    const response = await fetch("/outbox.json");

    if (!response.ok) {
      console.log("No outbox.json found in public folder");
      return [];
    }

    const data = await response.json();

    // Handle different possible archive formats
    let posts: MastodonPost[] = [];

    if (data.orderedItems) {
      // ActivityPub format
      posts = data.orderedItems
        .filter(
          (item: any) =>
            item.type === "Create" && item.object && item.object.type === "Note"
        )
        .filter((item: any) => {
          // Skip posts that weren't public (empty cc field)
          const cc = item.cc || item.object?.cc;
          return cc && Array.isArray(cc) && cc.length > 0;
        })
        .map((item: any) => transformToMastodonPost(item.object));
    } else if (Array.isArray(data)) {
      // Direct array of posts
      posts = data
        .filter((item: any) => {
          // Skip posts that weren't public (empty cc field)
          const cc = item.cc;
          return cc && Array.isArray(cc) && cc.length > 0;
        })
        .map(transformToMastodonPost);
    } else if (data.posts) {
      // Posts in a 'posts' property
      posts = data.posts
        .filter((item: any) => {
          // Skip posts that weren't public (empty cc field)
          const cc = item.cc;
          return cc && Array.isArray(cc) && cc.length > 0;
        })
        .map(transformToMastodonPost);
    }

    // Sort by date (newest first)
    return posts.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error("Error loading Mastodon archive:", error);
    return [];
  }
}

function transformToMastodonPost(item: any): MastodonPost {
  return {
    id: item.id || Math.random().toString(),
    created_at: item.published || item.created_at || new Date().toISOString(),
    content: item.content || item.summary || "",
    url: item.url || item.id,
    visibility: item.visibility || "public",
    sensitive: item.sensitive || false,
    spoiler_text: item.spoiler_text || item.summary || "",
    media_attachments:
      item.attachment?.map((att: any) => ({
        id: att.id || Math.random().toString(),
        type: att.mediaType?.includes("image")
          ? "image"
          : att.mediaType?.includes("video")
          ? "video"
          : att.mediaType?.includes("audio")
          ? "audio"
          : "unknown",
        url: att.url || att.href,
        preview_url: att.url || att.href,
        description: att.name || att.summary,
      })) || [],
    account: {
      id: item.attributedTo || "unknown",
      username: extractUsername(item.attributedTo) || "user",
      display_name:
        item.actor?.name || extractUsername(item.attributedTo) || "User",
      avatar: item.actor?.icon?.url || findImageFile("avatar"),
      url: item.attributedTo || "",
    },
    replies_count: item.replies?.totalItems || 0,
    reblogs_count: item.shares?.totalItems || 0,
    favourites_count: item.likes?.totalItems || 0,
  };
}

function extractUsername(url: string): string {
  if (!url) return "user";
  const parts = url.split("/");
  return parts[parts.length - 1] || "user";
}
