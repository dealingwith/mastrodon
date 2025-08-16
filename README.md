# Mastrodon

A static website generator for displaying Mastodon archive data using Astro.

## Getting Started

### Prerequisites

- Node.js 18.20.8 or higher
- npm or yarn

### Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:4321](http://localhost:4321) in your browser

### Adding Your Mastodon Archive

1. **Export your Mastodon data:**
   - Go to your Mastodon instance
   - Navigate to Preferences → Import and export → Data export
   - Download your archive (this may take some time for large archives)
1. **Copy the extracted archive folder into the project's `data/archives` folder**
   - You can place multiple archive folders in there
1. **Process your archive(s)**
   ```bash
   npm run combine-archives
   ```
   This script will:
   - Read all JSON files from `data/archives/`
   - Remove duplicate posts across files
   - Sort posts in reverse chronological order (newest first)
   - Create a combined `data/outbox.json` file
   - Copy your avatar and header images, and all your media files to be used in the new archive static site generation

## Supported Data Formats

The application supports multiple Mastodon export formats:

### ActivityPub Format (most common)
```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://your-instance.social/users/username/outbox",
  "type": "OrderedCollection",
  "orderedItems": [
    {
      "id": "https://your-instance.social/users/username/statuses/123456789/activity",
      "type": "Create",
      "actor": "https://your-instance.social/users/username",
      "published": "2023-12-01T12:00:00Z",
      "object": {
        "id": "https://your-instance.social/users/username/statuses/123456789",
        "type": "Note",
        "summary": null,
        "content": "<p>Your post content here</p>",
        "published": "2023-12-01T12:00:00Z",
        "url": "https://your-instance.social/@username/123456789",
        "attributedTo": "https://your-instance.social/users/username",
        "attachment": [
          {
            "type": "Document",
            "mediaType": "image/jpeg",
            "url": "https://your-instance.social/media/image.jpg",
            "name": "Alt text for image"
          }
        ]
      }
    }
  ]
}
```

### Direct Array Format
```json
[
  {
    "id": "123456789",
    "created_at": "2023-12-01T12:00:00Z",
    "content": "<p>Your post content here</p>",
    "visibility": "public",
    "sensitive": false,
    "account": {
      "username": "youruser",
      "display_name": "Your Name"
    }
  }
]
```

### Wrapped Posts Format
```json
{
  "posts": [
    // Array of post objects as above
  ]
}
```

## Building for Production

To create a production build:

```bash
npm run build
```

The built site will be in the `dist/` folder, ready to deploy to any static hosting service.

## Project Structure

```
/
├── public/
│   └── outbox.json    # Place your archive here
├── src/
│   ├── components/
│   │   └── MastodonPost.astro   # Post display component
│   ├── pages/
│   │   └── index.astro          # Main page
│   ├── types/
│   │   └── mastodon.ts          # TypeScript interfaces
│   └── utils/
│       └── loadArchive.ts       # Archive loading logic
└── package.json
```

## Commands

| Command                | Action                               |
| ---------------------- | ------------------------------------ |
| `npm install`          | Install dependencies                 |
| `npm run dev`          | Start dev server at `localhost:4321` |
| `npm run build`        | Build production site to `./dist/`   |
| `npm run preview`      | Preview production build locally     |
| `npm run combine-archives` | Combine multiple JSON archives into single outbox.json |

## Customization

### Configuration
Edit `src/config.ts` to customize site behavior:

- **`showRepliesToOthers`**: Whether to display replies to other accounts
  - `false` (default): Shows only your original posts and self-replies (threaded posts)
  - `true`: Shows all posts including replies to other people's posts

- **`enableLinkPreviews`**: Whether to generate rich link previews for external URLs
  - `true` (default): Fetches and displays rich preview cards (slower builds)
  - `false`: Shows plain links only (much faster builds)

### Styling
The main styles are in `src/pages/index.astro` and `src/components/MastodonPost.astro`. Modify these files to customize the appearance.

### Data Processing

- Not-public posts (e.g. follower-only) are excluded. 
- You can configure display of reply posts in `config.ts` -- the default is `false`. Consider how other users might feel about displaying their usernames and profile links in your archive before turning this on.

### Link Previews
Link previews are automatically generated for external URLs in posts. The system is optimized for build performance:

- **Streaming fetch**: Only downloads HTML head section (not entire pages)
- **3-second timeout**: Prevents slow sites from blocking builds
- **HTML entity decoding**: Cleans up escaped characters in titles (`&amp;`, `&#39;`, `&nbsp;`, etc.)
- **Compression support**: Uses gzip/deflate for faster downloads

If link previews are slowing your build, you can disable them by setting `enableLinkPreviews: false` in `src/config.ts`.
