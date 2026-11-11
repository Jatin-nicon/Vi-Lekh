# Design

## Context

The platform now stores and renders pure HTML lecture notes. Notes authored by course creators can be complete standalone HTML documents with custom embedded `<style>` blocks (such as `* { margin: 0; padding: 0 }`, `body { ... }`, or custom color tokens).

See `proposal.md` for the motivation regarding global style leakage and excessive container padding.

## Goals / Non-Goals

**Goals:**
- Provide complete CSS isolation so that note `<style>` tags, resets, and font definitions cannot escape into the host application or corrupt the navbar, sidebar, and theme.
- Eliminate artificial wrapper containers (`max-w-3xl`, `p-8 sm:p-12`) and redundant worksheet headers from `NoteReader` so pure HTML documents render directly as designed.
- Support real-time KaTeX math rendering and educational CSS helpers inside the isolated boundary.
- Ensure seamless print rendering without double sheet borders or clipped pages.

**Non-Goals:**
- Executing arbitrary client-side `<script>` tags inside notes.
- Heavyweight virtual DOM sandboxes (e.g. Docker / WebAssembly); client-side Shadow DOM provides native CSS isolation.

## Decisions

### 1. Shadow DOM Component (`HtmlSandboxedViewer`) vs. Iframe vs. CSS Prefixing
- **Choice**: Implement `HtmlSandboxedViewer` using React and standard Web Components Shadow DOM (`containerRef.current.attachShadow({ mode: "open" })`).
- **Rationale**: 
  - Standard CSS encapsulation guarantees that `<style>` tags, universal `*` resets, and `:root` variables inside the shadow root are strictly isolated and physically cannot leak out into the host page DOM.
  - Unlike `<iframe>`, Shadow DOM elements resize naturally with the document height without requiring brittle `ResizeObserver` / `contentWindow` polling loops or causing scrollbar flashes.
  - Native browser printing respects Shadow DOM contents without requiring separate window print bridges.
- **Alternatives Considered**:
  - `iframe` with `srcDoc`: Introduces height sync delays and print isolation complexity.
  - CSS selector prefixing regex: Brittle with `@media`, keyframes, and multi-line CSS rules.

### 2. Styling Inside the Shadow Root
- **Choice**: Inject KaTeX stylesheet and base typography styles directly into the shadow root header.
- **Rationale**: Because shadow roots do not inherit styles from the parent document's `<head>`, embedding the KaTeX stylesheet link and baseline typography inside the shadow root ensures math formulas and standard HTML elements render with consistent quality.

### 3. Direct Unconstrained Reader Layout
- **Choice**: Refactor `NoteReader` to remove the nested `.print-sheet` box, `p-8 sm:p-12` padding, and hardcoded worksheet blanks (`Name: ____ Date: ____`).
- **Rationale**: Authors of pure HTML lecture notes design their own layouts and page sheets. Stripping outer padding allows the note's own styles to flow naturally on screen and across printed pages.

## Risks / Trade-offs

- **[Risk]** KaTeX font loading latency inside shadow root.
  - **Mitigation**: Preload KaTeX CSS and webfonts in the root document `<head>` (`src/app/layout.tsx`) so that shadow root stylesheets hit the browser cache immediately.
- **[Risk]** Theme synchronization (Light / Dark mode) inside the shadow root.
  - **Mitigation**: Pass the current active theme class (`dark` or `light`) to the shadow root container so author CSS and default prose styles respect the user's theme preference.

