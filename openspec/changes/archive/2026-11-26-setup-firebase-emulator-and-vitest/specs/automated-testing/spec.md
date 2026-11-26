# Spec Delta

## Purpose
Defines automated test execution, DOM simulation via jsdom, and unit/component testing capabilities using Vitest and React Testing Library.

## ADDED Requirements

### Requirement: Component and unit test execution via Vitest
The system SHALL execute automated tests using Vitest with full TypeScript, JSX, and DOM simulation support without requiring Next.js dev server processes.

#### Scenario: Running test suites via CLI
- **WHEN** a developer or CI pipeline executes `npm test`
- **THEN** Vitest discovers and runs all test files matching `*.test.ts` and `*.test.tsx`, reporting execution results and exit codes accurately

#### Scenario: Rendering React components in simulated DOM
- **WHEN** a component test renders Next.js/React UI elements with `@testing-library/react`
- **THEN** jsdom provides the simulated browser environment and testing-library matchers evaluate DOM assertions

### Requirement: Test environment path alias and mock configuration
The test runner SHALL resolve root `@/*` import aliases and provide global browser API mocks for isolated test execution.

#### Scenario: Importing project modules using path aliases
- **WHEN** a test file imports modules from `@/lib/...` or `@/components/...`
- **THEN** Vitest resolves the module paths identically to Next.js TypeScript path mappings
