import { describe, expect, it, vi } from "vitest";
import * as shareCard from "./shareCard.js";
import { publishPortfolio, SlugTakenError, unpublishPortfolio } from "./publishService.js";

function fakeClient(rowsOrError: unknown[] | Error) {
  const query = vi.fn();
  if (rowsOrError instanceof Error) {
    query.mockRejectedValueOnce(rowsOrError);
  } else {
    query.mockResolvedValueOnce({ rows: rowsOrError });
  }
  return { query };
}

describe("publishPortfolio", () => {
  it("sets portfolio_status to published and returns the confirmed slug", async () => {
    const client = fakeClient([{ portfolio_slug: "aditi-rao" }]);

    const result = await publishPortfolio(client as never, "user-1", "aditi-rao");

    expect(result).toEqual({ status: "published", slug: "aditi-rao" });
    const [sql, params] = client.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/portfolio_status = 'published'/);
    expect(params).toEqual(["aditi-rao", "user-1"]);
  });

  it("triggers the T3.3 share-card hook after a successful publish", async () => {
    const client = fakeClient([{ portfolio_slug: "aditi-rao" }]);
    const spy = vi.spyOn(shareCard, "triggerShareCardGeneration").mockResolvedValue();

    await publishPortfolio(client as never, "user-1", "aditi-rao");

    expect(spy).toHaveBeenCalledWith("user-1");
    spy.mockRestore();
  });

  it("throws SlugTakenError on a unique-constraint violation", async () => {
    const pgError = Object.assign(new Error("duplicate key"), { code: "23505" });
    const client = fakeClient(pgError);

    await expect(publishPortfolio(client as never, "user-1", "taken-slug")).rejects.toBeInstanceOf(
      SlugTakenError,
    );
  });

  it("rethrows unrelated database errors", async () => {
    const client = fakeClient(new Error("connection lost"));

    await expect(publishPortfolio(client as never, "user-1", "aditi-rao")).rejects.toThrow(
      "connection lost",
    );
  });

  it("throws if the update affects no row (unknown user)", async () => {
    const client = fakeClient([]);

    await expect(publishPortfolio(client as never, "missing-user", "aditi-rao")).rejects.toThrow(
      /failed to publish/,
    );
  });
});

describe("unpublishPortfolio", () => {
  it("sets portfolio_status to draft and keeps the existing slug", async () => {
    const client = fakeClient([{ portfolio_slug: "aditi-rao" }]);

    const result = await unpublishPortfolio(client as never, "user-1");

    expect(result).toEqual({ status: "draft", slug: "aditi-rao" });
    const [sql, params] = client.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/portfolio_status = 'draft'/);
    expect(params).toEqual(["user-1"]);
  });

  it("throws if the update affects no row (unknown user)", async () => {
    const client = fakeClient([]);

    await expect(unpublishPortfolio(client as never, "missing-user")).rejects.toThrow(
      /failed to unpublish/,
    );
  });
});
