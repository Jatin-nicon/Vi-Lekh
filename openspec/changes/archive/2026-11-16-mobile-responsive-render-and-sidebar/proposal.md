# Proposal

## Why

The current lecture note reader layout on `/notes` suffers from critical usability bottlenecks on mobile devices and sub-optimal ergonomics on desktop. On viewports narrower than 768px, the syllabus sidebar stacks vertically above the PDF reader pane, pushing the note content entirely below the fold, while the PDF renders at a fixed 1.2 scale causing severe horizontal overflow and clipping. On desktop screens, scrolling through a multi-page PDF document scrolls the entire window, causing the syllabus sidebar to disappear off-screen instead of remaining pinned for quick navigation. Additionally, the floating annotation toolbar awkwardly wraps into multiple jagged pill rows on narrow mobile screens.

## What Changes

- **Mobile Syllabus Slide-Over Drawer & Compact Navbar**: On viewports under 768px (`< md`), the syllabus navigation sidebar is hidden by default and accessible via a dedicated `Syllabus` trigger button in the reader header, opening as a sliding drawer with a backdrop overlay. Secondary action labels in the header ("All Courses", "Sign In") collapse into icon-only buttons on `< sm` viewports to avoid header crowding.
- **Pinned Desktop Sidebar with Independent Split Scrolling**: On desktop viewports (`>= md`), the syllabus sidebar remains persistently pinned (`sticky top-16 h-[calc(100vh-4rem)]`) with its own independent vertical scroll container, ensuring that scrolling through lengthy PDFs does not scroll away the syllabus hierarchy.
- **Mobile PDF Auto Fit-to-Width**: When viewing notes on mobile/narrow screens, the PDF reader dynamically computes initial zoom scale to fit the document page width to the viewport width, eliminating horizontal scrolling while maintaining crisp rendering and synchronized vector annotation alignment.
- **Solid, Flush Sticky Annotation Toolbar**: The sticky drawing toolbar anchors flush directly beneath the navbar (`top-16`) to eliminate floating detached gaps, uses a 100% opaque solid background (`bg-[#FAF8F5] dark:bg-[#21201E]`) to prevent document text from bleeding through, and provides responsive horizontal touch scrolling with visual scroll affordances on mobile.

## Capabilities

### Modified Capabilities

- `course-catalog`: Modify syllabus navigation requirements to specify responsive layout behavior (pinned desktop split-scrolling sidebar and mobile slide-over drawer).
- `note-annotations`: Modify reader rendering and toolbar requirements to specify viewport-adaptive fit-to-width page scaling and mobile-friendly horizontal dock containment.

## Impact

- **Affected Code**:
  - `src/app/notes/page.tsx`: Layout container structure, mobile syllabus drawer state, and trigger button in reader header.
  - `src/components/reader/course-sidebar.tsx`: Sticky positioning classes, height constraint, and drawer-compatible mobile styling.
  - `src/components/pdf/pdf-viewer.tsx`: Initial zoom calculation based on viewport width (fit-to-width), container resize handling.
  - `src/components/reader/annotation-toolbar.tsx`: Responsive toolbar container styling, horizontal overflow handling, and compact spacing.
- **APIs and Dependencies**: No backend API changes or database migrations required; relies entirely on client-side React state, Lucide icons, and Tailwind CSS.

