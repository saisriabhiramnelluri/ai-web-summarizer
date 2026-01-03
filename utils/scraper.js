import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Use stealth plugin to bypass bot detection
puppeteer.use(StealthPlugin());

const SCRAPER_CONFIG = {
  timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
  maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
  maxTextLength: parseInt(process.env.MAX_TEXT_LENGTH) || 10000,
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
 * Sleep function to replace deprecated waitForTimeout
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrape website using Puppeteer with stealth mode (handles JavaScript and anti-bot protection)
 */
async function scrapeWithPuppeteer(url) {
  let browser;
  
  try {
    console.log('Launching Puppeteer browser with stealth mode...');
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--user-agent=' + SCRAPER_CONFIG.userAgent
      ],
      timeout: SCRAPER_CONFIG.timeout
    });

    const page = await browser.newPage();

    // Set viewport and additional properties
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Override webdriver property to avoid detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Override plugins to appear like a real browser
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    // Set extra HTTP headers to mimic real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-User': '?1',
      'Sec-Fetch-Dest': 'document',
      'Cache-Control': 'max-age=0'
    });

    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log(`Navigating to ${url}...`);

    // Navigate to page with longer timeout for Cloudflare challenges
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: SCRAPER_CONFIG.timeout
    });

    // Wait for content to load (replace deprecated waitForTimeout)
    await sleep(3000);

    // Check if Cloudflare challenge is present and wait if needed
    const hasCloudflare = await page.evaluate(() => {
      return document.title.includes('Just a moment') || 
             document.body.textContent.includes('Checking your browser');
    });

    if (hasCloudflare) {
      console.log('Cloudflare challenge detected, waiting...');
      await sleep(8000);
    }

    // Extract title
    const title = await page.title();

    // Remove unwanted elements
    await page.evaluate(() => {
      const unwantedSelectors = [
        'script', 'style', 'nav', 'footer', 'header', 
        'aside', 'noscript', 'iframe', '.advertisement', 
        '.ads', '[class*="cookie"]', '[id*="cookie"]',
        '[class*="banner"]', '[id*="banner"]'
      ];
      
      unwantedSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });
    });

    // Extract text content
    const text = await page.evaluate(() => {
      // Try to find main content area first
      const mainSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.main-content',
        '#content',
        'body'
      ];

      for (const selector of mainSelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText && element.innerText.length > 200) {
          return element.innerText;
        }
      }

      return document.body.innerText;
    });

    await browser.close();

    // Clean and limit text
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, SCRAPER_CONFIG.maxTextLength);

    if (cleanedText.length > 100) {
      console.log(`Successfully extracted ${cleanedText.length} characters`);
      return {
        success: true,
        title: title || 'Extracted Content',
        text: cleanedText,
        wordCount: cleanedText.split(/\s+/).length,
        method: 'puppeteer-stealth'
      };
    }

  } catch (error) {
    console.error('Puppeteer scraping error:', error.message);
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return null;
}

/**
 * Scrape using Axios + Cheerio with enhanced headers (fallback for simple sites)
 */
async function scrapeWithCheerio(url) {
  try {
    console.log('Using Cheerio scraper with enhanced headers...');

    const response = await axios.get(url, {
      headers: {
        'User-Agent': SCRAPER_CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Referer': 'https://www.google.com/'
      },
      timeout: SCRAPER_CONFIG.timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Accept all status codes below 500
    });

    // Check if we got blocked
    if (response.status === 403 || response.status === 429) {
      console.log(`Received status ${response.status}, site may be protected`);
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
      console.log(`Successfully extracted ${text.length} characters with Cheerio`);
      return {
        success: true,
        title,
        text,
        wordCount: text.split(/\s+/).length,
        method: 'cheerio'
      };
    }

  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.error('Cheerio scraping blocked: 403 Forbidden (site has anti-bot protection)');
    } else {
      console.error('Cheerio scraping error:', error.message);
    }
  }

  return null;
}

/**
 * Main scraping function with fallback strategy
 */
export async function scrapeWebsite(url) {
  // Validate URL
  if (!isValidUrl(url)) {
    return { 
      error: 'Invalid URL format. Please include http:// or https://' 
    };
  }

  console.log(`Starting scrape for: ${url}`);

  // Try Puppeteer with stealth mode first (best for protected sites)
  let result = await scrapeWithPuppeteer(url);
  if (result) {
    console.log(`Successfully scraped with Puppeteer Stealth`);
    return result;
  }

  // Fallback to Cheerio (faster for simple sites)
  result = await scrapeWithCheerio(url);
  if (result) {
    console.log(`Successfully scraped with Cheerio`);
    return result;
  }

  // All methods failed
  return {
    error: 'Could not extract content from this URL. The site likely uses advanced anti-bot protection (Cloudflare, PerimeterX, etc.) or requires authentication. Protected sites like LeetCode, LinkedIn, and Twitter may block automated access.'
  };
}
