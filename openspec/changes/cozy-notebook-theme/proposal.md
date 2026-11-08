# Proposal

## Why

The current user interface carries high-vibrancy accent colors (bright amber-600) and sharp borders typical of generic SaaS applications, leading to visual fatigue during extended technical study. Users need a calming, cozy, and organic environment that evokes a physical notebook or high-end editorial publication (such as Bear Notes or Readwise Reader) without loud, distracting colors.

## What Changes

- **Linen Parchment & Terracotta Dust Theme Tokens**: Replace punchy saturated amber accents with muted, earthy terracotta/clay (`#A85D44`), soft linen oat canvas (`#F5F2EB`), warm cream paper sheet surfaces (`#FAF8F5`), deep espresso charcoal ink (`#2D2926`), and muted olive sage (`#5D7063`) for verified badges.
- **Physical Paper Sheet Layout**: Center the reading note within an elevated, rounded paper card with soft warm borders and gentle elevation, simulating a physical study sheet on a wooden/linen desk.
- **Quiet & Understated UI Controls**: Replace solid bright pill buttons with subtle ghost/clay actions, subdued table-of-contents navigation, and quiet sidebar styling.
- **Warm Math & Code Presentation**: Style KaTeX equation panels with soft chamomile/dried grass tints and code blocks with soft charcoal (`#252321`) and subdued pastel syntax highlights.
- **Tailwind CSS v4 Selector-Based Dark Mode**: Configure `@custom-variant dark` so the interactive theme toggle switches immediately between Cozy Linen and Dark Peat across all pages.


## Capabilities

### New Capabilities
- `cozy-theme`: Muted Linen Parchment & Terracotta Dust design tokens, centered paper sheet container, relaxed reading typography, and soft editorial controls.

### Modified Capabilities
None.

## Impact

- **CSS & Design Tokens**: Update `src/app/globals.css` with the new cozy palette variables for light and dark modes.
- **Components**:
  - `src/components/reader/note-reader.tsx`: Render centered paper sheet card, subdued ghost action buttons, and warm callout boxes.
  - `src/components/navigation/course-sidebar.tsx`: Restyle sidebar with quiet linen tones.
  - `src/app/page.tsx`, `src/app/edit/page.tsx`, `src/app/reviews/page.tsx`: Apply cozy desk layout and consistent theme classes.

