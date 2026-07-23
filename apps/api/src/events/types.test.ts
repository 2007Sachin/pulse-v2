import assert from "node:assert/strict";
import { test } from "vitest";
import { describe, expect, it } from "vitest";
import { parsePathwisseEvent } from "./types.js";

const validBody = {
  event_id: "evt_123",
  event_type: "certificate_issued",
  pathwisse_user_id: "pw_user_1",
  occurred_at: "2026-07-01T00:00:00.000Z",
  title: "Frontend Developer — Role Readiness Certificate",
  score: 82,
  summary: null,
};

describe("parsePathwisseEvent", () => {
  it("parses a valid event", () => {
    const result = parsePathwisseEvent(validBody);
    expect(typeof result).toBe("object");
    if (typeof result === "string") return;
    expect(result.eventId).toBe("evt_123");
    expect(result.eventType).toBe("certificate_issued");
    expect(result.pathwisseUserId).toBe("pw_user_1");
    expect(result.score).toBe(82);
    expect(result.summary).toBeNull();
  });

  it("accepts all four known event types", () => {
    for (const eventType of [
      "certificate_issued",
      "skill_card_earned",
      "sprint_completed",
      "interview_verdict_scored",
    ]) {
      const result = parsePathwisseEvent({ ...validBody, event_type: eventType });
      expect(typeof result, `expected ${eventType} to parse`).toBe("object");
    }
  });

  it("rejects a non-object body", () => {
    expect(typeof parsePathwisseEvent("nope")).toBe("string");
    expect(typeof parsePathwisseEvent(null)).toBe("string");
    expect(typeof parsePathwisseEvent([1, 2, 3])).toBe("string");
  });

  it("rejects an unknown event_type", () => {
    const result = parsePathwisseEvent({ ...validBody, event_type: "something_else" });
    expect(typeof result).toBe("string");
  });

  it("rejects a missing event_id", () => {
    const { event_id: _event_id, ...rest } = validBody;
    const result = parsePathwisseEvent(rest);
    expect(typeof result).toBe("string");
  });

  it("rejects a non-numeric score", () => {
    const result = parsePathwisseEvent({ ...validBody, score: "high" });
    expect(typeof result).toBe("string");
  });

  it("rejects an unparsable occurred_at", () => {
    const result = parsePathwisseEvent({ ...validBody, occurred_at: "not-a-date" });
    expect(typeof result).toBe("string");
  });

  it("defaults score and summary to null when absent", () => {
    const { score: _score, summary: _summary, ...rest } = validBody;
    const result = parsePathwisseEvent(rest);
    expect(typeof result).toBe("object");
    if (typeof result === "string") return;
    expect(result.score).toBeNull();
    expect(result.summary).toBeNull();
  });
});
