import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison for shared-secret bearer tokens, to avoid
 * leaking secret bytes via response-time differences on a plain `!==` check.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on mismatched lengths, so compare lengths first —
  // this length check is itself not constant-time, but leaks only the
  // length of the (fixed-format) "Bearer <secret>" header, not the secret.
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
