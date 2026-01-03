/**
 * Clean and normalize text
 */
export function cleanText(text) {
  if (!text) return '';

  // Remove extra whitespace
  let cleaned = text.replace(/\s+/g, ' ');

  // Remove special characters but keep punctuation
  cleaned = cleaned.replace(/[^\w\s.,!?;:()\-'"]/g, '');

  return cleaned.trim();
}

/**
 * Extract metadata from text
 */
export function extractMetadata(text) {
  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const characters = text.length;

  // Estimate reading time (200 words per minute)
  const readingTime = Math.max(1, Math.round(words.length / 200));

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    characterCount: characters,
    readingTime: `${readingTime} min read`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Truncate text to maximum length
 */
export function truncateText(text, maxLength = 5000) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
