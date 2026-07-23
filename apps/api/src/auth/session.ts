import jwt from "jsonwebtoken";
import { SESSION_TTL_SECONDS } from "./constants.js";

export interface PulseSessionClaims {
  pathwisseUserId: string;
  name: string;
}

export function signSessionToken(claims: PulseSessionClaims, secret: string): string {
  return jwt.sign(claims, secret, { algorithm: "HS256", expiresIn: SESSION_TTL_SECONDS });
}

export function verifySessionToken(token: string, secret: string): PulseSessionClaims {
  const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });

  if (
    typeof payload === "string" ||
    typeof payload.pathwisseUserId !== "string" ||
    typeof payload.name !== "string"
  ) {
    throw new Error("invalid Pulse session payload");
  }

  return { pathwisseUserId: payload.pathwisseUserId, name: payload.name };
}
