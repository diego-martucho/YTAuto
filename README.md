# 🎬 YTAuto

Automate your YouTube playlist management. Monitor channels, filter videos by title, and automatically add them to your playlists — every day, zero manual work.

## Features

- **🔄 Daily Auto-Sync** — Automatically adds new videos from monitored channels to your playlists
- **🔍 Smart Filtering** — Filter videos by title keywords to only capture the programs you care about
- **📺 Manual Search** — Search and add individual videos directly from YouTube
- **⚡ Zero Quota Waste** — Uses RSS feeds for channel monitoring (0 API cost), only consumes quota for playlist inserts
- **🌙 Dark Theme** — Modern, clean interface with dark mode

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Neon PostgreSQL (Serverless)
- **ORM**: Drizzle ORM (HTTP driver)
- **Auth**: Auth.js v5 (Google OAuth + YouTube scope)
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Hosting**: Vercel (Hobby tier)
- **Monitoring**: YouTube RSS Feeds + YouTube Data API v3

## Getting Started

### Prerequisites

- Node.js 20+
- A Google Cloud project with YouTube Data API v3 enabled
- A Neon PostgreSQL database
- OAuth 2.0 credentials (Google)

### Setup

1. Clone the repository:
   ```bash
   git clone git@github.com:diego-martucho/YTAuto.git
   cd YTAuto
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

4. Push the database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

See [`.env.example`](.env.example) for the full list of required variables.

## License

MIT
