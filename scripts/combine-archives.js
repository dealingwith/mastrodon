#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ARCHIVES_DIR = './public/archives';
const OUTPUT_FILE = './public/outbox.json';

// Recursively find all JSON files in directory and subdirectories
function findJsonFiles(dir) {
  let jsonFiles = [];
  
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist`);
    return jsonFiles;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Recursively search subdirectories
      jsonFiles = jsonFiles.concat(findJsonFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.json')) {
      jsonFiles.push(fullPath);
    }
  }
  
  return jsonFiles;
}

// Check if a JSON file contains valid Mastodon archive data
function isValidArchiveFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Skip files that are clearly bookmarks or likes (just arrays of URLs)
    if (data.orderedItems && Array.isArray(data.orderedItems) && data.orderedItems.length > 0) {
      // Check if orderedItems contains actual post objects vs just URL strings
      const firstItem = data.orderedItems[0];
      if (typeof firstItem === 'string') {
        // This is likely bookmarks.json or likes.json (array of URL strings)
        return false;
      }
      // This should be actual ActivityPub posts with objects
      return firstItem && (firstItem.type === 'Create' || firstItem.type === 'Note');
    }
    
    // Check for direct array format
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      // Should be post objects, not URL strings
      return typeof firstItem === 'object' && firstItem !== null && (firstItem.id || firstItem.content);
    }
    
    // Check for wrapped posts format
    if (data.posts && Array.isArray(data.posts) && data.posts.length > 0) {
      const firstItem = data.posts[0];
      return typeof firstItem === 'object' && firstItem !== null && (firstItem.id || firstItem.content);
    }
    
    return false;
  } catch (error) {
    console.log(`Skipping invalid JSON file: ${filePath}`);
    return false;
  }
}

async function combineArchives() {
  try {
    // Find all JSON files recursively
    const allJsonFiles = findJsonFiles(ARCHIVES_DIR);
    console.log(`Found ${allJsonFiles.length} JSON files`);
    
    // Filter to only valid archive files
    const files = allJsonFiles.filter(file => {
      const isValid = isValidArchiveFile(file);
      if (!isValid) {
        console.log(`Skipping non-archive file: ${file}`);
      }
      return isValid;
    });

    console.log(`Found ${files.length} valid archive files to combine`);

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