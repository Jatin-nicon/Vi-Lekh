# Tasks

## 1. Design Tokens & Global CSS

- [x] 1.1 Update CSS custom properties in `src/app/globals.css` with the Linen Parchment & Terracotta Dust palette tokens (Canvas `#F5F2EB`, Paper `#FAF8F5`, Ink `#2D2926`, Terracotta `#A85D44`, Sage `#5D7063`, Wheat `#E8E3D9`) and verify CSS variables
- [x] 1.2 Configure relaxed reading line-height and clean typography classes in `src/app/globals.css`

## 2. Component Redesign for Cozy Paper Desk

- [x] 2.1 Refactor `src/components/reader/note-reader.tsx` to render as a centered, elevated paper sheet with subtle wheat borders and understated ghost actions
- [x] 2.2 Update math equation callout panels in `src/components/reader/note-reader.tsx` and `src/components/editor/block-editor.tsx` with chamomile tints and soft borders
- [x] 2.3 Restyle code blocks with soft charcoal (`#252321`) and subdued syntax coloring across reader and editor components
- [x] 2.4 Update `src/components/navigation/course-sidebar.tsx` with quiet linen styling that blends into the desk background

## 3. Page Layouts & Verification

- [x] 3.1 Update `src/app/page.tsx`, `src/app/edit/page.tsx`, and `src/app/reviews/page.tsx` with the cozy desk canvas and matching theme headers
- [x] 3.2 Verify visual presentation and build cleanly using `npm run build`

## 4. Dark Mode Reactivity & Toggle Fix

- [x] 4.1 Configure `@custom-variant dark (&:where(.dark, .dark *));` in `src/app/globals.css` to enable Tailwind CSS v4 selector-based dark mode
- [x] 4.2 Verify interactive toggling between Cozy Linen and Dark Peat modes across Reader, Editor, and Reviews pages


