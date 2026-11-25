/**
 * localStorage keys for per-page annotations.
 *
 * - "pdf": PDF pages in PDF intrinsic units (unchanged legacy key family).
 * - "html-a4": the paged HTML layout in A4 page units (794 × 1123), design D3.
 *
 * The pre-pagination free-width HTML keys (`vilekh_annotations_<note>` etc.)
 * are listed in LEGACY_HTML_KEYS. They are never written by the html-a4
 * layout and are kept, not deleted (see task 6.4).
 */

export type AnnotationLayout = "pdf" | "html-a4";
export type AnnotationKind = "annotations" | "shapes" | "textboxes";

const PREFIX: Record<AnnotationLayout, string> = {
  pdf: "vilekh_pdf",
  "html-a4": "vilekh_html_a4",
};

export function annotationStorageKey(
  layout: AnnotationLayout,
  kind: AnnotationKind,
  noteId: string,
  pageNumber: number,
): string {
  return `${PREFIX[layout]}_${kind}_${noteId}_page_${pageNumber}`;
}

/** Old single-layer keys written before per-page layouts existed. */
export function legacyAnnotationKey(kind: AnnotationKind, noteId: string): string {
  return `vilekh_${kind}_${noteId}`;
}

export const ANNOTATION_KINDS: AnnotationKind[] = ["annotations", "shapes", "textboxes"];
