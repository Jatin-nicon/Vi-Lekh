# Design

## Context

The reader interface (`/notes`) combines hierarchical course navigation with a multi-page PDF viewer and interactive vector drawing overlay. Currently:
- The sidebar wrapper is a standard block in a `flex flex-col md:flex-row` container. On mobile viewports (`< 768px`), this places the entire course syllabus above the PDF, requiring the user to scroll through dozens of modules before reaching the note.
- On desktop viewports (`>= 768px`), the sidebar does not have sticky positioning or height constraints, so scrolling down a 50-page PDF document scrolls the syllabus off-screen.
- The PDF viewer initializes with a hardcoded `scale = 1.2`, rendering standard PDF pages at ~734px–960px width, causing horizontal overflow and forcing horizontal scrolling on mobile devices.
- The sticky annotation toolbar uses `flex-wrap` and can break into jagged multiple rows on screens narrower than 640px.

See `proposal.md` for motivation and `specs/` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Provide a persistent, independent split-scrolling syllabus sidebar on desktop (`>= 768px`) using CSS sticky positioning.
- Implement an off-canvas slide-over drawer for mobile viewports (`< 768px`) with an intuitive trigger button in the note header, backdrop blur, and auto-dismiss upon note selection.
- Automatically compute fit-to-width PDF scaling on mobile viewports so documents fit the screen width without horizontal overflow.
- Ensure the floating annotation toolbar maintains clean horizontal dock containment on mobile screens with touch scrolling.

**Non-Goals:**
- Modifying PDF annotation coordinate geometry (all annotations remain normalized to 1:1 PDF points).
- Altering the syllabus editing experience in `/studio`.
- Changing server-side note fetching or Firestore database schemas.

## Decisions

### Decision 1: CSS Sticky Split-Scrolling for Desktop
- **Choice**: Apply `sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain` to the desktop sidebar container, and `flex-1 min-w-0` to the main reader area.
- **Rationale**: Leverages native browser sticky layout relative to the `h-16` application navbar. Requires zero JavaScript scroll event listeners and provides smooth, native 60fps scrolling for both the syllabus and the PDF document independently.
- **Alternatives Considered**: Fixed positioning (`fixed left-0 top-16`) was rejected because it removes the element from the document flow, requiring brittle margin offsets and complex resizing logic.

### Decision 2: Mobile Slide-Over Drawer with Top Header Trigger
- **Choice**: Manage `isMobileDrawerOpen` state in `src/app/notes/page.tsx`. On `< md`:
  - Hide the static sidebar (`hidden md:block`).
  - Render a mobile drawer (`fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] bg-parchment-50 shadow-2xl transition-transform duration-300`) with a backdrop overlay (`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm`).
  - Add a `[=] Syllabus` pill button in the note breadcrumb header on mobile (`md:hidden`).
  - Pass an `onSelectNote` callback to `CourseSidebar` to automatically close the drawer when a note link is tapped.
- **Rationale**: Reuses the exact same `CourseSidebar` component, guarantees zero layout shift, and gives mobile users 100% viewport width for reading lecture notes by default.
- **Alternatives Considered**: An accordion collapse above the document was rejected because expanding a 15-module syllabus pushes the document far down the viewport.

### Decision 3: Viewport-Adaptive PDF Fit-to-Width Scaling
- **Choice**: In `src/components/pdf/pdf-viewer.tsx`, detect viewport width on mount (e.g., via `window.innerWidth` and container bounding rect). When viewport width is `< 768px`, calculate:
  $$\text{scale} = \frac{\text{containerWidth} - \text{padding}}{\text{pageWidth}}$$
  Default standard PDF page width is 612pt (US Letter) or 595pt (A4). Clamp the calculated scale between `0.5` and `2.0`.
- **Rationale**: PDF.js canvas must render at high DPI (`viewport.width * devicePixelRatio`) to keep vector text sharp. Pure CSS width stretching results in blurry rendering or vector misalignment. Dynamic initial scale ensures crisp text and 100% viewport fit.
- **Alternatives Considered**: Keeping a fixed 1.0 or 0.8 scale was rejected because 0.8 still overflows narrow 360px–375px screens, while 0.5 is too small for larger mobile screens.

### Decision 4: Solid Flush Annotation Toolbar with Mobile Scroll Affordances
- **Choice**: Refactor `AnnotationToolbar` container styling to anchor flush directly below the application header at `top-16` without a detached floating gap. Use 100% solid background (`bg-[#FAF8F5] dark:bg-[#21201E]`) with crisp borders (`border border-[#E8E3D9] dark:border-[#33312E]`) and elevated shadow, eliminating document bleed-through during scroll. On mobile, use `overflow-x-auto` with a subtle visual fade gradient on the trailing edge to signify hidden scrollable tools.
- **Rationale**: Prevents document text and equations from peeking through translucent pills, eliminates confusing mid-air floating gaps, and ensures users know rightmost actions (color palette, undo/redo, Save PDF) are reachable.
- **Alternatives Considered**: Semi-transparent pill (`backdrop-blur` with 90% opacity) was rejected because black text in scrolled documents created visual noise underneath toolbar icons.

### Decision 5: Compact Mobile Navbar Layout
- **Choice**: In `src/app/notes/page.tsx`, hide text labels for secondary header buttons on narrow screens (`< sm`), using `hidden sm:inline` for "All Courses" and "Sign In", keeping only the icon and padding.
- **Rationale**: Keeps total header content width under 320px on mobile, leaving plenty of clearance between the Syllabus toggle, brand title, and user profile.
- **Alternatives Considered**: Dropping "All Courses" entirely was rejected because users still need a quick way to exit back to the catalog.

## Stacking Order and Z-Index Hierarchy

To prevent any menu or toolbar occlusion:
1. `z-50`: Global application navbar and profile dropdown menu (`Navbar`, User Menu).
2. `z-40`: Mobile syllabus slide-over drawer (`CourseSidebar` mobile drawer).
3. `z-30`: Mobile drawer backdrop overlay.
4. `z-20`: Floating sticky annotation toolbar.
5. `z-10`: PDF canvas, text layer, and vector drawing overlays.

## Risks / Trade-offs

- **[Risk] Window resize thrashing during fit-to-width computation**
  → *Mitigation*: Debounce the resize listener (200ms) and only auto-adjust scale on initial mount or orientation change, preserving manual user zoom adjustments during the session.
- **[Risk] Drawer swipe gesture interference with PDF drawing**
  → *Mitigation*: The drawer is only toggled via the explicit `Syllabus` button and closed via backdrop tap or close button; no ambiguous edge-swipe gestures that could intercept pen drawing strokes.

