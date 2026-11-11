# Spec Delta

## Purpose

Defines the cozy, low-vibrancy Linen Parchment and Terracotta Dust design tokens, centered paper sheet layout, and relaxed reading presentation.

## ADDED Requirements

### Requirement: Cozy Linen Parchment and Terracotta Dust color tokens
The system SHALL style the interface using low-saturation, organic color tokens including soft linen canvas (`#F5F2EB`), warm cream paper sheet (`#FAF8F5`), deep espresso charcoal text (`#2D2926`), and faded terracotta accent (`#A85D44`).

#### Scenario: Display default theme colors
- **WHEN** user loads the application in default mode
- **THEN** system renders the canvas with soft linen background and reading text in deep espresso charcoal without high-vibrancy amber or neon accents

### Requirement: Centered physical paper sheet layout
The reader interface SHALL render note content inside a centered paper-like sheet with subtle border framing and soft shadow elevation on the desk canvas.

#### Scenario: View note on large display
- **WHEN** user opens a note on a desktop browser
- **THEN** system constrains the document content to a centered paper card layout flanked by the linen desk background

### Requirement: Soft callout and code container presentation
The system SHALL present LaTeX math panels and code snippets inside soft, low-contrast containers that blend seamlessly into the warm paper sheet.

#### Scenario: Render math equation callout
- **WHEN** a note contains a mathematical equation block
- **THEN** system displays the formula inside a soft chamomile-tinted panel with subtle wheat borders

### Requirement: Understated ghost action controls
The user interface SHALL present action triggers (such as suggesting edits or navigating history) using subtle, low-vibrancy ghost actions rather than loud saturated pill buttons.

#### Scenario: Display suggest edits trigger
- **WHEN** user views the note action toolbar
- **THEN** system displays the edit trigger in an understated muted terracotta border and text style

### Requirement: Interactive theme toggle between Cozy Linen and Dark Peat
The system SHALL support manual toggling between the default Cozy Linen Parchment theme and the Dark Peat theme via the `.dark` DOM root class, ensuring all `dark:` utility styles and CSS theme variables activate immediately upon toggle regardless of OS media query.

#### Scenario: Toggle theme to Dark Peat
- **WHEN** user clicks the theme toggle button in the header
- **THEN** system applies the `.dark` class to the document root, causing background canvas to switch to Deep Peat (`#181716`), surface cards to elevated charcoal (`#21201E`), and text ink to soft wheat (`#E3DFD7`)


