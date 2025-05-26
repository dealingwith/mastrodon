import type { MastodonPost } from '../types/mastodon';

export interface ThreadedPost extends MastodonPost {
  isReply: boolean;
  replyToId?: string;
  threadId: string;
  threadPosition: number;
  hasReplies: boolean;
  replies: ThreadedPost[];
  depth: number;
}

export interface ThreadGroup {
  threadId: string;
  posts: ThreadedPost[];
  rootPost: ThreadedPost;
}

export function processThreads(posts: MastodonPost[]): ThreadGroup[] {
  // Create a map for quick lookup
  const postMap = new Map<string, MastodonPost>();
  posts.forEach(post => postMap.set(post.id, post));

  // Build thread relationships - only for replies that have their parent in the dataset
  const threadedPosts: ThreadedPost[] = posts.map(post => {
    const replyToId = extractReplyToId(post);
    const hasParentInDataset = replyToId && postMap.has(replyToId);
    
    return {
      ...post,
      isReply: hasParentInDataset, // Only true if parent is in our dataset
      replyToId: hasParentInDataset ? replyToId : undefined, // Clear if parent not found
      threadId: '', // Will be set below
      threadPosition: 0,
      hasReplies: false,
      replies: [],
      depth: 0
    };
  });

  // Create lookup map for threaded posts
  const threadedPostMap = new Map<string, ThreadedPost>();
  threadedPosts.forEach(post => threadedPostMap.set(post.id, post));

  // Build thread trees and assign thread IDs
  const threads = new Map<string, ThreadGroup>();
  const processedPosts = new Set<string>();

  threadedPosts.forEach(post => {
    if (processedPosts.has(post.id)) return;

    // Find the root of this thread
    const rootPost = findThreadRoot(post, threadedPostMap);
    const threadId = rootPost.id;

    if (!threads.has(threadId)) {
      // Build the complete thread
      const threadPosts = buildThreadTree(rootPost, threadedPostMap);
      
      threads.set(threadId, {
        threadId,
        posts: threadPosts,
        rootPost
      });

      // Mark all posts in this thread as processed
      threadPosts.forEach(p => processedPosts.add(p.id));
    }
  });

  // Sort threads by root post date (newest first)
  return Array.from(threads.values()).sort((a, b) => 
    new Date(b.rootPost.created_at).getTime() - new Date(a.rootPost.created_at).getTime()
  );
}

function extractReplyToId(post: MastodonPost): string | undefined {
  // Try to extract reply-to ID from the post object
  // This might be in different fields depending on the export format
  if ((post as any).inReplyTo) {
    // Extract the ID from the full URL
    const replyToUrl = (post as any).inReplyTo;
    const match = replyToUrl.match(/\/statuses\/(\d+)$/);
    return match ? match[1] : replyToUrl;
  }
  
  // Sometimes it's in the URL
  if ((post as any).inReplyToAtomUri) {
    const match = (post as any).inReplyToAtomUri.match(/\/statuses\/(\d+)$/);
    return match ? match[1] : undefined;
  }

  return undefined;
}

function findThreadRoot(post: ThreadedPost, postMap: Map<string, ThreadedPost>): ThreadedPost {
  let current = post;
  
  while (current.replyToId) {
    const parent = postMap.get(current.replyToId);
    if (!parent) break;
    current = parent;
  }
  
  return current;
}

function buildThreadTree(rootPost: ThreadedPost, postMap: Map<string, ThreadedPost>): ThreadedPost[] {
  const allPosts: ThreadedPost[] = [];
  const visited = new Set<string>();

  function traverse(post: ThreadedPost, depth: number, position: number) {
    if (visited.has(post.id)) return position;

    visited.add(post.id);
    post.depth = depth;
    post.threadPosition = position;
    post.threadId = rootPost.id;
    
    allPosts.push(post);
    let currentPosition = position + 1;

    // Find direct replies to this post
    const replies = Array.from(postMap.values())
      .filter(p => p.replyToId === post.id && !visited.has(p.id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    post.hasReplies = replies.length > 0;
    post.replies = replies;

    // Recursively process replies
    replies.forEach(reply => {
      currentPosition = traverse(reply, depth + 1, currentPosition);
    });

    return currentPosition;
  }

  traverse(rootPost, 0, 0);
  return allPosts;
}