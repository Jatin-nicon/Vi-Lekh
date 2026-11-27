"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Heading,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  Loader2,
  RemoveFormatting,
  Strikethrough,
  TextCursorInput,
  Type,
  Underline,
  X,
} from "lucide-react";
import {
  activeFormats,
  alignOf,
  setBlockAlign,
  type Align,
  clearFormatting,
  selectionIn,
  selectRange,
  setHighlight,
  setLink,
  setTextColor,
  toggleFormat,
  type ActiveFormats,
  type InlineFormat,
} from "@/lib/editor/inline-format";
import { HIGHLIGHTS, TEXT_COLORS } from "@/lib/editor/format-palette";

const NONE: ActiveFormats = { bold: false, italic: false, underline: false, strike: false, link: null, color: null, highlight: null };

/** The block types the bar offers (design D12). */
export const BLOCK_TYPES = [
  { tag: "p", label: "Normal text" },
  { tag: "h1", label: "Heading 1" },
  { tag: "h2", label: "Heading 2" },
  { tag: "h3", label: "Heading 3" },
] as const;
export type BlockTag = (typeof BLOCK_TYPES)[number]["tag"];

const FIRST = "Click text on the page first.";

/**
 * The bar above the Page view (design D4, D11, D12): always shown and
 * available. Text box and Image add a part; the block type changes the part
 * being edited or adds a new one; text formats act on the part being edited.
 * Its buttons don't take focus, so the selection stays put.
 */
export function FormatBar({
  element,
  onTextBox,
  onImage,
  imageBusy = false,
  onBlockType,
}: {
  element: HTMLElement | null;
  onTextBox?: () => void;
  onImage?: () => void;
  imageBusy?: boolean;
  /** Changes the part being edited to this type, or adds a new part of it when none is being edited. */
  onBlockType?: (tag: BlockTag) => void;
}) {
  const [active, setActive] = useState<ActiveFormats>(NONE);
  const [align, setAlign] = useState<Align>("left");
  const [menu, setMenu] = useState<"color" | "highlight" | "type" | null>(null);
  const [linking, setLinking] = useState<{ range: Range; url: string } | null>(null);
  // A hint belongs to the part it was given for, so it goes when editing moves on.
  const [hintState, setHintState] = useState<{ text: string; for: HTMLElement | null } | null>(null);
  const hint = hintState && hintState.for === element ? hintState.text : null;
  const setHint = (text: string | null) => setHintState(text ? { text, for: element } : null);
  const linkInput = useRef<HTMLInputElement>(null);
  const blockTag = element?.tagName.toLowerCase() ?? null;
  const blockLabel = BLOCK_TYPES.find((t) => t.tag === blockTag)?.label ?? (blockTag && /^h[4-6]$/.test(blockTag) ? `Heading ${blockTag[1]}` : element ? "Other" : "Normal text");

  // Keep the pressed buttons in step with the selection.
  useEffect(() => {
    if (!element) return;
    const update = () => {
      const range = selectionIn(element);
      setActive(range ? activeFormats(element, range) : NONE);
      setAlign(alignOf(element));
    };
    update();
    document.addEventListener("selectionchange", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      setActive(NONE);
      setMenu(null);
      setLinking(null);
    };
  }, [element]);

  useEffect(() => {
    if (linking) linkInput.current?.focus();
  }, [linking]);

  /** Runs a change on the selected text; keeps it selected afterwards. */
  const withSelection = (change: (el: HTMLElement, range: Range) => Range | null) => {
    if (!element) return setHint(FIRST);
    const range = selectionIn(element);
    if (!range || range.collapsed) {
      setHint("Select some text in the part you're editing first.");
      return;
    }
    setHint(null);
    const next = change(element, range);
    if (next) selectRange(next);
    setActive(activeFormats(element, next ?? range));
  };

  const toggle = (f: InlineFormat) => withSelection((el, r) => toggleFormat(el, r, f));

  const setAlignment = (value: Align) => {
    if (!element) return setHint(FIRST);
    setAlign(setBlockAlign(element, value));
  };

  /** Opens a colour menu, or says to click text first. */
  const openMenu = (which: "color" | "highlight") => {
    if (!element) return setHint(FIRST);
    setMenu((m) => (m === which ? null : which));
  };

  const pickType = (tag: BlockTag) => {
    setMenu(null);
    if (element && !BLOCK_TYPES.some((t) => t.tag === blockTag) && !/^h[4-6]$/.test(blockTag ?? "")) {
      setHint("Only paragraphs and headings can change type.");
      return;
    }
    setHint(null);
    onBlockType?.(tag);
  };

  const startLink = () => {
    if (!element) return setHint(FIRST);
    const range = selectionIn(element);
    if (active.link && range) {
      // Already a link: remove it.
      const next = setLink(element, range, null);
      if (next) selectRange(next);
      setActive(activeFormats(element, next ?? range));
      return;
    }
    if (!range || range.collapsed) {
      setHint("Select the text to turn into a link first.");
      return;
    }
    setHint(null);
    setLinking({ range: range.cloneRange(), url: "https://" });
  };

  const finishLink = (save: boolean) => {
    if (!element || !linking) return;
    const { range, url } = linking;
    element.focus();
    if (!save) {
      selectRange(range);
      setLinking(null);
      return;
    }
    try {
      const next = setLink(element, range, url);
      selectRange(next ?? range);
      setLinking(null);
      setHint(null);
    } catch (err) {
      setHint(err instanceof Error ? err.message : "That link can't be used.");
      linkInput.current?.focus();
    }
  };

  const btn = (on: boolean) =>
    `inline-flex items-center justify-center gap-1 h-7 min-w-7 px-1.5 rounded-md text-xs cursor-pointer disabled:opacity-40 disabled:cursor-default ${
      on ? "bg-[#DBEAFE] text-[#1D4ED8] dark:bg-[#1E3A8A]/50 dark:text-[#BFDBFE]" : "hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
    }`;
  const sep = <span className="w-px h-5 bg-[#E8E3D9] dark:bg-[#33312E]" aria-hidden />;
  const keep = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      data-vl-keep-editing=""
      className="sticky top-16 z-30 flex flex-wrap items-center gap-1 p-1.5 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5]/95 dark:bg-[#21201E]/95 backdrop-blur shadow-sm text-[#2D2926] dark:text-[#E3DFD7]"
    >
      <div className="flex flex-wrap items-center gap-0.5" onPointerDown={keep} onMouseDown={keep}>
        <button type="button" className={btn(false)} onClick={() => onTextBox?.()} title="Add a text box after the part you last clicked" aria-label="Text box">
          <TextCursorInput className="w-3.5 h-3.5" /> Text box
        </button>
        <button type="button" className={btn(false)} disabled={imageBusy} onClick={() => onImage?.()} title="Add an image after the part you last clicked" aria-label="Image">
          {imageBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />} Image
        </button>
        {sep}
        <div className="relative">
          <button type="button" className={`${btn(menu === "type")} min-w-28 justify-between`} onClick={() => setMenu((m) => (m === "type" ? null : "type"))} title="Text type" aria-label="Text type" aria-haspopup="menu" aria-expanded={menu === "type"}>
            <Heading className="w-3.5 h-3.5" /> <span className="flex-1 text-left">{blockLabel}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {menu === "type" && (
            <div role="menu" aria-label="Text type" className="absolute left-0 top-full mt-1 z-40 flex flex-col p-1 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] shadow-lg min-w-36">
              {BLOCK_TYPES.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  role="menuitemradio"
                  aria-checked={blockTag === t.tag}
                  onClick={() => pickType(t.tag)}
                  className={`flex items-center gap-2 px-2 py-1 rounded-md text-left cursor-pointer hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27] ${t.tag === "p" ? "text-xs" : t.tag === "h1" ? "text-base font-bold" : t.tag === "h2" ? "text-sm font-bold" : "text-xs font-bold"}`}
                >
                  <span className="w-3.5">{blockTag === t.tag && <Check className="w-3.5 h-3.5" />}</span>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {sep}
        <button type="button" className={btn(active.bold)} aria-pressed={active.bold} onClick={() => toggle("bold")} title="Bold (Ctrl+B)" aria-label="Bold">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btn(active.italic)} aria-pressed={active.italic} onClick={() => toggle("italic")} title="Italic (Ctrl+I)" aria-label="Italic">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btn(active.underline)} aria-pressed={active.underline} onClick={() => toggle("underline")} title="Underline (Ctrl+U)" aria-label="Underline">
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btn(active.strike)} aria-pressed={active.strike} onClick={() => toggle("strike")} title="Strikethrough" aria-label="Strikethrough">
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        {sep}
        <div className="relative">
          <button type="button" className={btn(menu === "color")} onClick={() => openMenu("color")} title="Text colour" aria-label="Text colour" aria-expanded={menu === "color"}>
            <Type className="w-3.5 h-3.5" style={{ color: active.color ?? undefined }} />
            <ChevronDown className="w-3 h-3" />
          </button>
          {menu === "color" && (
            <Swatches
              label="Text colour"
              colors={TEXT_COLORS}
              current={active.color}
              kind="text"
              onPick={(value) => {
                withSelection((el, r) => setTextColor(el, r, value));
                setMenu(null);
              }}
            />
          )}
        </div>
        <div className="relative">
          <button type="button" className={btn(menu === "highlight")} onClick={() => openMenu("highlight")} title="Highlight" aria-label="Highlight" aria-expanded={menu === "highlight"}>
            <Highlighter className="w-3.5 h-3.5" />
            <ChevronDown className="w-3 h-3" />
          </button>
          {menu === "highlight" && (
            <Swatches
              label="Highlight"
              colors={HIGHLIGHTS}
              current={active.highlight}
              kind="highlight"
              onPick={(value) => {
                withSelection((el, r) => setHighlight(el, r, value));
                setMenu(null);
              }}
            />
          )}
        </div>
        <button type="button" className={btn(!!active.link || !!linking)} aria-pressed={!!active.link} onClick={startLink} title={active.link ? "Remove link" : "Link"} aria-label={active.link ? "Remove link" : "Link"}>
          {active.link ? <Link2Off className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
        </button>
        {sep}
        {(
          [
            ["left", AlignLeft, "Align left"],
            ["center", AlignCenter, "Centre"],
            ["right", AlignRight, "Align right"],
            ["justify", AlignJustify, "Justify"],
          ] as const
        ).map(([value, Icon, label]) => (
          <button key={value} type="button" className={btn(!!element && align === value)} aria-pressed={!!element && align === value} onClick={() => setAlignment(value)} title={label} aria-label={label}>
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        {sep}
        <button type="button" className={btn(false)} onClick={() => withSelection((el, r) => clearFormatting(el, r))} title="Clear formatting" aria-label="Clear formatting">
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>
      </div>
      {linking && (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            finishLink(true);
          }}
        >
          <input
            ref={linkInput}
            type="url"
            value={linking.url}
            onChange={(e) => setLinking({ ...linking, url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                finishLink(false);
              }
            }}
            aria-label="Link address"
            className="h-7 w-56 rounded-md border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] px-2 text-xs focus:outline-none focus:border-[#2563EB]"
          />
          <button type="submit" className={btn(false)} aria-label="Add link" title="Add link">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={btn(false)} onMouseDown={keep} onClick={() => finishLink(false)} aria-label="Cancel link" title="Cancel">
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
      <span className="px-1.5 text-[11px] text-[#757069] dark:text-[#948F86]" role="status">
        {hint ?? (element ? "" : "Click text on the page to edit or format it.")}
      </span>
    </div>
  );
}

function Swatches({
  label,
  colors,
  current,
  kind,
  onPick,
}: {
  label: string;
  colors: { name: string; value: string }[];
  current: string | null;
  kind: "text" | "highlight";
  onPick: (value: string | null) => void;
}) {
  return (
    <div role="menu" aria-label={label} className="absolute left-0 top-full mt-1 z-40 flex items-center gap-1 p-1.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] shadow-lg">
      {colors.map((c) => (
        <button
          key={c.value}
          type="button"
          role="menuitem"
          onClick={() => onPick(c.value)}
          title={c.name}
          aria-label={c.name}
          className={`h-6 w-6 rounded-md border cursor-pointer flex items-center justify-center text-xs font-bold ${current === c.value ? "border-[#2563EB] ring-2 ring-[#2563EB]/40" : "border-[#E8E3D9] dark:border-[#33312E]"}`}
          style={kind === "text" ? { color: c.value } : { background: c.value }}
        >
          {kind === "text" ? "A" : ""}
        </button>
      ))}
      <button type="button" role="menuitem" onClick={() => onPick(null)} title={kind === "text" ? "No colour" : "No highlight"} aria-label={kind === "text" ? "No colour" : "No highlight"} className="h-6 px-1.5 rounded-md border border-[#E8E3D9] dark:border-[#33312E] text-[11px] cursor-pointer">
        None
      </button>
    </div>
  );
}
