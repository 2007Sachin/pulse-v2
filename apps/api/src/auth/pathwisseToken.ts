import jwt from "jsonwebtoken";

export interface PathwisseHandoffClaims {
  sub: string;
  name: string;
}

export function verifyPathwisseToken(token: string, secret: string): PathwisseHandoffClaims {
  const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.name !== "string"
  ) {
    throw new Error("invalid Pathwisse handoff token payload");
  }

  return { sub: payload.sub, name: payload.name };
}
