# Tasks

## 1. Desktop Independent Split Scrolling & Layout Architecture

- [x] 1.1 Refactor `src/components/reader/course-sidebar.tsx` container classes to support sticky split-scrolling with `h-full overflow-y-auto overscroll-contain` and accept an optional `onSelectNote?: () => void` callback to notify parent components upon note selection
- [x] 1.2 Update desktop sidebar wrapper in `src/app/notes/page.tsx` with `sticky top-16 h-[calc(100vh-4rem)] hidden md:block overflow-hidden` and set `<main>` container to `flex-1 min-w-0` so desktop PDF scrolling does not scroll away the syllabus sidebar

## 2. Mobile Syllabus Slide-Over Drawer

- [x] 2.1 Add `isMobileDrawerOpen` state in `src/app/notes/page.tsx` and render a responsive `Syllabus` trigger pill button with menu icon in the reader header visible only on mobile viewports (`md:hidden`)
- [x] 2.2 Implement the off-canvas mobile drawer overlay (`fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] bg-parchment-50 shadow-2xl transition-transform`) with backdrop blur overlay (`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm`), header with close button, and auto-dismiss upon note click

## 3. Viewport-Adaptive PDF Fit-to-Width Scaling

- [x] 3.1 In `src/components/pdf/pdf-viewer.tsx`, implement viewport detection on initial mount to compute `fitToWidthScale` for mobile viewports (`window.innerWidth < 768px`), calculating scale based on container width minus horizontal margins against intrinsic page width (clamped 0.5 to 2.0)
- [x] 3.2 Ensure manual zoom buttons (+ / -) continue to work properly and vector annotation layers scale in exact 1:1 synchronization with the scaled PDF canvas
- [x] 3.3 Add wheel event listener to PDF viewer container intercepting Ctrl/Cmd + wheel scroll gestures with `{ passive: false }` and `e.preventDefault()` to adjust PDF scale (0.4x to 2.5x) smoothly without triggering whole-browser page zoom

## 4. Responsive Annotation Toolbar Dock

- [x] 4.1 Refactor `src/components/reader/annotation-toolbar.tsx` outer and inner containers with `max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar flex-nowrap` and compact padding on mobile screens to prevent multi-row wrapping
- [x] 4.2 Verify tool selectors, color swatches, shape popovers, stroke width selectors, and undo/redo controls remain accessible and fully operational within the scrollable dock

## 5. Verification & End-to-End Build

- [x] 5.1 Run `npm run build` to verify TypeScript type checking and production Next.js build pass with zero compilation errors
- [x] 5.2 Validate responsive layout across mobile (< 768px) and desktop (>= 768px) viewports: confirm desktop sidebar stays pinned during PDF scroll, mobile syllabus drawer toggles and closes smoothly, and PDF fits mobile viewport without horizontal page overflow

## 6. Navbar Compaction & Toolbar Solid Flush Anchoring

- [x] 6.1 Update `src/app/notes/page.tsx` top navbar action controls to hide text labels ("All Courses", "Sign In") on `< sm` viewports (`hidden sm:inline`), keeping icon buttons to eliminate mobile header crowding
- [x] 6.2 Refactor `src/components/reader/annotation-toolbar.tsx` to anchor flush at `top-16`, replace semi-translucent background with 100% solid `bg-[#FAF8F5] dark:bg-[#21201E]`, and add horizontal swipe affordance / fade gradient on mobile
- [x] 6.3 Run `npm run build` and verify that the navbar fits cleanly on 360px-390px mobile screens and the toolbar completely covers document text without bleed-through or detached gaps

## 7. Desktop & Laptop Sidebar Scrollbar Styling

- [x] 7.1 Define `.sidebar-scrollbar` in `src/app/globals.css` with specific thumb-targeted `:hover` and active drag `:active` states (preventing whole-navbar hover triggers), WCAG 3:1 non-text contrast ratios, transparent track, and WebKit/Firefox fallbacks
- [x] 7.2 Apply `.sidebar-scrollbar` and tuned right-side padding (`pl-3 pr-2 py-3`) to syllabus modules and course switcher in `src/components/navigation/course-sidebar.tsx`
- [x] 7.3 Run `npm run build` and verify that the sidebar scrollbar displays cleanly without jarring native OS grey bars across light and dark themes

