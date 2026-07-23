import { describe, expect, it, vi } from "vitest";
import { getSyncEventsLog, isSyncEventsLogFilter } from "./getSyncEventsLog.js";

function fakePool(rows: unknown[]) {
  const query = vi.fn().mockResolvedValue({ rows });
  return { query };
}

const rawRow = {
  id: "evt-1",
  event_type: "certificate_issued",
  payload: { event_id: "evt-1" },
  processed_at: null,
  error: "boom",
  received_at: new Date("2026-07-01T00:00:00.000Z"),
};

describe("getSyncEventsLog", () => {
  it("defaults to the attention filter and maps rows to camelCase", async () => {
    const pool = fakePool([rawRow]);

    const result = await getSyncEventsLog(pool as never);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("processed_at is null or error is not null"), [
      50,
    ]);
    expect(result).toEqual([
      {
        id: "evt-1",
        eventType: "certificate_issued",
        payload: { event_id: "evt-1" },
        processedAt: null,
        error: "boom",
        receivedAt: rawRow.received_at,
      },
    ]);
  });

  it("uses the unprocessed-only clause when asked", async () => {
    const pool = fakePool([]);

    await getSyncEventsLog(pool as never, "unprocessed", 10);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("where processed_at is null"), [10]);
  });

  it("uses the errored-only clause when asked", async () => {
    const pool = fakePool([]);

    await getSyncEventsLog(pool as never, "errored", 10);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("where error is not null"), [10]);
  });

  it("applies no filter clause for 'all'", async () => {
    const pool = fakePool([]);

    await getSyncEventsLog(pool as never, "all", 10);

    const [sql] = pool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain("where");
  });

  it("caps the limit at 200 and floors it at 1", async () => {
    const pool = fakePool([]);

    await getSyncEventsLog(pool as never, "all", 10000);
    expect(pool.query.mock.calls[0]?.[1]).toEqual([200]);

    await getSyncEventsLog(pool as never, "all", -5);
    expect(pool.query.mock.calls[1]?.[1]).toEqual([1]);
  });
});

describe("isSyncEventsLogFilter", () => {
  it("accepts the known filter values", () => {
    expect(isSyncEventsLogFilter("attention")).toBe(true);
    expect(isSyncEventsLogFilter("unprocessed")).toBe(true);
    expect(isSyncEventsLogFilter("errored")).toBe(true);
    expect(isSyncEventsLogFilter("all")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isSyncEventsLogFilter("bogus")).toBe(false);
  });
});
