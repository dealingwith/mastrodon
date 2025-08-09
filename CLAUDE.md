# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mastrodon is an Astro-based static website generator that transforms Mastodon archive data into a beautiful, searchable static website. The application processes exported Mastodon posts and displays them in a threaded, paginated format with media support.

## Development Commands

### Core Development
- `npm run dev` - Start Astro development server at localhost:4321
- `npm run build` - Build production site to ./dist/
- `npm run preview` - Preview production build locally

### Archive Processing
- `npm run combine-archives` - Combine multiple JSON archives from public/archives/ into single outbox.json

## Architecture Overview

### Data Flow
1. **Archive Loading**: The app expects Mastodon archive data at `public/outbox.json`
2. **Data Processing**: Multiple archive formats are supported and normalized via `loadArchive.ts`
3. **Thread Processing**: Posts are organized into conversation threads via `threadProcessor.ts`
4. **Static Generation**: Astro generates paginated static pages with 10 threads per page

### Key Components

#### Data Processing (`src/utils/`)
- `loadArchive.ts` - Handles multiple Mastodon export formats (ActivityPub, direct arrays, wrapped posts)
- `threadProcessor.ts` - Builds conversation threads from individual posts, handles reply relationships

#### Components (`src/components/`)
- `MastodonPost.astro` - Individual post display with media, link previews, and engagement stats
- `ThreadGroup.astro` - Groups related posts into conversation threads
- `LinkPreview.astro` - Fetches and displays previews for external links
- `icons/` - SVG icon components for UI elements

#### Pages (`src/pages/`)
- `[...page].astro` - Main paginated view, handles both single posts and threaded conversations

### Data Types (`src/types/mastodon.ts`)
- `MastodonPost` - Core post interface
- `Account` - User account information  
- `MediaAttachment` - Image/video/audio attachments
- `ThreadedPost` - Extended post interface with threading metadata

## Supported Archive Formats

The application handles multiple Mastodon export formats:
1. **ActivityPub format** (most common) - `orderedItems` array with Create activities
2. **Direct array format** - Simple array of post objects
3. **Wrapped posts format** - Posts wrapped in a `posts` property

## File Structure Requirements

### Archive Data
- Single archive: Place `outbox.json` in `public/`
- Multiple archives: Place JSON files in `public/archives/` and run `npm run combine-archives`

### Media Files
- Avatar and header images should be placed in `public/` with filenames matching the archive data paths
- Media attachments should maintain the directory structure from the original archive

## Key Features

### Threading
- Automatically detects reply relationships using `inReplyTo` fields
- Builds conversation trees with proper depth and ordering
- Only threads posts that have their parent in the dataset

### Media Support
- Images displayed inline with responsive design
- Video/audio/document attachments shown as downloadable links
- Alt text support for accessibility

### Link Processing
- Automatic link preview generation for external URLs
- Filters out media files, hashtags, and user profiles from preview generation
- Cleans Mastodon's complex link HTML structure

### Pagination
- 10 threads per page (not individual posts)
- Smart pagination with ellipsis for large datasets
- SEO-friendly URLs

## Technology Stack

- **Framework**: Astro 5.8.0 (static site generator)
- **Styling**: TailwindCSS 4.x with custom orange/stone color scheme
- **TypeScript**: Strict configuration for type safety
- **Architecture**: Component-based with utility functions for data processing