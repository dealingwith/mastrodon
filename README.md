# Mastrodon

A static website generator for displaying Mastodon archive data using Astro. Transform your exported Mastodon posts into a beautiful, searchable static website.

## Features

- 📱 Responsive design optimized for reading posts
- 🎨 Clean, minimal interface inspired by social media feeds
- 📄 Static site generation - no server required
- 🔍 Support for multiple Mastodon export formats
- 🖼️ Media attachment support (images, videos, audio)
- ⚡ Fast loading with Astro's optimizations

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

2. **Prepare the JSON file:**
   - Extract the downloaded archive
   - Locate the JSON file (usually named `outbox.json` or similar)
   - Rename it to `outbox.json`

3. **Place the file:**
   - Copy `outbox.json` to the `public/` folder in this project
   - The file should be at `public/outbox.json`

4. **Restart the dev server:**
   ```bash
   npm run dev
   ```

Your posts should now appear on the website!

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

| Command           | Action                               |
| ----------------- | ------------------------------------ |
| `npm install`     | Install dependencies                 |
| `npm run dev`     | Start dev server at `localhost:4321` |
| `npm run build`   | Build production site to `./dist/`   |
| `npm run preview` | Preview production build locally     |

## Customization

### Styling
The main styles are in `src/pages/index.astro` and `src/components/MastodonPost.astro`. Modify these files to customize the appearance.

### Data Processing
To modify how archive data is processed, edit `src/utils/loadArchive.ts`.

## Contributing

Feel free to submit issues and pull requests to improve the application.

## License

MIT License - feel free to use this project however you'd like.