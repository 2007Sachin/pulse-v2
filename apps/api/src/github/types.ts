export interface NormalizedRepo {
  repoName: string;
  repoUrl: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  lastUpdatedAt: string;
}

export interface GitHubRepoApiResponse {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
  fork: boolean;
}
