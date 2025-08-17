import fs from 'fs';
import path from 'path';

function extractExpectedPagesFromIndex() {
  const indexPath = './dist/index.html';
  
  if (!fs.existsSync(indexPath)) {
    console.log('⚠️  index.html not found, skipping page count verification');
    return null;
  }

  try {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Look for the highest numbered page link in pagination
    // Pattern matches: <a href="/123" class="...">123</a>
    const pageLinks = indexContent.match(/href="\/(\d+)"/g);
    
    if (!pageLinks || pageLinks.length === 0) {
      console.log('⚠️  No pagination links found, assuming single page');
      return 1;
    }
    
    // Extract page numbers and find the maximum
    const pageNumbers = pageLinks
      .map(link => {
        const match = link.match(/href="\/(\d+)"/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);
    
    const maxPage = Math.max(...pageNumbers);
    console.log(`📄 Pagination analysis: Found links up to page ${maxPage}`);
    
    return maxPage;
  } catch (error) {
    console.log('⚠️  Error reading index.html:', error.message);
    return null;
  }
}

async function verifyBuild() {
  const distDir = './dist';

  console.log('🔍 Verifying build output...\n');

  // Check if build directory exists
  if (!fs.existsSync(distDir)) {
    throw new Error('❌ Build directory not found. Run npm run build first.');
  }

  // Check for index.html
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('❌ index.html not found in build');
  }
  console.log('✅ Found index.html');

  // Find actual pagination pages
  const pages = fs.readdirSync(distDir).filter(file =>
    file.match(/^\d+$/) && fs.statSync(path.join(distDir, file)).isDirectory()
  );

  console.log(`✅ Found ${pages.length} paginated page directories`);

  // Check each page has index.html
  for (const pageDir of pages) {
    const pagePath = path.join(distDir, pageDir, 'index.html');
    if (!fs.existsSync(pagePath)) {
      throw new Error(`❌ Missing index.html in page ${pageDir}`);
    }
  }

  if (pages.length > 0) {
    console.log(`✅ All page directories contain index.html`);
  }

  // Extract expected page count from pagination and compare
  const expectedMaxPage = extractExpectedPagesFromIndex();
  if (expectedMaxPage !== null) {
    const actualPages = pages.length + 1; // +1 for root page
    
    if (actualPages === expectedMaxPage) {
      console.log(`✅ Page count verification: ${actualPages}/${expectedMaxPage} pages built correctly`);
    } else {
      throw new Error(`❌ Page count mismatch: pagination shows ${expectedMaxPage} pages, but found ${actualPages} built pages`);
    }
  }

  console.log('\n🎉 Build verification completed successfully!');
}

verifyBuild().catch(error => {
  console.error(error.message);
  process.exit(1);
});