# Life Hack Reminder

## Overview

Life Hack Reminder is a mobile-first app (built with Expo/React Native) that helps users remember important life tips, phrases, and routines by periodically "delivering" them and collecting feedback. Users can save up to 10 active items across three types: **Life Cards** (inspirational phrases with optional images), **Nudges** (short reminder texts), and **Playbooks** (step-by-step routines). Items are scored based on user feedback (Yes/No/Skip), so effective reminders surface more often while unhelpful ones get cooldown penalties. The UI is in Japanese.

The app runs primarily as an Expo Web app on Replit, with the architecture supporting future deployment to iOS/Android. Data is stored locally on-device using AsyncStorage. A lightweight Express backend exists but is mostly scaffolding — the core app logic is entirely client-side.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, TypeScript
- **Routing**: `expo-router` v6 with file-based routing in the `app/` directory. Stack navigation with screens for: home (`index`), add item (`add`), edit item (`edit`), delivery/doom scroll view (`doom`), settings, delete box, and replace-select modal.
- **State Management**: React Context (`lib/AppContext.tsx`) provides all app state and actions. No Redux or external state library.
- **Data Persistence**: `@react-native-async-storage/async-storage` stores all app state as a single JSON blob under one key. Loaded on app start, saved on every state change.
- **Fonts**: Noto Sans JP (Regular, Medium, Bold) via `@expo-google-fonts/noto-sans-jp` for Japanese text rendering.
- **Styling**: Plain `StyleSheet.create()` with a centralized color palette in `constants/colors.ts`. No CSS-in-JS library or theme provider.
- **Key UI Libraries**: `expo-linear-gradient`, `expo-image`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-keyboard-controller`

### Core Data Model (`lib/types.ts`)

- **ActiveItem**: Up to 10 items with type (`lifeCard`, `nudge`, `playbook`), content, creation/update timestamps, and feedback stats (yesCount, noCount, skipCount, displayCount, lastDeliveredAt)
- **DeleteBoxItem**: Extends ActiveItem with `deletedAt` timestamp; items auto-purge after 30 days
- **DeliveryRecord**: Tracks each time an item was shown, whether feedback was requested, and the user's response
- **AppState**: Single object containing activeItems, deleteBox, deliveries, and last delivery tracking

### Delivery Algorithm (`lib/delivery.ts`)

- Items receive cooldown periods based on negative feedback (noCount): 5-11 days
- Scoring: `effectiveScore = yesCount - 0.25 * skipCount`
- Selection: highest-scoring eligible items, random tiebreaker
- Feedback prompted every 3rd display of an item

### Backend (Express Server)

- **Framework**: Express 5 with TypeScript, compiled via esbuild
- **Purpose**: Mostly scaffolding. Serves the static web build in production. Has CORS setup for Replit domains.
- **Routes**: `server/routes.ts` is essentially empty — no API endpoints are actively used
- **Database Schema**: `shared/schema.ts` defines a basic `users` table with Drizzle ORM + PostgreSQL, but this is boilerplate and not used by the app's core functionality
- **Storage Layer**: `server/storage.ts` has an in-memory user storage implementation (unused by the app)

### Build & Deploy

- **Development**: Two processes — Expo dev server (`expo:dev`) and Express server (`server:dev` via tsx)
- **Production**: Static Expo web build (`expo:static:build`) served by Express (`server:prod`)
- **Database**: Drizzle config points to PostgreSQL via `DATABASE_URL`, but the app doesn't currently use the database for its core features

### Key Screens

| Route | Purpose |
|-------|---------|
| `/` (index) | Home - lists all active items with cooldown indicators |
| `/add` | Create new item (Life Card, Nudge, or Playbook) |
| `/edit` | Edit existing item |
| `/doom` | Full-screen delivery view with feedback buttons |
| `/settings` | Notification schedule display (Mon/Wed/Fri at 9:00) |
| `/delete-box` | View/restore/permanently delete removed items |
| `/replace-select` | Modal to choose which item to replace when at capacity |

## External Dependencies

- **AsyncStorage** (`@react-native-async-storage/async-storage`): Client-side persistent storage, works on web and native
- **PostgreSQL** (via Drizzle ORM): Configured but not actively used by core app logic. Schema exists for a `users` table. The `DATABASE_URL` environment variable is required by `drizzle.config.ts`
- **Expo Services**: Standard Expo build toolchain, no EAS or cloud services used
- **No external APIs**: No authentication, no cloud sync, no third-party API calls. The app is fully offline/local-first
- **TanStack React Query**: Included and configured (`lib/query-client.ts`) with API helper functions, but not actively used since the app is local-only