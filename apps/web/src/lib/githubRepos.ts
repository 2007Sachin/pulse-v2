// Matches apps/api/src/github/types.ts's NormalizedRepo shape.
export interface NormalizedRepo {
  repoName: string;
  repoUrl: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  lastUpdatedAt: string;
}
