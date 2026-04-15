# Search Console Keyword Intelligence Dashboard

Internal Next.js dashboard for pulling Google Search Console performance data, enriching it with SEO intent and product mapping, caching the processed dataset, and reviewing results in a leadership-friendly interface.

## Stack

- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- NextAuth Google OAuth
- Local JSON cache for development
- Vercel Blob for persistent production cache

## What It Does

- Connects to Google Search Console with Google OAuth 2.0
- Lists available Search Console properties after login
- Saves the selected property for the connected user
- Pulls Search Analytics rows for `query` + `page`
- Enriches each row with:
  - `intent`
  - `product`
  - `intent_priority_score`
- Caches synced datasets by property + date range
- Displays summary cards, breakdowns, filters, sorting, and a CSV export

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file and add real credentials:

```bash
cp .env.example .env
```

3. Set these env vars:

- `APP_BASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `BLOB_READ_WRITE_TOKEN` (optional locally, recommended on Vercel)

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Google Cloud Setup

Use a Google OAuth **Web application** client. Do not use a desktop client for this app.

### Required scope

`https://www.googleapis.com/auth/webmasters.readonly`

### Authorized redirect URIs

Add the exact callback URLs you will use:

- Local:
  - `http://localhost:3000/api/auth/callback/google`
- Production example:
  - `https://your-vercel-project.vercel.app/api/auth/callback/google`
- Custom domain example:
  - `https://seo-dashboard.yourcompany.com/api/auth/callback/google`

### Google Cloud steps

1. Open Google Cloud Console.
2. Enable the Search Console API.
3. Go to `APIs & Services` > `Credentials`.
4. Create OAuth Client ID.
5. Choose `Web application`.
6. Add the authorized redirect URIs shown above.
7. Copy the client ID and client secret into your environment variables.

## Environment Variables

```env
APP_BASE_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-random-string
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-web-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_token
```

### Persistence note

Local development stores cached datasets and selected property state in `data/dashboard-state.json`. On Vercel, add `BLOB_READ_WRITE_TOKEN` so the app can persist the processed datasets in Vercel Blob across deployments and serverless invocations.

## Vercel Deployment

1. Push this repo to GitHub.
2. Import the GitHub repo into Vercel.
3. Hobby plan note: the app now builds even before secrets are added, so you can import first and then configure env vars in Vercel project settings.
4. Set the production environment variables in Vercel:
   - `APP_BASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
   - `BLOB_READ_WRITE_TOKEN` (optional on Hobby; without it the app uses local ephemeral cache)
   - `DASHBOARD_ACCESS_PASSWORD` (optional shared password gate for the whole URL)
5. Redeploy after env vars are in place.
6. Add the deployed callback URL to your Google OAuth Web Application client.

### Shared password access on Hobby

Vercel's built-in production Password Protection is not available on the Hobby plan. This project includes an app-level password gate instead. If you set `DASHBOARD_ACCESS_PASSWORD`, visitors must enter that shared password before they can access the dashboard URL.

## Project Structure

- `app/` UI and API routes
- `components/` dashboard and auth UI
- `lib/` auth, storage, Search Console, enrichment, and dashboard helpers
- `data/dashboard-state.json` local cache file created at runtime

## Security Notes

- Secrets are only read from environment variables.
- `.gitignore` excludes `.env`, OAuth client JSON files, local cache files, and local toolchain artifacts.
- Refresh tokens are stored in encrypted Auth.js JWT sessions and are only used server-side to refresh access.
- The provided Google OAuth JSON file should not be committed.
- For production, create a Google OAuth **Web application** client and set the deployed callback URL exactly.
