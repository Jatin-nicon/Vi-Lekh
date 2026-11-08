# Design

## Context

Vi-Lekh's core collaborative notes platform is fully built and verified, but currently employs a high-vibrancy amber/orange theme and edge-to-edge layout that feels like a generic SaaS dashboard rather than a focused, comfortable notebook. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Replace high-saturation accents with an earthy, low-glare Linen Parchment & Terracotta Dust palette.
- Frame the note content as a physical sheet of paper resting on a linen desk canvas.
- Provide comfortable reading typography with generous line height (`leading-relaxed`) and optimal measure (680px - 740px width).
- Integrate soft, unobtrusive math callout panels and warm charcoal code blocks.
- Preserve full functionality of the block editor, hybrid review queue, and diff viewer while adopting the new cozy aesthetic.

**Non-Goals:**
- Adding reading time estimates (explicitly excluded by user preference).
- Changing database schema, RLS policies, or authentication logic.
- Forcing antique serif fonts; typography remains clean, modern, and readable with `Geist Sans` / `Inter`.

## Decisions

### 1. Color Palette: Linen Parchment & Terracotta Dust
- **Canvas / Desk**: `#F5F2EB` (Warm Linen/Oat)
- **Paper Sheet Surface**: `#FAF8F5` (Warm Cream Paper)
- **Reading Ink**: `#2D2926` (Deep Espresso Charcoal — soft, warm, non-straining)
- **Muted Accent**: `#A85D44` (Faded Terracotta / Clay — replaces bright amber `#D97706`)
- **Verified Badges**: `#5D7063` (Muted Olive Sage — replaces neon green)
- **Paper Borders & Hairlines**: `#E8E3D9` (Soft Wheat)
- **Math Callout Box**: `#F7F4EB` with `#E8E3D9` border
- **Code Block Container**: `#252321` (Warm roasted charcoal) with soft pastel syntax colors
- **Dark Mode Counterpart**: Deep Peat (`#181716`), elevated card (`#21201E`), wheat text (`#E3DFD7`), muted terracotta (`#C4785E`).

### 2. Centered "Paper Sheet" Architecture
- Instead of full-width horizontal bands, the note reader is styled as an elevated sheet (`max-w-3xl mx-auto my-6 p-8 sm:p-12 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D9] shadow-sm`).
- Flanked on the left by an unobtrusive course index sidebar that blends seamlessly into the `#F5F2EB` desk background.

### 3. Understated Actions & Badges
- The "Suggest Edits" CTA switches from a solid bright orange pill to a refined, quiet button with a subtle terracotta border and text (`border border-[#A85D44]/40 text-[#A85D44] hover:bg-[#A85D44]/10`).
- Badges use soft watercolor tints (`bg-[#5D7063]/10 text-[#5D7063]`) instead of harsh saturated badges.

### 4. Tailwind CSS v4 Class-Based Dark Mode Variant
- Tailwind CSS v4 defaults to `@media (prefers-color-scheme: dark)`. To enable manual theme toggling via `ThemeToggle`, `src/app/globals.css` must configure `@custom-variant dark (&:where(.dark, .dark *));`.
- This ensures all `dark:...` tailwind classes activate when `<html class="dark">` is set by the toggle button or stored preference.
- Synchronizes `--background`, `--foreground`, and surface variables with component-level `dark:*` utility classes.

## Risks / Trade-offs

- **[Color Contrast & Readability]** → Low-saturation themes risk failing accessibility guidelines if contrast is too low.  
  *Mitigation*: Deep espresso charcoal (`#2D2926`) on cream paper (`#FAF8F5`) yields a contrast ratio exceeding 11:1 (well above the WCAG AAA requirement of 7:1). Faded terracotta (`#A85D44`) maintains >4.5:1 on light backgrounds for text.

