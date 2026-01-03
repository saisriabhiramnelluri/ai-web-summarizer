# AI Web Summarizer 🚀

**AI-powered web scraper and summarizer**

A small Express.js service that scrapes article content from a public URL and uses Google's Gemini generative API to produce a concise, well-structured summary and extract key points.

---

## 🔍 What this project does

- Scrapes the main article content from a URL using Axios + Cheerio
- Cleans and normalizes text (word counts, reading time)
- Generates an AI summary and extracts key points via the Gemini API
- Provides a lightweight REST API and a static frontend in `public/`

## ✨ Key features

- Simple, Vercel-friendly scraping (no headless browser required)
- Exponential backoff for Gemini API requests
- Clean processing pipeline (scraping → cleaning → summarize → key points)
- Configurable with environment variables

---

## 🚀 Quick start

### Prerequisites

- Node.js >= 18
- npm >= 9
- A Gemini API key (set in `GEMINI_API_KEY`)

### Install

```bash
git clone <repo-url>
cd web-scraper-summarizer
npm install
```

### Configure

Create a `.env` file in the project root and add:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000 # optional
NODE_ENV=development # optional
```

> Note: `.env` is included in `.gitignore` — do not commit secrets.

### Run locally

- Development (auto-reload):

```bash
npm run dev
```

- Start server:

```bash
npm start
```

The server will run at `http://localhost:3000` by default.

---

## 🧭 API

### Health check

- GET `/api/health`

Sample response:

```json
{ "status": "healthy", "apiConfigured": true }
```

### Summarize

- POST `/api/summarize`

Request body (JSON):

```json
{ "url": "https://example.com/article" }
```

Example cURL:

```bash
curl -X POST http://localhost:3000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/article"}'
```

Response (abridged):

```json
{
  "success": true,
  "title": "Article Title",
  "summary": "...generated summary text...",
  "keyPoints": "1. ...\n2. ...",
  "metadata": { "wordCount": 1200, "readingTime": "6 min read" }
}
```

> If scraping fails the API returns a descriptive error with a `code` (e.g., `SCRAPING_FAILED`).

---

## 🛠 How it works (internals)

- `utils/scraper.js` — makes an HTTP GET request and extracts the largest text region from common content selectors (article, main, etc.).
- `utils/textProcessor.js` — cleans text and computes metadata like reading time and word count.
- `utils/geminiClient.js` — wraps the Gemini generative client and provides `summarizeText` and `extractKeyPoints` utilities, with retry/backoff logic.
- `server.js` — Express server exposing the API and serving static files in `public/`.

---

## ♻️ Deployment

- Vercel-friendly configuration is present (`vercel.json`). For production, make sure `GEMINI_API_KEY` is set in your environment.

---

## ⚠️ Responsible use & scraping etiquette

- Respect site `robots.txt` and a website's Terms of Service before scraping.
- Avoid overloading sites—use rate limits and caching where appropriate.
- Do not use the service to summarize or extract content you do not have the right to use.

---

## ✅ Contributing

If you'd like to contribute, please:

1. Open an issue to discuss changes.
2. Fork the repo and create a feature branch.
3. Submit a pull request with a clear description.

If you have a `CONTRIBUTING.md` file, follow its rules; otherwise follow the steps above.

---

## 🧾 License

This project is licensed under the **MIT License**. See `LICENSE` for details.

---

## 💬 Support

- For issues and feature requests, open an issue on the repository.

---

## Acknowledgements

- Built using `@google/generative-ai`, Cheerio, and Axios.

---

If you'd like, I can also add a short `CONTRIBUTING.md` and a `docs/` folder with templates and examples. ✅
