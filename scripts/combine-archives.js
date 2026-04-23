#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ARCHIVES_DIR = './data/archives';
const OUTPUT_FILE = './data/outbox.json';
let mediaFileIndex = null;

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
      return isValidArchiveFile(file);
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
        // Skip posts that weren't public (empty cc field)
        const cc = post.cc || post.object?.cc;
        if (!cc || (Array.isArray(cc) && cc.length === 0)) {
          continue; // Skip non-public posts
        }
        
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
    
    // Copy media files
    await copyMediaFiles(sortedPosts);
    
    // Copy avatar and header images
    await copyProfileImages();
    
  } catch (error) {
    console.error('❌ Error combining archives:', error);
    process.exit(1);
  }
}

// Extract all media URLs from posts and copy the corresponding files
async function copyMediaFiles(posts) {
  console.log('\n📁 Copying media files...');
  
  const mediaUrls = new Set();
  const logFile = './scripts/media-copy-log.txt';
  const logEntries = [];
  
  // Extract all media URLs from posts
  posts.forEach(post => {
    const attachments = post.attachment || post.object?.attachment || [];
    attachments.forEach(att => {
      if (att.url && att.url.startsWith('/')) {
        mediaUrls.add(att.url);
      }
    });
  });
  
  console.log(`Found ${mediaUrls.size} unique media files to copy`);
  logEntries.push(`=== Media Copy Log - ${new Date().toISOString()} ===`);
  logEntries.push(`Found ${mediaUrls.size} unique media files to copy\n`);
  
  let copiedCount = 0;
  let skippedCount = 0;
  
  for (const mediaUrl of mediaUrls) {
    try {
      // Find source file in archives
      const sourceFile = findMediaFileInArchives(mediaUrl);
      if (sourceFile) {
        const destPath = `./public${mediaUrl}`;
        const destDir = path.dirname(destPath);
        
        // Create destination directory if it doesn't exist
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        // Copy file if it doesn't already exist
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(sourceFile, destPath);
          copiedCount++;
          logEntries.push(`✅ COPIED: ${mediaUrl} <- ${sourceFile}`);
        } else {
          skippedCount++;
          logEntries.push(`⏭️  SKIPPED: ${mediaUrl} (already exists)`);
        }
      } else {
        console.log(`⚠️  Could not find source file for: ${mediaUrl}`);
        skippedCount++;
        logEntries.push(`⚠️  NOT FOUND: ${mediaUrl} (source file not found in any archive)`);
      }
    } catch (error) {
      console.log(`❌ Error copying ${mediaUrl}: ${error.message}`);
      skippedCount++;
      logEntries.push(`❌ ERROR: ${mediaUrl} - ${error.message}`);
    }
  }
  
  logEntries.push(`\n=== Summary ===`);
  logEntries.push(`${copiedCount} files copied`);
  logEntries.push(`${skippedCount} files skipped/failed`);
  logEntries.push(`Total: ${mediaUrls.size} files processed`);
  
  // Append log to file (with newlines for separation between runs)
  const logContent = '\n' + logEntries.join('\n') + '\n';
  fs.appendFileSync(logFile, logContent);
  console.log(`📁 Media copy complete: ${copiedCount} copied, ${skippedCount} skipped/failed`);
  console.log(`📝 Detailed log appended to: ${logFile}`);
}

function normalizeMediaPath(filePath) {
  const normalizedPath = filePath.split(path.sep).join('/');
  const marker = 'media_attachments/';
  const markerIndex = normalizedPath.indexOf(marker);
  return markerIndex === -1 ? null : normalizedPath.substring(markerIndex);
}

function indexMediaFiles(dir, mediaFiles = new Map()) {
  if (!fs.existsSync(dir)) {
    return mediaFiles;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.name === '__MACOSX') {
      continue;
    }

    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      indexMediaFiles(fullPath, mediaFiles);
      continue;
    }

    if (!item.isFile()) {
      continue;
    }

    const normalizedMediaPath = normalizeMediaPath(fullPath);
    if (!normalizedMediaPath) {
      continue;
    }

    const existingPath = mediaFiles.get(normalizedMediaPath);
    if (!existingPath) {
      mediaFiles.set(normalizedMediaPath, fullPath);
      continue;
    }

    const existingStat = fs.statSync(existingPath);
    const currentStat = fs.statSync(fullPath);
    if (currentStat.mtime > existingStat.mtime) {
      mediaFiles.set(normalizedMediaPath, fullPath);
    }
  }

  return mediaFiles;
}

function getMediaFileIndex() {
  if (mediaFileIndex) {
    return mediaFileIndex;
  }

  mediaFileIndex = indexMediaFiles(ARCHIVES_DIR);
  console.log(`Indexed ${mediaFileIndex.size} media files from archives`);
  return mediaFileIndex;
}

// Find a media file in the archives directories
function findMediaFileInArchives(mediaUrl) {
  const relativePath = normalizeMediaPath(mediaUrl);
  if (!relativePath) {
    return null;
  }

  return getMediaFileIndex().get(relativePath) || null;
}

// Find and copy the most recent avatar and header images from archives
async function copyProfileImages() {
  console.log('\n🖼️  Copying profile images...');
  
  const profileTypes = ['avatar', 'header'];
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const logFile = './scripts/media-copy-log.txt';
  const logEntries = [];
  
  logEntries.push(`\n=== Profile Images Copy - ${new Date().toISOString()} ===`);
  
  for (const profileType of profileTypes) {
    try {
      // Find all instances of this profile image type in archive directories
      const foundFiles = findProfileImageInArchives(profileType, imageExtensions);
      
      if (foundFiles.length === 0) {
        console.log(`⚠️  No ${profileType} image found in any archive`);
        logEntries.push(`⚠️  NOT FOUND: ${profileType} (no instances found in archives)`);
        continue;
      }
      
      // Get the most recent file (by modification time)
      const mostRecent = foundFiles.reduce((latest, current) => {
        const latestStat = fs.statSync(latest);
        const currentStat = fs.statSync(current);
        return currentStat.mtime > latestStat.mtime ? current : latest;
      });
      
      // Get the file extension from the most recent file
      const fileExt = path.extname(mostRecent);
      const destPath = `./public/${profileType}${fileExt}`;
      
      // Copy the most recent file
      fs.copyFileSync(mostRecent, destPath);
      const sourceStat = fs.statSync(mostRecent);
      
      console.log(`✅ Copied most recent ${profileType}${fileExt} from ${mostRecent} (modified: ${sourceStat.mtime.toISOString()})`);
      logEntries.push(`✅ COPIED: ${profileType}${fileExt} <- ${mostRecent} (modified: ${sourceStat.mtime.toISOString()})`);
      logEntries.push(`   Found ${foundFiles.length} instances, selected most recent`);
      
    } catch (error) {
      console.log(`❌ Error copying ${profileType} image: ${error.message}`);
      logEntries.push(`❌ ERROR: ${profileType} - ${error.message}`);
    }
  }
  
  // Append log to file
  const logContent = logEntries.join('\n') + '\n';
  fs.appendFileSync(logFile, logContent);
  console.log(`🖼️  Profile images copy complete`);
}

// Find all instances of a profile image file in archive directories
function findProfileImageInArchives(profileType, imageExtensions) {
  const foundFiles = [];
  
  if (!fs.existsSync(ARCHIVES_DIR)) {
    return foundFiles;
  }
  
  // Get all archive directories
  const archiveDirs = fs.readdirSync(ARCHIVES_DIR, { withFileTypes: true })
    .filter(item => item.isDirectory())
    .map(item => path.join(ARCHIVES_DIR, item.name));
  
  // Search recursively in each archive directory
  function searchDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isFile()) {
        const fileName = path.parse(item.name).name.toLowerCase();
        const fileExt = path.parse(item.name).ext.toLowerCase();
        
        // Check if this is the profile image we're looking for
        if (fileName === profileType && imageExtensions.includes(fileExt)) {
          foundFiles.push(fullPath);
        }
      } else if (item.isDirectory()) {
        searchDirectory(fullPath);
      }
    }
  }
  
  // Search in each archive directory
  for (const archiveDir of archiveDirs) {
    searchDirectory(archiveDir);
  }
  
  return foundFiles;
}

combineArchives();
