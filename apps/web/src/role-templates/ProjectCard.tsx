import { getProjectCardFields, type ProjectCardFieldDef, type RoleTemplate } from "./fields";

export interface ProjectCardData {
  title: string;
  outcomeLine: string;
  caseStudy?: string | null;
  /** Matches featured_projects.role_specific_fields (SCHEMA.md). */
  roleSpecificFields: Record<string, unknown>;
}

export interface ProjectCardProps {
  roleTemplate: RoleTemplate;
  project: ProjectCardData;
}

/**
 * Renders a project card's role-specific fields per ARCHITECTURE.md §5.
 * Shared between the builder preview (T2.6) and the public portfolio page
 * (T3.2) — the field schema is the only thing that varies by role; layout
 * and styling stay the same everywhere this is used.
 */
export function ProjectCard({ roleTemplate, project }: ProjectCardProps) {
  const fields = getProjectCardFields(roleTemplate);

  return (
    <article className="project-card">
      <h3>{project.title}</h3>
      <p className="project-card__outcome">{project.outcomeLine}</p>
      <dl className="project-card__fields">
        {fields.map((field) => (
          <div className="project-card__field" key={field.key}>
            <dt>{field.label}</dt>
            <dd>{renderFieldValue(field, project.roleSpecificFields[field.key])}</dd>
          </div>
        ))}
      </dl>
      {project.caseStudy ? <p className="project-card__case-study">{project.caseStudy}</p> : null}
    </article>
  );
}

function renderFieldValue(field: ProjectCardFieldDef, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return <span className="project-card__field-empty">Not added yet</span>;
  }

  switch (field.type) {
    case "link":
      return typeof value === "string" ? (
        <a href={value} target="_blank" rel="noreferrer">
          {value}
        </a>
      ) : null;

    case "tags":
      return Array.isArray(value) ? (
        <ul className="project-card__tags">
          {value.map((tag) => (
            <li key={String(tag)}>{String(tag)}</li>
          ))}
        </ul>
      ) : null;

    case "metric":
      return <strong>{String(value)}</strong>;

    case "before_after": {
      const beforeAfter = value as { before?: unknown; after?: unknown };
      return (
        <span className="project-card__before-after">
          <span>Before: {String(beforeAfter.before ?? "—")}</span>
          <span>After: {String(beforeAfter.after ?? "—")}</span>
        </span>
      );
    }

    case "image_gallery":
      return Array.isArray(value) ? (
        <div className="project-card__gallery">
          {value.map((src) => (
            <img key={String(src)} src={String(src)} alt="" />
          ))}
        </div>
      ) : null;

    case "text":
    default:
      return <span>{String(value)}</span>;
  }
}
