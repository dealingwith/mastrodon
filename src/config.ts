// Configuration for Mastrodon
export const config = {
  // Whether to show replies to other accounts in the archive
  // true = show all posts including replies to others
  // false = only show original posts and self-replies (threaded posts)
  // I suggest keeping this false for a cleaner archive and to respect others' privacy
  showRepliesToOthers: false,

  // Whether to generate link previews for external URLs
  // true = fetch and display rich link previews (slower builds)
  // false = show plain links only (faster builds)
  enableLinkPreviews: false,
};
