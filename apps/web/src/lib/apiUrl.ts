const LOCAL_DEV_API_URL = "http://localhost:4000";

/**
 * Base URL of the api service. In production this must be set explicitly —
 * falling back to localhost there would mean every server-side fetch to the
 * api silently fails with a connection error instead of a clear
 * misconfiguration message.
 */
export function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL must be set in production");
  }

  return LOCAL_DEV_API_URL;
}
