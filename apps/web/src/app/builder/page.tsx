import { cookies } from "next/headers";
import { fetchVerifiedCredentials } from "@/lib/credentials";
import { VerifiedProofTier } from "./VerifiedProofTier";

export const metadata = {
  title: "Portfolio builder — Pulse v2",
};

export default async function BuilderPage() {
  const cookieStore = await cookies();
  const credentials = await fetchVerifiedCredentials(cookieStore.get("pulse_session")?.value);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Build your portfolio</h1>
      <VerifiedProofTier credentials={credentials} />
    </main>
  );
}
