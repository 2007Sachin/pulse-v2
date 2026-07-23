// Role template engine (T3.1): given a `role_template`, describes which
// project-card fields to render, per ARCHITECTURE.md §5. The template shell
// (layout, verified-badge row, share card) is shared across all roles —
// only this field schema changes by role.

export type RoleTemplate = "dev" | "design" | "marketing" | "product" | "data" | "early_career";

export type ProjectCardFieldType =
  | "text"
  | "link"
  | "tags"
  | "metric"
  | "image_gallery"
  | "before_after";

export interface ProjectCardFieldDef {
  /** Key into a featured_projects row's `role_specific_fields` JSON. */
  key: string;
  label: string;
  type: ProjectCardFieldType;
}

const PROJECT_CARD_FIELDS_BY_ROLE_TEMPLATE: Record<RoleTemplate, ProjectCardFieldDef[]> = {
  dev: [
    { key: "repo_link", label: "Repo link", type: "link" },
    { key: "tech_stack", label: "Tech stack", type: "tags" },
    { key: "metric", label: "Metric (perf, scale, or bug reduction)", type: "metric" },
    { key: "demo_link", label: "Live demo", type: "link" },
  ],
  design: [
    { key: "process_shots", label: "Process shots", type: "image_gallery" },
    { key: "before_after", label: "Before / after", type: "before_after" },
    { key: "figma_link", label: "Figma link", type: "link" },
    { key: "problem_statement", label: "Problem statement", type: "text" },
  ],
  marketing: [
    { key: "campaign_name", label: "Campaign name", type: "text" },
    { key: "channel", label: "Channel", type: "text" },
    { key: "metric", label: "Metric (CTR, CAC, or reach)", type: "metric" },
    { key: "before_after", label: "Before / after", type: "before_after" },
  ],
  product: [
    { key: "problem", label: "Problem", type: "text" },
    { key: "decision", label: "Decision", type: "text" },
    { key: "outcome", label: "Outcome", type: "text" },
  ],
  data: [
    { key: "dataset_or_tool", label: "Dataset / tool used", type: "text" },
    { key: "question", label: "Question answered", type: "text" },
    { key: "recommendation", label: "Recommendation made", type: "text" },
  ],
  early_career: [
    { key: "what_you_built", label: "What you built", type: "text" },
    { key: "what_you_learned", label: "What you learned", type: "text" },
    { key: "outcome", label: "Outcome", type: "text" },
  ],
};

const ROLE_TEMPLATES = Object.keys(PROJECT_CARD_FIELDS_BY_ROLE_TEMPLATE) as RoleTemplate[];

export function isRoleTemplate(value: string): value is RoleTemplate {
  return (ROLE_TEMPLATES as string[]).includes(value);
}

/**
 * The project-card field layout for a given role template. Falls back to
 * the early_career/undecided generic shape for any value that isn't one of
 * the known templates (ARCHITECTURE.md §5 calls this out as the fallback).
 */
export function getProjectCardFields(roleTemplate: RoleTemplate): ProjectCardFieldDef[] {
  return PROJECT_CARD_FIELDS_BY_ROLE_TEMPLATE[roleTemplate] ?? PROJECT_CARD_FIELDS_BY_ROLE_TEMPLATE.early_career;
}
