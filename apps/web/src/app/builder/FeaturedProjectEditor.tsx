"use client";

import { useEffect, useState } from "react";
import {
  OUTCOME_LINE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type FeaturedProject,
} from "@/lib/featuredProjects";
import type { NormalizedRepo } from "@/lib/githubRepos";
import {
  getProjectCardFields,
  type ProjectCardFieldDef,
  type RoleTemplate,
} from "@/role-templates/fields";
import styles from "./FeaturedProjectEditor.module.css";

const MANUAL_SOURCE = "__manual__";

interface FeaturedProjectEditorProps {
  roleTemplate: RoleTemplate | null;
  githubUsername: string | null;
  initialProjects: FeaturedProject[];
}

/**
 * Tier 2 — Proof of Work editor (T2.4). The candidate picks a repo from
 * their connected GitHub account (fetched via the same proxy as T2.3) or
 * adds a manual entry, then fills a title, a required one-line outcome, an
 * optional case study, and the role-specific fields for their role_template
 * (ARCHITECTURE.md §5, via the T3.1 field engine). Submitting appends a row
 * to featured_projects.
 */
export function FeaturedProjectEditor({
  roleTemplate,
  githubUsername,
  initialProjects,
}: FeaturedProjectEditorProps) {
  const fields = getProjectCardFields(roleTemplate ?? "early_career");

  const [projects, setProjects] = useState<FeaturedProject[]>(initialProjects);
  const [repos, setRepos] = useState<NormalizedRepo[]>([]);
  const [source, setSource] = useState<string>(MANUAL_SOURCE);
  const [title, setTitle] = useState("");
  const [outcomeLine, setOutcomeLine] = useState("");
  const [caseStudy, setCaseStudy] = useState("");
  const [rawRoleFields, setRawRoleFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Pull the connected user's repos so they can be offered as project sources.
  useEffect(() => {
    if (!githubUsername) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/github/repos/${encodeURIComponent(githubUsername)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { repos: NormalizedRepo[] };
        setRepos(body.repos);
      })
      .catch(() => {
        /* repo list is optional — the candidate can still add manual entries */
      });
    return () => controller.abort();
  }, [githubUsername]);

  function setRoleField(key: string, value: string) {
    setRawRoleFields((current) => ({ ...current, [key]: value }));
  }

  function handleSourceChange(next: string) {
    setSource(next);
    if (next !== MANUAL_SOURCE && title.trim().length === 0) {
      setTitle(next);
    }
  }

  function resetForm() {
    setSource(MANUAL_SOURCE);
    setTitle("");
    setOutcomeLine("");
    setCaseStudy("");
    setRawRoleFields({});
  }

  function buildRoleSpecificFields(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.type === "before_after") {
        const before = (rawRoleFields[`${field.key}__before`] ?? "").trim();
        const after = (rawRoleFields[`${field.key}__after`] ?? "").trim();
        if (before || after) {
          result[field.key] = { before, after };
        }
        continue;
      }

      const value = (rawRoleFields[field.key] ?? "").trim();
      if (value.length === 0) {
        continue;
      }

      if (field.type === "tags" || field.type === "image_gallery") {
        const items = value
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
        if (items.length > 0) {
          result[field.key] = items;
        }
      } else {
        result[field.key] = value;
      }
    }
    return result;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSavedMessage(null);

    const isGithub = source !== MANUAL_SOURCE;
    const repo = isGithub ? repos.find((candidate) => candidate.repoName === source) : undefined;

    const body = {
      sourceType: isGithub ? "github_repo" : "manual",
      title: title.trim(),
      outcomeLine: outcomeLine.trim(),
      caseStudy: caseStudy.trim(),
      roleSpecificFields: buildRoleSpecificFields(),
      repo: repo ?? null,
    };

    try {
      const response = await fetch("/api/featured-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const responseBody = (await response.json()) as FeaturedProject | { error?: string };

      if (!response.ok) {
        setError(("error" in responseBody && responseBody.error) || "Failed to add project.");
        return;
      }

      setProjects((current) => [...current, responseBody as FeaturedProject]);
      resetForm();
      setSavedMessage("Project added.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderRoleField(field: ProjectCardFieldDef) {
    if (field.type === "before_after") {
      return (
        <div className={styles.beforeAfter}>
          <input
            className={styles.input}
            type="text"
            placeholder="Before"
            value={rawRoleFields[`${field.key}__before`] ?? ""}
            onChange={(event) => setRoleField(`${field.key}__before`, event.target.value)}
            aria-label={`${field.label} — before`}
          />
          <input
            className={styles.input}
            type="text"
            placeholder="After"
            value={rawRoleFields[`${field.key}__after`] ?? ""}
            onChange={(event) => setRoleField(`${field.key}__after`, event.target.value)}
            aria-label={`${field.label} — after`}
          />
        </div>
      );
    }

    if (field.type === "image_gallery") {
      return (
        <textarea
          className={styles.textarea}
          rows={2}
          placeholder="One image URL per line"
          value={rawRoleFields[field.key] ?? ""}
          onChange={(event) => setRoleField(field.key, event.target.value)}
          aria-label={field.label}
        />
      );
    }

    return (
      <input
        className={styles.input}
        type={field.type === "link" ? "url" : "text"}
        placeholder={
          field.type === "tags"
            ? "Comma-separated"
            : field.type === "link"
              ? "https://…"
              : undefined
        }
        value={rawRoleFields[field.key] ?? ""}
        onChange={(event) => setRoleField(field.key, event.target.value)}
        aria-label={field.label}
      />
    );
  }

  return (
    <section className={styles.step}>
      <h2 className={styles.title}>Featured projects</h2>
      <p className={styles.subtitle}>
        Add 2–3 projects. Pick a repo you connected, or add one manually, then write a one-line
        outcome for each.
      </p>

      {projects.length > 0 ? (
        <div className={styles.projectList}>
          {projects.map((project) => (
            <article key={project.id} className={styles.projectCard}>
              <div className={styles.projectHeader}>
                <span className={styles.projectTitle}>{project.title}</span>
                <span className={styles.sourceTag}>
                  {project.sourceType === "github_repo" ? "GitHub" : "Manual"}
                </span>
              </div>
              <p className={styles.projectOutcome}>{project.outcomeLine}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.emptyProjects}>No featured projects yet. Add your first below.</p>
      )}

      <hr className={styles.divider} />

      <p className={styles.formTitle}>Add a project</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Source</span>
          <select
            className={styles.select}
            value={source}
            onChange={(event) => handleSourceChange(event.target.value)}
          >
            <option value={MANUAL_SOURCE}>Manual entry</option>
            {repos.map((repo) => (
              <option key={repo.repoName} value={repo.repoName}>
                {repo.repoName}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Title <span className={styles.required}>*</span>
          </span>
          <input
            className={styles.input}
            type="text"
            value={title}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Project title"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Outcome line <span className={styles.required}>*</span>
          </span>
          <input
            className={styles.input}
            type="text"
            value={outcomeLine}
            maxLength={OUTCOME_LINE_MAX_LENGTH}
            onChange={(event) => setOutcomeLine(event.target.value)}
            placeholder="One line: what did this project achieve?"
            required
          />
          <span className={styles.counter}>
            {outcomeLine.length}/{OUTCOME_LINE_MAX_LENGTH}
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Case study (optional)</span>
          <textarea
            className={styles.textarea}
            rows={3}
            value={caseStudy}
            onChange={(event) => setCaseStudy(event.target.value)}
            placeholder="A longer write-up, if you want one."
          />
        </label>

        {fields.length > 0 && <p className={styles.roleFieldsHeading}>Project details</p>}
        {fields.map((field) => (
          <label key={field.key} className={styles.field}>
            <span className={styles.fieldLabel}>{field.label}</span>
            {renderRoleField(field)}
          </label>
        ))}

        <button type="submit" className={styles.saveButton} disabled={submitting}>
          {submitting ? "Adding…" : "Add project"}
        </button>

        {savedMessage && <p className={styles.successMessage}>{savedMessage}</p>}
        {error && <p className={styles.errorMessage}>{error}</p>}
      </form>
    </section>
  );
}
