import axios from 'axios';
import * as cheerio from 'cheerio';

const SCRAPER_CONFIG = {
  timeout: 30000,
  maxTextLength: 10000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Scrape using Axios + Cheerio (Vercel-compatible)
 */
async function scrapeWithCheerio(url) {
  try {
    console.log('Scraping with Cheerio...');

    const response = await axios.get(url, {
      headers: {
        'User-Agent': SCRAPER_CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.google.com/'
      },
      timeout: SCRAPER_CONFIG.timeout,
      maxRedirects: 5
    });

    if (response.status === 403 || response.status === 429) {
      console.log(`Received status ${response.status}`);
      return null;
    }

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, nav, footer, header, aside, noscript, iframe, [class*="ad"], [id*="ad"]').remove();

    // Extract title
    const title = $('title').text().trim() || 
                  $('h1').first().text().trim() || 
                  'No Title';

    // Try to find main content area
    let text = '';
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#main-content',
      'body'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length) {
        const extractedText = element.text();
        if (extractedText.length > text.length) {
          text = extractedText;
        }
      }
    }

    // Clean text
    text = text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, SCRAPER_CONFIG.maxTextLength);

    if (text.length > 100) {
      console.log(`Successfully extracted ${text.length} characters`);
      return {
        success: true,
        title,
        text,
        wordCount: text.split(/\s+/).length,
        method: 'cheerio'
      };
    }

  } catch (error) {
    console.error('Scraping error:', error.message);
  }

  return null;
}

/**
 * Main scraping function
 */
export async function scrapeWebsite(url) {
  if (!isValidUrl(url)) {
    return { 
      error: 'Invalid URL format. Please include http:// or https://' 
    };
  }

  console.log(`Starting scrape for: ${url}`);

  const result = await scrapeWithCheerio(url);
  
  if (result) {
    console.log(`Successfully scraped`);
    return result;
  }

  return {
    error: 'Could not extract content from this URL. The site may have anti-scraping protection or require JavaScript rendering.'
  };
}
