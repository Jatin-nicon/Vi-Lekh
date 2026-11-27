/**
 * Child-index paths in the rendered note (design D2), without parse5, so the
 * reader can use them without loading the source parser.
 */

/** Elements the viewer adds to the rendered page; they are not in the source. */
export const APP_NODES = "[data-vl-page-spacer], [data-vl-overlay], [data-vl-comment]";

/** Child-index path of `el` below `root`, ignoring elements the viewer added. */
export function renderedPath(el: Element, root: Element): number[] | null {
  const path: number[] = [];
  let node: Element | null = el;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    if (!parent) return null;
    const siblings = Array.from(parent.children).filter((c) => !c.matches(APP_NODES));
    const i = siblings.indexOf(node);
    if (i < 0) return null;
    path.unshift(i);
    node = parent;
  }
  return node === root ? path : null;
}

/** The rendered element at a child-index path, skipping the viewer's own nodes; the inverse of `renderedPath`. */
export function elementAtPath(root: Element, path: number[]): Element | null {
  let node: Element = root;
  for (const i of path) {
    const next: Element | undefined = Array.from(node.children).filter((c) => !c.matches(APP_NODES))[i];
    if (!next) return null;
    node = next;
  }
  return node;
}
