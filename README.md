# 🍹 Piña Colada Bar Finder

Find bars serving delicious piña coladas in your area with location detection, interactive maps, community verification, and reviews.

## Features

- **Location Detection**: Automatically detects your location via browser geolocation
- **Interactive Map**: Google Maps integration with custom markers for each bar
- **Smart Filters**: Filter by distance, rating, price level, verification status, and open now
- **Community Verification**: Vote on whether bars actually serve piña coladas
- **User Reviews**: Share detailed reviews with 1-5 star ratings and photos
- **Photo Uploads**: Attach photos of piña coladas to your reviews (max 5MB)
- **Average Ratings**: See piña colada ratings from community reviews
- **Operating Hours**: View complete weekly schedules for each bar
- **Get Directions**: One-click navigation to bars via Google Maps
- **Favorite Bars**: Save your favorite locations for quick access

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Express 4, tRPC 11, Node.js
- **Database**: MySQL/TiDB with Drizzle ORM
- **Maps**: Google Maps JavaScript API with Manus proxy
- **Storage**: AWS S3 for photo uploads
- **Authentication**: Manus OAuth
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/anubissbe/pina-colada-bar-finder.git
cd pina-colada-bar-finder
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables (see `.env.example`)

4. Push database schema:
```bash
pnpm db:push
```

5. Start development server:
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm db:push` - Generate and run database migrations

## Project Structure

```
├── client/              # Frontend React application
│   ├── public/          # Static assets
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page components
│       └── lib/         # Utilities and tRPC client
├── server/              # Backend Express + tRPC
│   ├── _core/           # Core framework files
│   ├── db.ts            # Database helpers
│   └── routers.ts       # tRPC procedures
├── drizzle/             # Database schema and migrations
└── shared/              # Shared types and constants
```

## Features in Detail

### Search & Filters
- Distance radius (1-10km)
- Minimum rating (0-5 stars)
- Maximum price level ($-$$$$)
- Verified only (community-confirmed)
- Open now (currently open bars)

### Verification System
- Yes/No voting on piña colada availability
- Percentage-based verification scores
- Minimum vote thresholds for verified status
- Visual badges for verified bars

### Review System
- 1-5 star ratings specifically for piña coladas
- Text reviews up to 1000 characters
- Photo uploads (max 5MB)
- Edit/delete your own reviews
- Average rating display

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
