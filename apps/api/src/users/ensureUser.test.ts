import { describe, expect, it, vi } from "vitest";
import { ensureUserForPathwisseId, placeholderSlug } from "./ensureUser.js";

function fakeClient(rowsByQuery: unknown[][]) {
  const query = vi.fn();
  for (const rows of rowsByQuery) {
    query.mockResolvedValueOnce({ rows });
  }
  return { query };
}

describe("placeholderSlug", () => {
  it("lowercases and slugifies the pathwisse user id", () => {
    expect(placeholderSlug("pw_user_123")).toBe("pw-pw-user-123");
  });

  it("collapses runs of non-alphanumeric characters into a single dash", () => {
    expect(placeholderSlug("pw--user__abc!!def")).toBe("pw-pw-user-abc-def");
  });
});

describe("ensureUserForPathwisseId", () => {
  it("returns the id of a newly inserted user on first event", async () => {
    const client = fakeClient([[{ id: "new-user-id" }]]);

    const userId = await ensureUserForPathwisseId(client as never, "pw_user_1");

    expect(userId).toBe("new-user-id");
    expect(client.query).toHaveBeenCalledTimes(1);
    const [sql, params] = client.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/insert into users/i);
    expect(sql).toMatch(/on conflict \(pathwisse_user_id\) do nothing/i);
    expect(params).toEqual(["pw_user_1", "pw_user_1", "pw-pw-user-1"]);
  });

  it("returns the existing id when the user already exists", async () => {
    const client = fakeClient([[], [{ id: "existing-user-id" }]]);

    const userId = await ensureUserForPathwisseId(client as never, "pw_user_1");

    expect(userId).toBe("existing-user-id");
    expect(client.query).toHaveBeenCalledTimes(2);
    const [selectSql, selectParams] = client.query.mock.calls[1] as [string, unknown[]];
    expect(selectSql).toMatch(/select id from users/i);
    expect(selectParams).toEqual(["pw_user_1"]);
  });

  it("seeds new users with the early_career fallback template and draft status", async () => {
    const client = fakeClient([[{ id: "new-user-id" }]]);

    await ensureUserForPathwisseId(client as never, "pw_user_2");

    const [sql] = client.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/'early_career'/);
    expect(sql).toMatch(/'draft'/);
  });

  it("throws if neither insert nor select find a row (should not happen)", async () => {
    const client = fakeClient([[], []]);

    await expect(ensureUserForPathwisseId(client as never, "pw_user_3")).rejects.toThrow(
      /failed to find or create user/,
    );
  });
});
