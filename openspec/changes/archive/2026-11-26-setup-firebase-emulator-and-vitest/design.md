# Design

## Context

The repository contains a Next.js 16 frontend and a NestJS 10 backend in `server/` with Prisma ORM and PostgreSQL. Authentication is handled by Firebase Auth on the client and validated via `firebase-admin` in `server/src/auth/firebase-admin.service.ts`.

Currently, developers must have access to a Google Cloud / Firebase project to log in, and there is no automated test runner configured in the root repository. Introducing the Firebase Emulator Suite for authentication and Vitest for testing fulfills local development independence and test automation.

## Goals / Non-Goals

**Goals:**
- Enable developers to run an offline Firebase Auth emulator (`localhost:9099`) with an interactive emulator UI (`localhost:4000`).
- Configure client (`src/lib/firebase/config.ts`) and server (`server/src/auth/firebase-admin.service.ts`) to connect seamlessly to the emulator via environment variables.
- Configure Vitest with `jsdom`, `@testing-library/react`, and `@vitejs/plugin-react` to run fast unit and component tests with path alias resolution.
- Provide scripts (`npm test`, `npm run test:watch`, `npm run emulators:start`) for developer workflows.

**Non-Goals:**
- Emulating Firestore or Firebase Storage (the project uses PostgreSQL/Prisma for data storage).
- Replacing Next.js application bundling with Vite (Next.js handles `npm run dev` and `npm run build`; Vite/Vitest handles test execution).

## Decisions

### 1. Firebase Auth Emulator Configuration
- Add `firebase.json` at the repository root configuring `emulators.auth` on port `9099` and `emulators.ui` on port `4000`.
- *Rationale*: Standardizing on official default ports enables seamless CLI compatibility and prevents configuration drift.

### 2. Client-Side Emulator Connection
- In `src/lib/firebase/config.ts`, conditionally invoke `connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true })` when `process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"` or `process.env.NODE_ENV === "test"`.
- *Rationale*: Keeps local development and automated testing isolated from live cloud resources while ensuring production builds connect to live Firebase.

### 3. Server-Side Emulator Token Verification
- In `server/src/auth/firebase-admin.service.ts`, ensure `FIREBASE_AUTH_EMULATOR_HOST` (e.g., `localhost:9099`) is read from `.env` or process environment.
- *Rationale*: The `firebase-admin` SDK automatically skips external network calls to Google Auth servers and verifies emulator tokens locally when `FIREBASE_AUTH_EMULATOR_HOST` is defined.

### 4. Vitest Test Infrastructure
- Add `vitest.config.ts` using `defineConfig` from `vitest/config` with:
  - `plugins: [react()]` for React 19 JSX transformation.
  - `environment: "jsdom"` for simulated DOM environment.
  - `setupFiles: ["./src/test/setup.ts"]` loading `@testing-library/jest-dom/vitest`.
  - `resolve.alias: { "@": path.resolve(__dirname, "./src") }` matching `tsconfig.json`.
- Add test scripts to `package.json`:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
  - `"test:coverage": "vitest run --coverage"`

## Risks / Trade-offs

- **[Risk] Firebase Emulator Java dependency**: The Firebase CLI Emulator Suite requires Java (JRE 11+) installed on the local system.
  - *Mitigation*: Document prerequisites in documentation, provide mocked auth utilities in Vitest so unit and component tests run without requiring a running Java process or emulator, and support `--only auth`.
- **[Risk] Path alias divergence between Turbopack and Vitest**:
  - *Mitigation*: Explicitly map `@/*` to `./src/*` in `vitest.config.ts` and test-run with both tools.
