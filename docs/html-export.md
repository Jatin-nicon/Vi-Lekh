# HTML version → PDF export

The reader's **Save PDF** button in the Web (HTML) view prints the note's fixed
A4 pages with the reader's annotations through the browser's print engine
(design D4 in `openspec/changes/html-contributions-and-version-history/design.md`).
The code is in `src/lib/pdf/html-print-export.ts`.

How it works, in short:

- Each printed page is a 210 × 297 mm window (`@page { size: A4; margin: 0 }`)
  holding a copy of the paginated note shifted by `n × 1147px`, so the page
  breaks are the on-screen pages.
- Each window also holds that page's annotation layer, plus the layers of the
  neighbouring pages, so a mark that crosses a page break prints its part on
  each page.
- Text stays real text (selectable, searchable). Annotations stay SVG vectors.
- In the print dialog choose **Save as PDF**, paper **A4**, margins
  **None/Default** and keep **Background graphics** on for callout colours.

## Browser results

Checked with `/dev/reader-check` (dev builds only): a 4-page sample note with
one stroke along a line of text and one stroke crossing the page 1/2 break.
The PDF was produced by the browser's own print engine and inspected with
pdf.js (page count, first text on each page, drawing operators).

| Browser | Version | Pages (screen / PDF) | Page breaks match | Text selectable | Ink vector, on its text | Crossing stroke split | Result |
|---|---|---|---|---|---|---|---|
| Chrome (Windows) | 157.0.8103.79 | 4 / 4 | Yes (p2 "Section 1", p3 "Section 4", p4 "Section 7") | Yes | Yes, 0 raster images | Yes | Pass |
| Edge (Windows) | 158.0.4370.33 | 4 / 4 | Yes (same as Chrome) | Yes | Yes, 0 raster images | Yes | Pass |
| Firefox | — | — | — | — | — | — | **Not yet checked** |
| Safari (macOS) | — | — | — | — | — | — | **Not yet checked** |

Differences found so far: none between Chrome and Edge (same engine).

### Still to check

Firefox and Safari use their own print engines and have not been tested yet
(neither is available on the machine used for the checks above). To check one:

1. Run `npm run dev` and open `/dev/reader-check`.
2. Draw a stroke along a line of the first paragraph and one across the gap
   between page 1 and page 2.
3. Click **Save PDF**, save as PDF with A4 paper and no margins.
4. Confirm the PDF has the same number of pages as the screen, page 2 starts
   with "Section 1", the text is selectable, the first stroke sits on its line,
   and the crossing stroke shows its two parts at the bottom of page 1 and the
   top of page 2.
5. Add a row to the table above with the browser version and any differences.
