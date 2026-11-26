/**
 * Readers' answers to a note's fill-in fields, merged field by field across
 * devices: for each field the most recently changed answer wins.
 *
 * On this device the values live under the form-fields storage key (field key
 * → value) and their change times under `<key>:t` (field key → ISO time).
 */

export type AnswerValue = string | boolean;
export interface Answer {
  v: AnswerValue;
  /** ISO time of the last change. */
  t: string;
}
export type Answers = Record<string, Answer>;

/** Answers written before change times were kept count as oldest. */
const UNKNOWN_TIME = new Date(0).toISOString();

export const FIELDS_CHANGED_EVENT = "vilekh-fields-changed";
export const FIELDS_UPDATED_EVENT = "vilekh-fields-updated";

export const timesKey = (storageKey: string) => `${storageKey}:t`;

function readJson(storage: Storage, key: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readLocalAnswers(storage: Storage, storageKey: string): Answers {
  const values = readJson(storage, storageKey);
  const times = readJson(storage, timesKey(storageKey));
  const out: Answers = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v !== "string" && typeof v !== "boolean") continue;
    out[k] = { v, t: typeof times[k] === "string" ? (times[k] as string) : UNKNOWN_TIME };
  }
  return out;
}

export function writeLocalAnswers(storage: Storage, storageKey: string, answers: Answers) {
  const values: Record<string, AnswerValue> = {};
  const times: Record<string, string> = {};
  for (const [k, a] of Object.entries(answers)) {
    values[k] = a.v;
    times[k] = a.t;
  }
  try {
    storage.setItem(storageKey, JSON.stringify(values));
    storage.setItem(timesKey(storageKey), JSON.stringify(times));
  } catch {
    // Ignore storage errors (e.g. quota)
  }
}

/** Keeps only well-formed entries from an account row. */
export function cleanAnswers(raw: unknown): Answers {
  const out: Answers = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, a] of Object.entries(raw as Record<string, unknown>)) {
    const x = a as Partial<Answer> | null;
    if (x && (typeof x.v === "string" || typeof x.v === "boolean") && typeof x.t === "string") out[k] = { v: x.v, t: x.t };
  }
  return out;
}

/** Per field, the answer changed most recently wins; ties keep `a`. */
export function mergeAnswers(a: Answers, b: Answers): Answers {
  const out: Answers = { ...a };
  for (const [k, ans] of Object.entries(b)) {
    if (!out[k] || Date.parse(ans.t) > Date.parse(out[k].t)) out[k] = ans;
  }
  return out;
}

export function sameAnswers(a: Answers, b: Answers): boolean {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => b[k] && b[k].v === a[k].v && b[k].t === a[k].t);
}

/** True when any field has a non-empty answer. */
export function hasAnswers(a: Answers): boolean {
  return Object.values(a).some((x) => x.v !== "" && x.v !== false);
}
