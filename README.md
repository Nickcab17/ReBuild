# Rebuild

Rebuild is a sustainable materials reuse platform that helps people give unused materials a second life and find resources they need for projects, repairs, and everyday tasks.

## What is Rebuild?

The MVP connects:

- people with available materials
- people needing materials
- businesses with surplus stock
- schools and organizations with reusable items

The core idea is simple:

- I have materials I no longer need -> Rebuild helps me find someone who can use them.
- I need materials -> Rebuild helps me find what is available nearby.

## Features

- Supabase Auth for the web and JWT authentication in the legacy mobile backend
- home feed and material discovery
- publish available materials
- publish material requests
- saved favorites
- persisted match suggestions from the existing matching logic
- AI-assisted classification and keyword extraction
- approximate map view and location filters
- token storage with Expo Secure Store on mobile and persistent Supabase Auth session tokens on web

## Architecture

- mobile: Expo + React Native + Expo Router
- backend: Node.js + TypeScript + Express + Serverless + Lambda + API Gateway
- mobile backend: DynamoDB-ready models with in-memory fallback for local development
- web persistence: Supabase Auth + PostgreSQL accessed through Vercel Functions

## Tech stack

### Mobile
- Expo SDK 54
- React Native 0.81
- TypeScript
- Expo Router
- Expo Location
- Expo Camera
- Expo Image Picker
- Expo Secure Store
- React Native Maps
- Expo Status Bar
- React Native Reanimated
- React Native Safe Area Context

### Backend
- Node.js 20
- TypeScript
- Express
- Serverless Framework
- AWS Lambda
- API Gateway
- DynamoDB-compatible models

## Project structure

```text
rebuild/
├── mobile/
├── backend/
├── README.md
├── .env.example
└── package.json
```

## Installation

The backend and mobile projects have separate package manifests. Install their dependencies from each project directory:

```bash
cd backend
npm install
cd ../mobile
npm install
```

## Environment variables

Copy the example file and fill in values:

```bash
cp .env.example .env
```

Configure variables only in the environment where they are consumed:

- **Vercel Functions (web):** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY`, provided by the Supabase integration. `SUPABASE_URL` supplies the project API URL; `SUPABASE_ANON_KEY` is the public/anon key used for authentication; `SUPABASE_SECRET_KEY` is used only by server-side Vercel Functions for privileged operations. Never prefix these variables with `EXPO_PUBLIC_`, and never expose the secret key to the browser.
- **Existing AWS backend (if still used by mobile):** `JWT_SECRET`, `AWS_REGION`, and its existing DynamoDB/IAM configuration remain separate from the web deployment.
- **Optional AI service:** `AI_VISION_API_URL`, `AI_VISION_API_KEY`, and `AI_VISION_MODEL` are backend-only.

The Vercel frontend calls same-origin `/api/...` functions, so Vercel does not need `EXPO_PUBLIC_API_URL` for the web deployment. Local native builds may continue using that variable for the existing backend. Never add database passwords or service-role keys to the client or repository.

## Backend

Run the API locally:

```bash
cd backend
npm run dev
```

Run the serverless offline environment:

```bash
cd backend
npm run offline
```

Seed demo data:

```bash
cd backend
npm run seed
```

Build the backend:

```bash
cd backend
npm run build
```

Deploy:

```bash
cd backend
npm run deploy
```

## Mobile

Start Expo Go:

```bash
cd mobile
npx expo start
```

## Web demo (Vercel)

From the repository root, install and start the existing Expo web demo:

```bash
cd mobile
npm install
npm run web
```

`npm run build` checks TypeScript and exports the web site to `mobile/dist`. For Vercel, set the project root directory to `mobile`; the Vercel project deploys the existing Expo static output and the `mobile/api` serverless functions together. The web functions validate Supabase Auth tokens and read/write PostgreSQL with the server-only `SUPABASE_SECRET_KEY`. The browser stores only access/refresh session tokens; passwords are handled and hashed by Supabase Auth. Production builds never use local demo accounts or demo publications. Unconfigured local development may still use the in-memory/browser-local demo.

### Supabase setup for web persistence

1. Create a Supabase project on the Free plan. Current free-plan limits include 500 MB of database storage, 50,000 monthly active Auth users, and projects pause after one week of inactivity; confirm current limits on [Supabase pricing](https://supabase.com/pricing).
2. In Supabase **SQL Editor**, run the full script from `mobile/supabase/schema.sql`. It creates `profiles`, `materials`, `requests`, and `matches`, the Auth profile trigger, foreign keys, indexes, and RLS.
3. Keep the environment variables created by the Supabase integration. The Vercel Function reads `SUPABASE_URL` as the project API URL, `SUPABASE_ANON_KEY` as the public key for Supabase Auth, and `SUPABASE_SECRET_KEY` only for privileged server-side operations. The secret key must not appear in `EXPO_PUBLIC_*` variables or browser code. This integration uses Supabase's API directly; `POSTGRES_URL` and `POSTGRES_PRISMA_URL` are not used.
4. Deploy the `mobile` project to Vercel. Its `/api` function routes are same-origin with the web app; no API Gateway, AWS credentials, or `EXPO_PUBLIC_API_URL` is required for the web build.
5. Register two test users from separate browser sessions. Create an offer and a compatible request, then verify that both the persisted records and calculated match are returned after reloading or using another device.

`mobile/supabase/schema.sql` creates empty application tables. Existing DynamoDB or in-memory records are not automatically migrated; the legacy backend is retained and unchanged.

The interactive Leaflet map uses OpenStreetMap tiles (with attribution), so the base map requires an internet connection but no paid map API key. Selected publication photos are shown on the publishing device but are not uploaded to object storage or shared between devices. The web conversation list is temporary; chat persistence is not connected to the web demo flow.

The home feed's sample listing photos are bundled locally from Unsplash: [Grant Ritchie](https://unsplash.com/photos/QvTJYfO93-c) (ceramic tile), [Patrick Robert Doyle](https://unsplash.com/photos/yVRn-d6JGzo) (lumber), [Alejandro Barba](https://unsplash.com/photos/4b3SSh8XyN8) (construction blocks), and [Theme Photos](https://unsplash.com/photos/Cl-OpYWFFm0) (paint roller).

### Android Emulator
Use:

```text
http://10.0.2.2:3001
```

### iOS Simulator
Use:

```text
http://localhost:3001
```

### Physical device
Use your computer local IP:

```text
http://IP_LOCAL_DE_LA_COMPUTADORA:3001
```

## Vercel web persistence API

The web deployment exposes these same-origin routes through `mobile/api/[...path].ts`:

- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/auth/me
- GET /api/materials and POST /api/materials
- GET /api/requests and POST /api/requests
- GET /api/matches

## Legacy backend API endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout

### Materials
- GET /api/materials
- GET /api/materials/:id
- POST /api/materials
- PATCH /api/materials/:id
- DELETE /api/materials/:id
- GET /api/materials/search
- POST /api/materials/:id/interest

`GET /api/materials` accepts `q`, `category`, `condition`, `location`, `latitude`, `longitude`, and `radiusKm` query parameters.

### Requests
- GET /api/requests
- GET /api/requests/:id
- POST /api/requests
- PATCH /api/requests/:id
- DELETE /api/requests/:id

### Matches
- GET /api/matches
- POST /api/matches/:id/interest

### Favorites
- GET /api/favorites
- POST /api/favorites/:materialId
- DELETE /api/favorites/:materialId

### Users
- GET /api/users/me
- PATCH /api/users/me

### AI
- POST /api/ai/classify-material
- POST /api/ai/find-matches

## Sample data

The seed command loads sample users, materials, requests, and match suggestions for local development so the app is not empty. The Lambda handler does not seed demo records in production. Creating a request or material also calculates matches from persisted records using the existing backend matching logic.

## Persistence and photos

The legacy mobile backend continues to use DynamoDB when `DYNAMODB_ENABLED=true` and hydrates/writes these tables:

- `RebuildUsers`
- `RebuildMaterials`
- `RebuildRequests`
- `RebuildFavorites`
- `RebuildMatches`
- `RebuildConversations`
- `RebuildMessages`

Without that flag, the legacy backend intentionally uses an in-memory store for local development. The web version uses the separate Supabase schema and Vercel functions described above; it does not depend on the legacy backend's in-memory store or a deployed Lambda.

The mobile MVP compresses selected images through Expo Image Picker. The web flow does not upload image bytes or local URIs to DynamoDB. A selected photo is therefore available immediately on the publishing device, but is not yet a durable cross-device image URL. Production image persistence still requires an object-storage upload (for example an S3 presigned upload) before relying on photographs across devices.

## Troubleshooting

- If the app cannot reach the API, confirm EXPO_PUBLIC_API_URL.
- If cameras or location are denied, the app still works with fallback flows.
- For the Vercel web app, check the three `SUPABASE_*` variables in the Vercel Function environment.
- For the legacy AWS backend only, configure `JWT_SECRET` and keep `DYNAMODB_ENABLED=true` with an execution role that can read/write the `ReBuild*` tables.

## Notes

This is the first functional MVP for Rebuild and intentionally avoids heavier features beyond the requested scopes.
