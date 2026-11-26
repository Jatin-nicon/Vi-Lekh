# Tasks

## 1. Firebase Emulator Suite Configuration

- [x] 1.1 Add `firebase.json` at repository root configuring Firebase Auth emulator on port 9099 and emulator UI on port 4000
- [x] 1.2 Update `src/lib/firebase/config.ts` to conditionally connect to the Auth emulator when `NEXT_PUBLIC_USE_FIREBASE_EMULATOR="true"` or `NODE_ENV === "test"`
- [x] 1.3 Update `server/src/auth/firebase-admin.service.ts` to support `FIREBASE_AUTH_EMULATOR_HOST` and update `.env.local` and `server/.env.example` with emulator variables
- [x] 1.4 Add `emulators:start` and `emulators:exec` scripts to root `package.json`

## 2. Vite & Vitest Testing Pipeline Setup

- [x] 2.1 Install `vite`, `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, and `@testing-library/jest-dom` in root `package.json` devDependencies
- [x] 2.2 Create `vitest.config.ts` with `jsdom` environment, React plugin, setup files, and `@/*` path alias resolution
- [x] 2.3 Create `src/test/setup.ts` with `@testing-library/jest-dom/vitest` and global mock definitions
- [x] 2.4 Add `test`, `test:watch`, and `test:coverage` scripts to root `package.json`

## 3. Test Suites Implementation & Verification

- [x] 3.1 Create unit tests for utility functions in `src/lib/utils.test.ts` and verify with Vitest
- [x] 3.2 Create unit tests for API client in `src/lib/api/api-client.test.ts` and verify with Vitest
- [x] 3.3 Create component tests in `src/components/theme-toggle.test.tsx` verifying DOM rendering with React Testing Library
- [x] 3.4 Run `npm test` and `npm run build` to verify all test suites and Next.js production builds complete with 0 errors
