import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiError } from "./api-client";

describe("api-client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("ApiError", () => {
    it("creates an ApiError with status, message, and data", () => {
      const error = new ApiError(404, "Not Found", { resource: "course" });
      expect(error.name).toBe("ApiError");
      expect(error.status).toBe(404);
      expect(error.message).toBe("Not Found");
      expect(error.data).toEqual({ resource: "course" });
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("apiClient methods", () => {
    it("performs successful GET request and parses JSON", async () => {
      const mockData = [{ id: "c1", title: "CS101" }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData,
      });

      const result = await apiClient.get<typeof mockData>("/courses");
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/courses"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("performs successful POST request with body", async () => {
      const payload = { title: "New Note" };
      const responseData = { id: "n1", ...payload };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await apiClient.post<typeof responseData>("/notes", payload);
      expect(result).toEqual(responseData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/notes"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(payload),
        })
      );
    });

    it("throws ApiError when response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ message: "Insufficient permissions" }),
      });

      await expect(apiClient.delete("/courses/c1")).rejects.toThrow(ApiError);
      await expect(apiClient.delete("/courses/c1")).rejects.toMatchObject({
        status: 403,
        message: "Insufficient permissions",
      });
    });
  });
});
