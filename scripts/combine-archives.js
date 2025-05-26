#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ARCHIVES_DIR = './public/archives';
const OUTPUT_FILE = './public/outbox.json';

async function combineArchives() {
  try {
    // Read all JSON files from archives directory
    const files = fs.readdirSync(ARCHIVES_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(ARCHIVES_DIR, file));

    console.log(`Found ${files.length} JSON files to combine`);

    const allPosts = new Map(); // Use Map to automatically handle duplicates by ID
    let totalItems = 0;

    // Process each file
    for (const file of files) {
      console.log(`Processing ${file}...`);
      const content = fs.readFileSync(file, 'utf8');
      const data = JSON.parse(content);
      
      // Handle both direct arrays and ActivityPub outbox format
      const posts = Array.isArray(data) ? data : (data.orderedItems || []);
      
      for (const post of posts) {
        // Use post ID as key to automatically deduplicate
        const postId = post.id || post.object?.id;
        if (postId && !allPosts.has(postId)) {
          allPosts.set(postId, post);
          totalItems++;
        }
      }
    }

    console.log(`Combined ${totalItems} unique posts`);

    // Convert Map values to array and sort by published date (reverse chronological)
    const sortedPosts = Array.from(allPosts.values()).sort((a, b) => {
      const dateA = new Date(a.published || a.object?.published || 0);
      const dateB = new Date(b.published || b.object?.published || 0);
      return dateB - dateA; // Reverse chronological (newest first)
    });

    // Create ActivityPub outbox format
    const outbox = {
      "@context": "https://www.w3.org/ns/activitystreams",
      "id": "outbox.json",
      "type": "OrderedCollection",
      "totalItems": sortedPosts.length,
      "orderedItems": sortedPosts
    };

    // Write combined file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outbox, null, 2));
    console.log(`✅ Created ${OUTPUT_FILE} with ${sortedPosts.length} posts`);
    
  } catch (error) {
    console.error('❌ Error combining archives:', error);
    process.exit(1);
  }
}

combineArchives();