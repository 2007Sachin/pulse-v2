import { describe, expect, it, vi } from "vitest";
import { acknowledgeReshare, getReshareStatus } from "./reshareService.js";

function makeFakePool(userRow: unknown, countRow: unknown) {
  const query = vi.fn().mockImplementation((sql: string) => {
    if (typeof sql === "string" && sql.startsWith("select portfolio_status")) {
      return Promise.resolve({ rows: userRow ? [userRow] : [] });
    }
    if (typeof sql === "string" && sql.startsWith("select count(*)")) {
      return Promise.resolve({ rows: [countRow] });
    }
    return Promise.resolve({ rows: [] });
  });
  return { query };
}

describe("getReshareStatus", () => {
  it("does not prompt for a draft portfolio", async () => {
    const pool = makeFakePool({ portfolio_status: "draft", last_shared_at: new Date() }, { count: "3" });
    const status = await getReshareStatus(pool as never, "user-1");
    expect(status).toEqual({ shouldPrompt: false, newCredentialCount: 0 });
  });

  it("does not prompt when the portfolio has never been shared", async () => {
    const pool = makeFakePool({ portfolio_status: "published", last_shared_at: null }, { count: "1" });
    const status = await getReshareStatus(pool as never, "user-1");
    expect(status).toEqual({ shouldPrompt: false, newCredentialCount: 0 });
  });

  it("does not prompt when there's no user row", async () => {
    const pool = makeFakePool(null, { count: "0" });
    const status = await getReshareStatus(pool as never, "user-1");
    expect(status).toEqual({ shouldPrompt: false, newCredentialCount: 0 });
  });

  it("does not prompt when there are no new credentials since last shared", async () => {
    const pool = makeFakePool(
      { portfolio_status: "published", last_shared_at: new Date("2026-01-01") },
      { count: "0" },
    );
    const status = await getReshareStatus(pool as never, "user-1");
    expect(status).toEqual({ shouldPrompt: false, newCredentialCount: 0 });
  });

  it("prompts when there are new credentials since last shared", async () => {
    const pool = makeFakePool(
      { portfolio_status: "published", last_shared_at: new Date("2026-01-01") },
      { count: "2" },
    );
    const status = await getReshareStatus(pool as never, "user-1");
    expect(status).toEqual({ shouldPrompt: true, newCredentialCount: 2 });
  });
});

describe("acknowledgeReshare", () => {
  it("bumps last_shared_at for the given user", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await acknowledgeReshare({ query } as never, "user-1");
    expect(query).toHaveBeenCalledWith("update users set last_shared_at = now() where id = $1", [
      "user-1",
    ]);
  });
});
