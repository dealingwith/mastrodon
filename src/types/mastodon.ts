export interface MastodonPost {
  id: string;
  created_at: string;
  content: string;
  url?: string;
  visibility: string;
  sensitive: boolean;
  spoiler_text?: string;
  media_attachments?: MediaAttachment[];
  account: Account;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  reblog?: MastodonPost;
}

export interface Account {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  url: string;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'unknown';
  url: string;
  preview_url: string;
  description?: string;
}

export interface MastodonArchive {
  orderedItems: MastodonPost[];
}