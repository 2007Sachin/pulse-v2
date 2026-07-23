import assert from "node:assert/strict";
import { test } from "node:test";
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

test("parses a valid event", () => {
  const result = parsePathwisseEvent(validBody);
  assert.equal(typeof result, "object");
  if (typeof result === "string") return;
  assert.equal(result.eventId, "evt_123");
  assert.equal(result.eventType, "certificate_issued");
  assert.equal(result.pathwisseUserId, "pw_user_1");
  assert.equal(result.score, 82);
  assert.equal(result.summary, null);
});

test("accepts all four known event types", () => {
  for (const eventType of [
    "certificate_issued",
    "skill_card_earned",
    "sprint_completed",
    "interview_verdict_scored",
  ]) {
    const result = parsePathwisseEvent({ ...validBody, event_type: eventType });
    assert.equal(typeof result, "object", `expected ${eventType} to parse`);
  }
});

test("rejects a non-object body", () => {
  assert.equal(typeof parsePathwisseEvent("nope"), "string");
  assert.equal(typeof parsePathwisseEvent(null), "string");
  assert.equal(typeof parsePathwisseEvent([1, 2, 3]), "string");
});

test("rejects an unknown event_type", () => {
  const result = parsePathwisseEvent({ ...validBody, event_type: "something_else" });
  assert.equal(typeof result, "string");
});

test("rejects a missing event_id", () => {
  const { event_id: _event_id, ...rest } = validBody;
  const result = parsePathwisseEvent(rest);
  assert.equal(typeof result, "string");
});

test("rejects a non-numeric score", () => {
  const result = parsePathwisseEvent({ ...validBody, score: "high" });
  assert.equal(typeof result, "string");
});

test("rejects an unparsable occurred_at", () => {
  const result = parsePathwisseEvent({ ...validBody, occurred_at: "not-a-date" });
  assert.equal(typeof result, "string");
});

test("defaults score and summary to null when absent", () => {
  const { score: _score, summary: _summary, ...rest } = validBody;
  const result = parsePathwisseEvent(rest);
  assert.equal(typeof result, "object");
  if (typeof result === "string") return;
  assert.equal(result.score, null);
  assert.equal(result.summary, null);
});
