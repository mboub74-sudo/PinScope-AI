# PinScope AI — Independent Pinterest Research MVP

A responsive Next.js 14 research dashboard featuring keyword brainstorming, editable Pin copy, official Pinterest search/Trends links and CSV export.

## Run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

## Deploy to Vercel

1. Upload this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project → Import Git Repository**.
3. Framework: Next.js; build command: `npm run build`; deploy.

No environment variables are required for this version.

## Data integrity

**Important:** This MVP does not scrape Pinterest or claim access to Pinterest search volume, saves, clicks or impressions. Keyword suggestions and Pin titles/descriptions are deterministic generated brainstorming outputs, clearly labeled. The Pin Explorer and Trends sections link to official Pinterest pages. A future compliant integration can add real data with attribution and permissions.

## API

- `POST /api/analyze` with JSON `{ "keyword": "healthy dinner" }`
- `GET /api/export?keyword=healthy%20dinner` downloads CSV.

## Trends: Keyword → Pins (v0.2)
The Trends tab now searches for Pins for the entered keyword. Without an authorized data provider, it transparently shows links to actual Pinterest search results and related searches, rather than fabricated Pin cards.

To enable real in-dashboard Pin cards, configure server-side `PINSCOPE_PINS_API_URL` (a compliant, authorized adapter endpoint that accepts `q` and returns `{ "pins": [{"id":"...","title":"...","description":"...","imageUrl":"https://...","url":"https://www.pinterest.com/pin/..."}] }`) and optionally `PINSCOPE_PINS_API_TOKEN`. Do not expose provider secrets in browser code. Search ranking is not evidence of trending growth.
