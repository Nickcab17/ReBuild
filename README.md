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

- authentication with JWT
- home feed and material discovery
- publish available materials
- publish material requests
- saved favorites
- match suggestions based on category, name, quantity, and location
- AI-assisted classification and keyword extraction
- approximate map view and location filters
- secure token storage with Expo Secure Store

## Architecture

- mobile: Expo + React Native + Expo Router
- backend: Node.js + TypeScript + Express + Serverless + Lambda + API Gateway
- datastore: DynamoDB-ready models with in-memory fallback for local development

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

From the project root:

```bash
npm install
```

Then install the backend dependencies:

```bash
cd backend
npm install
```

Then install the mobile app dependencies:

```bash
cd ../mobile
npm install
```

## Environment variables

Copy the example file and fill in values:

```bash
cp .env.example .env
```

The app uses:

- EXPO_PUBLIC_API_URL
- JWT_SECRET
- DYNAMODB_ENABLED (`true` in the deployed Serverless environment; omit or set `false` for local memory mode)
- DYNAMODB_TABLE_PREFIX (defaults to `Rebuild`)
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- OPENAI_API_KEY

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

## API endpoints

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

The seed command loads sample users, materials, requests, and match suggestions so the app is not empty. Creating a request also calculates deterministic matches from category, text keywords, and material availability.

## Persistence and photos

When `DYNAMODB_ENABLED=true`, the backend hydrates and writes these DynamoDB tables:

- `RebuildUsers`
- `RebuildMaterials`
- `RebuildRequests`
- `RebuildFavorites`
- `RebuildMatches`

Without that flag, the backend intentionally uses an in-memory store for local development. The API still uses the authenticated JWT user id and never trusts a frontend-supplied `userId`.

The mobile MVP compresses selected images through Expo Image Picker and sends only the resulting URI in the material payload; it never stores image bytes in DynamoDB. A camera/gallery URI is therefore available immediately on the publishing device, but is not yet a durable cross-device image URL. Production image persistence still requires an object-storage upload (for example an S3 presigned upload) before relying on photographs across devices.

## Troubleshooting

- If the app cannot reach the API, confirm EXPO_PUBLIC_API_URL.
- If cameras or location are denied, the app still works with fallback flows.
- If the backend complains about JWT_SECRET, add it to your environment file.
- If AWS credentials are missing, set `DYNAMODB_ENABLED=false` for the local in-memory fallback.

## Notes

This is the first functional MVP for Rebuild and intentionally avoids heavier features beyond the requested scopes.
