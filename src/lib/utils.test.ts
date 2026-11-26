import { describe, it, expect } from "vitest";
import { cn, formatDate, formatTime, extractErrorMessage } from "./utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      expect(cn("px-2", "py-1")).toBe("px-2 py-1");
    });

    it("resolves tailwind conflicts properly", () => {
      expect(cn("px-2 text-red-500", "px-4 text-blue-500")).toBe("px-4 text-blue-500");
    });

    it("ignores falsy values", () => {
      expect(cn("base", false && "hidden", null, undefined, "active")).toBe("base active");
    });
  });

  describe("formatDate", () => {
    it("formats ISO date string deterministically in UTC", () => {
      expect(formatDate("2026-11-05T00:00:00.000Z")).toBe("Nov 5, 2026");
    });

    it("formats numeric timestamps", () => {
      const date = new Date("2026-01-15T12:00:00.000Z");
      expect(formatDate(date.getTime())).toBe("Jan 15, 2026");
    });

    it("returns empty string for invalid date inputs", () => {
      expect(formatDate("not-a-date")).toBe("");
    });
  });

  describe("formatTime", () => {
    it("formats UTC time with zero-padded hours and minutes", () => {
      expect(formatTime("2026-11-05T09:05:00.000Z")).toBe("09:05 UTC");
      expect(formatTime("2026-11-05T14:30:00.000Z")).toBe("14:30 UTC");
    });

    it("returns empty string for invalid date inputs", () => {
      expect(formatTime("invalid")).toBe("");
    });
  });

  describe("extractErrorMessage", () => {
    it("handles plain strings", () => {
      expect(extractErrorMessage("Something failed")).toBe("Something failed");
    });

    it("handles Error instances", () => {
      expect(extractErrorMessage(new Error("Network error"))).toBe("Network error");
    });

    it("handles objects with message and details", () => {
      expect(
        extractErrorMessage({ message: "Invalid payload", details: "Field 'title' missing" })
      ).toBe("Invalid payload (Field 'title' missing)");
    });

    it("returns default message for null or undefined", () => {
      expect(extractErrorMessage(null)).toBe("An unknown error occurred.");
      expect(extractErrorMessage(undefined)).toBe("An unknown error occurred.");
    });
  });
});
