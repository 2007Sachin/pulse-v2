"use client";

import { useEffect, useState } from "react";
import type { NormalizedRepo } from "@/lib/githubRepos";
import styles from "./GitHubConnectStep.module.css";

type ValidationStatus = "idle" | "checking" | "valid" | "invalid" | "error";

const DEBOUNCE_MS = 400;

export function GitHubConnectStep({ initialGithubUsername }: { initialGithubUsername: string | null }) {
  const [username, setUsername] = useState(initialGithubUsername ?? "");
  const [status, setStatus] = useState<ValidationStatus>(initialGithubUsername ? "valid" : "idle");
  const [repos, setRepos] = useState<NormalizedRepo[]>([]);
  const [selectedRepoNames, setSelectedRepoNames] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(Boolean(initialGithubUsername));
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = username.trim();
    setConnected(trimmed.length > 0 && trimmed === initialGithubUsername);

    if (trimmed.length === 0) {
      setStatus("idle");
      setRepos([]);
      return;
    }

    setStatus("checking");
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      fetch(`/api/github/repos/${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(async (response) => {
          if (response.status === 404) {
            setStatus("invalid");
            setRepos([]);
            return;
          }
          if (!response.ok) {
            setStatus("error");
            setRepos([]);
            return;
          }
          const body = (await response.json()) as { repos: NormalizedRepo[] };
          setStatus("valid");
          setRepos(body.repos);
          setSelectedRepoNames(new Set(body.repos.map((repo) => repo.repoName)));
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setStatus("error");
          setRepos([]);
        });
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [username, initialGithubUsername]);

  function toggleRepo(repoName: string) {
    setSelectedRepoNames((current) => {
      const next = new Set(current);
      if (next.has(repoName)) {
        next.delete(repoName);
      } else {
        next.add(repoName);
      }
      return next;
    });
  }

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const response = await fetch("/api/github/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setConnectError(body.error ?? "Failed to connect GitHub account");
        return;
      }

      setConnected(true);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <section className={styles.step}>
      <h2 className={styles.title}>Connect GitHub</h2>
      <p className={styles.subtitle}>
        Enter your GitHub username to pull in your public repos, then pick which ones to feature.
      </p>

      <div className={styles.formRow}>
        <input
          className={styles.input}
          type="text"
          placeholder="GitHub username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-label="GitHub username"
        />
        <button
          type="button"
          className={styles.connectButton}
          disabled={status !== "valid" || connecting || connected}
          onClick={handleConnect}
        >
          {connected ? "Connected" : connecting ? "Connecting…" : "Connect"}
        </button>
      </div>

      {status === "checking" && <p className={`${styles.status} ${styles.statusChecking}`}>Checking username…</p>}
      {status === "invalid" && (
        <p className={`${styles.status} ${styles.statusInvalid}`}>No GitHub user found with that username.</p>
      )}
      {status === "error" && (
        <p className={`${styles.status} ${styles.statusInvalid}`}>
          Couldn&apos;t reach GitHub right now. Try again in a moment.
        </p>
      )}
      {status === "valid" && repos.length === 0 && (
        <p className={styles.emptyRepos}>This user has no public repos yet.</p>
      )}
      {connectError && <p className={`${styles.status} ${styles.statusInvalid}`}>{connectError}</p>}

      {status === "valid" && repos.length > 0 && (
        <>
          <p className={styles.selectionSummary}>
            {selectedRepoNames.size} of {repos.length} repo{repos.length === 1 ? "" : "s"} selected to feature
          </p>
          <div className={styles.repoList}>
            {repos.map((repo) => (
              <label key={repo.repoName} className={styles.repoCard}>
                <input
                  className={styles.repoCheckbox}
                  type="checkbox"
                  checked={selectedRepoNames.has(repo.repoName)}
                  onChange={() => toggleRepo(repo.repoName)}
                />
                <div>
                  <div className={styles.repoName}>{repo.repoName}</div>
                  {repo.description && <p className={styles.repoDescription}>{repo.description}</p>}
                  <div className={styles.repoMeta}>
                    {repo.primaryLanguage && <span>{repo.primaryLanguage}</span>}
                    <span>★ {repo.stars}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
