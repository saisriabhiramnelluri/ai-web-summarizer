import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeWebsite } from './utils/scraper.js';
import { summarizeText, extractKeyPoints } from './utils/geminiClient.js';
import { cleanText, extractMetadata } from './utils/textProcessor.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isApiKeyConfigured = !!process.env.GEMINI_API_KEY;
  
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apiConfigured: isApiKeyConfigured,
    version: '1.0.0'
  });
});

// Main summarization endpoint
app.post('/api/summarize', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('Received summarize request');
    console.log('Request body:', req.body);
    
    const { url } = req.body;

    // Validation
    if (!url) {
      console.log('Error: URL missing from request');
      return res.status(400).json({ 
        error: 'URL is required',
        code: 'MISSING_URL'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.log('Error: API key not configured');
      return res.status(500).json({ 
        error: 'Server configuration error: API key not configured',
        code: 'MISSING_API_KEY'
      });
    }

    console.log(`Processing request for URL: ${url}`);

    // Step 1: Scrape website
    const scraped = await scrapeWebsite(url);
    
    if (scraped.error) {
      console.log('Scraping failed:', scraped.error);
      return res.status(400).json({ 
        error: scraped.error,
        code: 'SCRAPING_FAILED'
      });
    }

    console.log(`Successfully scraped ${scraped.wordCount} words using ${scraped.method}`);

    // Step 2: Clean and process text
    const cleanedText = cleanText(scraped.text);
    const metadata = extractMetadata(cleanedText);

    console.log(`Text processed: ${metadata.wordCount} words, ${metadata.sentenceCount} sentences`);

    // Step 3: Generate AI summary
    const summary = await summarizeText(cleanedText);

    if (summary.error) {
      console.log('Summarization failed:', summary.error);
      return res.status(500).json({ 
        error: 'Failed to generate summary: ' + summary.error,
        code: 'SUMMARIZATION_FAILED'
      });
    }

    console.log('Summary generated successfully');

    // Step 4: Extract key points
    const keyPoints = await extractKeyPoints(cleanedText);

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Send response
    const response = {
      success: true,
      title: scraped.title,
      summary: summary.text,
      keyPoints: keyPoints.text || '',
      metadata: {
        wordCount: metadata.wordCount,
        sentenceCount: metadata.sentenceCount,
        characterCount: metadata.characterCount,
        readingTime: metadata.readingTime,
        scrapingMethod: scraped.method,
        processingTime: `${processingTime}ms`,
        timestamp: metadata.timestamp
      }
    };

    console.log(`Request completed successfully in ${processingTime}ms`);
    res.json(response);

  } catch (error) {
    console.error('Server error:', error);
    
    res.status(500).json({ 
      error: 'An unexpected error occurred while processing your request',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({ 
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`Server Status: Running`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log('=================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
