import type { MastodonPost } from "../types/mastodon";
import { findImageFile } from "./imageUtils";

export function filterOutRepliesToOthers(posts: MastodonPost[]): MastodonPost[] {
  const currentUserUrl = posts.length > 0 ? posts[0].account?.url : null;

  return posts.filter((post) => {
    const inReplyTo = (post as any).inReplyTo;
    const cc = (post as any).cc;

    if (!inReplyTo) {
      return true;
    }

    const hasOtherUsersInCC =
      cc &&
      Array.isArray(cc) &&
      cc.some((ccItem: string) => {
        if (
          ccItem === "https://www.w3.org/ns/activitystreams#Public" ||
          !ccItem.includes("/users/")
        ) {
          return false;
        }

        if (currentUserUrl && ccItem === currentUserUrl) {
          return false;
        }

        return true;
      });

    if (inReplyTo && hasOtherUsersInCC) {
      return false;
    }

    return true;
  });
}

export async function loadMastodonArchive(): Promise<MastodonPost[]> {
  let posts: MastodonPost[] = [];

  try {
    const archiveData = await import("../../data/outbox.json");
    const data = archiveData.default;

    if (data.orderedItems) {
      posts = data.orderedItems
        .filter(
          (item: any) =>
            item.type === "Create" && item.object && item.object.type === "Note",
        )
        .filter((item: any) => {
          const cc = item.cc || item.object?.cc;
          return cc && Array.isArray(cc) && cc.length > 0;
        })
        .map((item: any) => {
          const obj = item.object;
          const idMatch = obj.id?.match(/\/statuses\/(\d+)$/);
          const numericId = idMatch ? idMatch[1] : obj.id;

          return {
            id: numericId || Math.random().toString(),
            created_at: obj.published || new Date().toISOString(),
            content: obj.content || "",
            url: obj.url || obj.id,
            visibility: "public",
            sensitive: obj.sensitive || false,
            spoiler_text: obj.summary || "",
            inReplyTo: obj.inReplyTo,
            cc: item.cc,
            media_attachments:
              obj.attachment?.map((att: any) => ({
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
              id: obj.attributedTo || "unknown",
              username: obj.attributedTo?.split("/").pop() || "user",
              display_name: obj.attributedTo?.split("/").pop() || "User",
              avatar: findImageFile("avatar"),
              url: obj.attributedTo || "",
            },
            replies_count: obj.replies?.totalItems || 0,
            reblogs_count: obj.shares?.totalItems || 0,
            favourites_count: obj.likes?.totalItems || 0,
          };
        });
    }

    posts.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  } catch (error) {
    console.log("Could not load outbox.json:", error);
  }

  return posts;
}
