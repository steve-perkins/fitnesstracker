# FitnessTracker Frontend

React SPA with Vite, TypeScript, and Material UI.

## Commands

```bash
npm run dev      # Start dev server (default: http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

## Project Structure

```
src/
├── api/               # Axios client and API functions
├── components/        # Reusable UI components
├── context/           # React contexts (Auth, Date)
├── pages/             # Route pages (Profile, Food, Exercise, Reports)
├── types/             # TypeScript interfaces
├── App.tsx            # Main app with routing
└── main.tsx           # Entry point with providers
```

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **Material UI v5** (not v6/v9 - compatibility issues with React 19)
- **React Router v7** for routing
- **TanStack Query** for server state
- **Axios** for HTTP requests
- **Recharts** for charts
- **@react-oauth/google** for Google OAuth

## Environment Variables

Set in `.env` file (build-time variables):

```
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Key Components

### Layout
- Desktop: Permanent sidebar navigation
- Mobile: Bottom navigation with hamburger menu

Location: `src/App.tsx`

### Authentication
- Google OAuth button triggers popup flow
- On success, exchanges Google token for backend JWT
- JWT stored in localStorage
- Axios interceptor adds Authorization header

Location: `src/context/AuthContext.tsx`, `src/components/GoogleLoginButton.tsx`

### API Client
- Base URL from `VITE_API_BASE_URL` env var
- Auto-adds JWT token to requests
- 401 responses trigger logout

Location: `src/api/client.ts`

### Date Context
- Shared date state across Food, Exercise, Reports pages
- Allows navigating between dates

Location: `src/context/DateContext.tsx`

## Pages

- **Profile** (`/profile`): Weight tracking chart, user info editing, BMI/maintenance calories
- **Food** (`/food`): Food search, create/edit foods, daily food diary
- **Exercise** (`/exercise`): Exercise search by category, daily exercise log
- **Reports** (`/reports`): Dual-axis charts, date filtering, 30-day moving averages

## MUI v5 Notes

- Use named imports from `@mui/icons-material` (e.g., `import { Add } from '@mui/icons-material'`)
- Theme configured in `src/main.tsx`
- Responsive breakpoints: `xs`, `sm`, `md`, `lg`, `xl`

## PWA Configuration

- Manifest: `public/manifest.json`
- Icons: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Service worker: `public/sw.js`, registered in `index.html`

**Important**: `manifest.json` and `sw.js` must have 644 permissions (world-readable) or nginx will return 403 in production. Git doesn't track permission changes, so if these files get restrictive permissions (600), fix with:
```bash
chmod 644 public/manifest.json public/sw.js
```

## Docker Build

Frontend is built with build-time args for environment variables:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-client-id \
  -t fitnesstracker-web .
```
