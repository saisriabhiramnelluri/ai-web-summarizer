import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuration for the Gemini model
const modelConfig = {
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048,
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  ],
};

const model = genAI.getGenerativeModel(modelConfig);

/**
 * Retry logic with exponential backoff for API calls
 */
async function retryWithBackoff(fn, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if it's a rate limit error
      if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        console.log(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

/**
 * Generate AI summary from text content
 */
export async function summarizeText(text) {
  try {
    const maxLength = 8000;
    const truncatedText = text.substring(0, maxLength);

    const prompt = `You are an expert content summarizer. Analyze and summarize the following web content in a clear, well-structured format.

CONTENT:
${truncatedText}

INSTRUCTIONS:
- Provide a comprehensive summary that captures the main ideas
- Use clear paragraphs and bullet points where appropriate
- Maintain the key information and context
- Write in a professional yet accessible tone
- Keep the summary concise but informative (aim for 200-400 words)

Provide your summary now:`;

    const result = await retryWithBackoff(async () => {
      return await model.generateContent(prompt);
    });

    const response = result.response;
    const summary = response.text();

    return {
      success: true,
      text: summary
    };

  } catch (error) {
    console.error('Gemini API Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to generate summary'
    };
  }
}

/**
 * Extract key points from content
 */
export async function extractKeyPoints(text) {
  try {
    const maxLength = 6000;
    const truncatedText = text.substring(0, maxLength);

    const prompt = `Extract the 5-7 most important key points from this content. Return them as a numbered list.

CONTENT:
${truncatedText}

Provide only the key points in this format:
1. [First key point]
2. [Second key point]
...`;

    const result = await retryWithBackoff(async () => {
      return await model.generateContent(prompt);
    });

    const response = result.response;
    const keyPoints = response.text();

    return {
      success: true,
      text: keyPoints
    };

  } catch (error) {
    console.error('Key Points Extraction Error:', error.message);
    return {
      success: false,
      error: error.message,
      text: ''
    };
  }
}
