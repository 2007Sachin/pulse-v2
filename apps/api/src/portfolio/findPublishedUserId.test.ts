import { describe, expect, it, vi } from "vitest";
import { findPublishedUserId } from "./findPublishedUserId.js";

function fakePool(rows: unknown[]) {
  return { query: vi.fn().mockResolvedValue({ rows }) };
}

describe("findPublishedUserId", () => {
  it("returns the user id for a published slug", async () => {
    const pool = fakePool([{ id: "user-1", portfolio_status: "published" }]);

    const result = await findPublishedUserId(pool as never, "aditi-rao");

    expect(result).toBe("user-1");
  });

  it("returns null for a draft slug", async () => {
    const pool = fakePool([{ id: "user-1", portfolio_status: "draft" }]);

    const result = await findPublishedUserId(pool as never, "kabir-mehta");

    expect(result).toBeNull();
  });

  it("returns null for a slug that doesn't exist", async () => {
    const pool = fakePool([]);

    const result = await findPublishedUserId(pool as never, "no-such-slug");

    expect(result).toBeNull();
  });
});
