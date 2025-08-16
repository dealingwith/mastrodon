import fs from 'fs';
import path from 'path';

/**
 * Find the actual file extension for a profile image (avatar or header)
 * Searches for files in the public directory during build time
 */
export function findImageFile(baseName: string): string {
  const publicDir = path.join(process.cwd(), 'public');
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  
  // Try to find the file with any of the supported extensions
  for (const ext of imageExtensions) {
    const filePath = path.join(publicDir, `${baseName}${ext}`);
    if (fs.existsSync(filePath)) {
      return `/${baseName}${ext}`;
    }
  }
  
  // Fallback to .jpg if no file is found
  console.warn(`⚠️  No ${baseName} image found in public directory, using fallback`);
  return `/${baseName}.jpg`;
}

/**
 * Get a mapping of all profile images with their actual extensions
 * This can be used to cache the results during build time
 */
export function getProfileImageMap(): Record<string, string> {
  const profileTypes = ['avatar', 'header'];
  const imageMap: Record<string, string> = {};
  
  for (const profileType of profileTypes) {
    imageMap[profileType] = findImageFile(profileType);
  }
  
  return imageMap;
}