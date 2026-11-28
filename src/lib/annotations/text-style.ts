/**
 * Style of new annotation text boxes. Starts as the lessons' blue handwriting
 * and remembers the reader's last choices on this device.
 */

export type TextBoxFont = "sans" | "hand";

export interface TextBoxStyle {
  font: TextBoxFont;
  color: string;
  fontSize: number;
}

export const DEFAULT_TEXT_STYLE: TextBoxStyle = { font: "hand", color: "#1A5FB4", fontSize: 18 };

const KEY = "vilekh_textbox_style";

export function loadTextStyle(): TextBoxStyle {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<TextBoxStyle>;
    return {
      font: saved.font === "sans" || saved.font === "hand" ? saved.font : DEFAULT_TEXT_STYLE.font,
      color: typeof saved.color === "string" ? saved.color : DEFAULT_TEXT_STYLE.color,
      fontSize: typeof saved.fontSize === "number" ? saved.fontSize : DEFAULT_TEXT_STYLE.fontSize,
    };
  } catch {
    return { ...DEFAULT_TEXT_STYLE };
  }
}

export function saveTextStyle(updates: Partial<TextBoxStyle>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadTextStyle(), ...updates }));
  } catch {
    // Ignore storage errors (e.g. quota)
  }
}
