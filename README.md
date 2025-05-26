# Mastrodon

A static website generator for displaying Mastodon archive data using Astro. Transform your exported Mastodon posts into a beautiful, searchable static website.

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

#### Option 1: Single Archive File
1. **Prepare the JSON file:**
   - Extract the downloaded archive
   - Locate the JSON file (usually named `outbox.json` or similar)
   - Rename it to `outbox.json`
1. **Place the file:**
   - Copy `outbox.json` to the `public/` folder in this project
   - The file should be at `public/outbox.json`

#### Option 2: Multiple Archive Files
If you have multiple Mastodon archives (e.g., from different time periods or instances), you can combine them:

1. **Prepare the JSON files:**
   - Extract all your downloaded archives
   - Place all JSON files in the `public/archives/` folder
   - Files can have any name (e.g., `outbox1.json`, `outbox2.json`, etc.)

2. **Combine the archives:**
   ```bash
   npm run combine-archives
   ```
   This script will:
   - Read all JSON files from `public/archives/`
   - Remove duplicate posts across files
   - Sort posts in reverse chronological order (newest first)
   - Create a combined `public/outbox.json` file

#### Media Files
Put your `avatar` and `header` in `/public`
- Put your files in `/public` and make the file structure match the paths in your JSON, e.g. look for these kinds of paths:
```
"url":"/<yourserver>/media_attachments/files/<...>/original/file.jpg"
```

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

### Styling
The main styles are in `src/pages/index.astro` and `src/components/MastodonPost.astro`. Modify these files to customize the appearance.

### Data Processing
To modify how archive data is processed, edit `src/utils/loadArchive.ts`.
