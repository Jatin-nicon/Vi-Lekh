# Proposal

## Why

While lecture note annotations now support geometric shapes and text boxes, shapes remain static after placement with fixed transparent interiors and fixed stroke widths, and text boxes lack inline typography styling (bold, italic, font sizing). Providing interactive shape repositioning and resizing, shape fill opacity, stroke width controls, and a dynamic contextual toolbar elevates Vi-Lekh into a versatile digital notebook without visual clutter.

## What Changes

- **Movable & Resizable Geometric Shapes**: Allow users to click any existing drawn shape (rectangle, circle, line, arrow, star, cloud) to display an active selection frame with a `[Move]` handle and corner resize anchors to reposition and scale the shape.
- **High-Visibility Selection & Resize Handles**: Style shape and text box selection frames with high-contrast dual-tone borders (vibrant accent stroke with contrasting white halo outline and drop shadow) and solid filled corner anchors (`bg-[#2563EB]` with crisp white border and drop shadow), guaranteeing crisp visibility against white PDF pages, dark themes, and colored fills.
- **Shape Fill Opacity**: Add fill opacity controls (`0% Outline`, `20% Translucent Tint`, `50% Medium`, `100% Solid`) to geometric shapes, styled using the shape's stroke color and baked natively into the exported vector PDF. Fill opacity controls are suppressed from the default drawing toolbar until the user draws or selects a shape, appearing strictly within the contextual Shape Styling Mode.
- **Stroke Width Controls**: Add stroke width options (`1.5pt Thin`, `2.5pt Medium`, `4.0pt Thick`) selectable via a dropdown popover menu on the Pen tool button with a down arrow (`ChevronDown`), and via stroke pills in the contextual Shape Styling Mode.
- **Dynamic Contextual Toolbar**:
  - **Text Mode**: When a text box is selected or focused, the sticky toolbar dynamically morphs to present typography controls (`[Done]`, `[B] Bold`, `[I] Italic`, `[Font Size: 12/14/18/24pt]`, color swatches, `[Delete Box]`).
  - **Shape Mode**: When an existing shape is selected (or immediately upon finishing a shape drag), the toolbar morphs to present shape property controls (`[Done]`, `[Stroke Width]`, `[Fill Opacity]`, color swatches, `[Delete Shape]`).
  - **Default Mode**: Shows standard drawing tools in a clean, compact bar without premature opacity options or horizontal pill expansions.
- **Vector PDF Baking Updates**: Extend `src/lib/pdf/pdf-export.ts` to bake bold and italic text styles using `StandardFonts` (`Helvetica`, `HelveticaBold`, `HelveticaOblique`, `HelveticaBoldOblique`) and shape fill opacities into the generated PDF byte stream.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `note-annotations`: Add interactive moving and resizing for geometric shapes, fill opacity selection, pen/shape stroke width controls, and contextual dynamic toolbar transformations for text and shape styling.

## Impact

- `src/components/reader/annotation-layer.tsx`: Extend `AnnotationShape` with `fillOpacity` and `width`, extend `AnnotationTextBox` with `fontSize`, `bold`, and `italic`. Implement shape selection, drag-to-move, corner-drag-to-resize, and typography rendering.
- `src/components/reader/annotation-toolbar.tsx`: Implement dynamic toolbar modes (Default, Text Styling, Shape Styling) with stroke width, fill opacity, bold, italic, and font size controls.
- `src/components/reader/note-reader.tsx`: Coordinate active shape and text box selection states between toolbar and annotation layer.
- `src/lib/pdf/pdf-export.ts`: Bake `HelveticaBold` / `HelveticaOblique` fonts and shape fill opacities into output PDF binary.

