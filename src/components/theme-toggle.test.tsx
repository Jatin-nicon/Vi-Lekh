import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle Component", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("renders with default light mode state", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
  });

  it("toggles to dark mode on click and updates localStorage", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    fireEvent.click(button);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("vilekh-theme")).toBe("dark");
    expect(screen.getByText("Cozy Linen")).toBeInTheDocument();
  });

  it("toggles back to light mode on second click", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    // Click to dark
    fireEvent.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Click back to light
    fireEvent.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("vilekh-theme")).toBe("light");
    expect(screen.getByText("Dark")).toBeInTheDocument();
  });

  it("initializes in dark mode if saved in localStorage", () => {
    localStorage.setItem("vilekh-theme", "dark");
    render(<ThemeToggle />);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByText("Cozy Linen")).toBeInTheDocument();
  });
});
