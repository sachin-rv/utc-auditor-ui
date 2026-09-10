"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { createProjectAction } from "@/app/dashboard/actions";
import { btnPrimaryClass, btnSecondaryClass, errorBoxClass, fieldClass } from "@/lib/ui";

import type {
  AuditEnvironment,
  AuditEnvironmentType,
  AuditSchedule,
} from "@/lib/api-types";
import { clientProjectPath } from "@/lib/client-routes";

type EnvironmentRow = AuditEnvironment & {
  id: number;
};

type RowErrors = {
  envType?: string;
  branch?: string;
  schedule?: string;
  minCoverageThreshold?: string;
};

const environments: Array<{
  label: string;
  value: AuditEnvironmentType;
}> = [
  { label: "Development", value: "development" },
  { label: "QA", value: "qa" },
  { label: "Staging", value: "staging" },
  { label: "Production", value: "production" },
];

const schedules: AuditSchedule[] = ["daily", "weekly", "manual"];

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createInitialRow(id = 1): EnvironmentRow {
  return {
    id,
    envType: "development",
    branch: "main",
    schedule: "daily",
    minCoverageThreshold: 80,
  };
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function CreateProjectButton({ clientId }: { clientId: string }) {
  const router = useRouter();

  const latestEnvironmentRef = useRef<HTMLDivElement>(null);
  const shouldScrollToLatestRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<EnvironmentRow[]>([createInitialRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextRowId, setNextRowId] = useState(2);

  useEffect(() => {
    if (!shouldScrollToLatestRef.current) {
      return;
    }

    shouldScrollToLatestRef.current = false;

    requestAnimationFrame(() => {
      latestEnvironmentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [rows.length]);

  function reset() {
    setName("");
    setSlug("");
    setRepositoryUrl("");
    setWebsiteUrl("");
    setDescription("");
    setRows([createInitialRow()]);
    setErrors({});
    setApiError(null);
    setSuccess(false);
    setNextRowId(2);
  }

  function closeModal() {
    if (loading) return;
    reset();
    setOpen(false);
  }

  function updateRow(
    rowId: number,
    field: keyof AuditEnvironment,
    value: string | number,
  ) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: field === "minCoverageThreshold" ? Number(value) : value,
            }
          : row,
      ),
    );

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[`${rowId}.${field}`];
      return nextErrors;
    });
  }

  function addEnvironment() {
    const used = new Set(rows.map((row) => row.envType));
    const nextEnvironment =
      environments.find((environment) => !used.has(environment.value))?.value ??
      "development";

    shouldScrollToLatestRef.current = true;

    setRows((currentRows) => [
      ...currentRows,
      {
        ...createInitialRow(nextRowId),
        envType: nextEnvironment,
      },
    ]);

    setNextRowId((value) => value + 1);
  }

  function removeEnvironment(rowId: number) {
    if (rows.length === 1) return;

    setRows((currentRows) => currentRows.filter((row) => row.id !== rowId));

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      Object.keys(nextErrors).forEach((key) => {
        if (key.startsWith(`${rowId}.`)) {
          delete nextErrors[key];
        }
      });

      return nextErrors;
    });
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    const trimmedSlug = slug.trim();

    if (!name.trim()) {
      nextErrors.name = "Project name is required.";
    }

    if (!trimmedSlug) {
      nextErrors.slug = "Slug is required.";
    } else if (!slugPattern.test(trimmedSlug)) {
      nextErrors.slug =
        "Use lowercase letters, numbers, and single hyphens only.";
    }

    if (repositoryUrl.trim() && !isValidUrl(repositoryUrl.trim())) {
      nextErrors.repositoryUrl = "Enter a valid repository URL.";
    }

    if (websiteUrl.trim() && !isValidUrl(websiteUrl.trim())) {
      nextErrors.websiteUrl = "Enter a valid website URL.";
    }

    if (rows.length === 0) {
      nextErrors.auditConfig = "At least one audit environment is required.";
    }

    const environmentValues = rows.map((row) => row.envType);
    const branchValues = rows.map((row) => row.branch.trim().toLowerCase());

    rows.forEach((row, index) => {
      const prefix = `${row.id}.`;

      if (!row.envType) {
        nextErrors[`${prefix}envType`] = "Select an environment.";
      }

      if (!row.branch.trim()) {
        nextErrors[`${prefix}branch`] = "Branch is required.";
      }

      if (row.envType && environmentValues.indexOf(row.envType) !== index) {
        nextErrors[`${prefix}envType`] =
          "This environment has already been added.";
      }

      if (
        row.branch.trim() &&
        branchValues.indexOf(row.branch.trim().toLowerCase()) !== index
      ) {
        nextErrors[`${prefix}branch`] =
          "This branch is already used by another environment.";
      }

      if (
        !Number.isFinite(row.minCoverageThreshold) ||
        row.minCoverageThreshold < 0 ||
        row.minCoverageThreshold > 100
      ) {
        nextErrors[`${prefix}minCoverageThreshold`] =
          "Coverage must be between 0 and 100.";
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);
    setSuccess(false);

    if (!validate()) {
      return;
    }

    setLoading(true);

    const input = {
      name: name.trim(),
      slug: slug.trim(),
      ...(repositoryUrl.trim() && {
        repositoryUrl: repositoryUrl.trim(),
      }),
      ...(websiteUrl.trim() && {
        websiteUrl: websiteUrl.trim(),
      }),
      ...(description.trim() && {
        description: description.trim(),
      }),
      auditConfig: rows.map(({ id: _id, ...row }) => ({
        envType: row.envType,
        branch: row.branch.trim(),
        schedule: row.schedule,
        minCoverageThreshold: row.minCoverageThreshold,
      })),
    };

    const result = await createProjectAction(clientId, input);

    setLoading(false);

    if (!result.ok) {
      setApiError(result.error);
      return;
    }

    setSuccess(true);
    setOpen(false);
    reset();

    router.push(clientProjectPath(clientId, result.data.id));
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={btnPrimaryClass}
      >
        Add project
      </button>

      <Modal
        open={open}
        onClose={closeModal}
        title="Add project"
        subtitle="Configure the environments that UTC Auditor should monitor."
        widthClass="max-w-4xl"
      >
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="project-name" label="Project name" error={errors.name}>
              <input
                id="project-name"
                required
                value={name}
                onChange={(event) => {
                  const value = event.target.value;
                  setName(value);
                  setSlug(slugify(value));
                }}
                className={fieldClass}
                placeholder="Project Name"
                aria-invalid={Boolean(errors.name)}
              />
            </Field>

            <Field
              id="project-slug"
              label="Slug"
              helper="Generated automatically from the project name"
              error={errors.slug}
            >
              <input
                id="project-slug"
                required
                value={slug}
                readOnly
                className={`${fieldClass} cursor-not-allowed opacity-75`}
                placeholder="project-name"
                aria-invalid={Boolean(errors.slug)}
                aria-describedby="project-slug-help"
              />
            </Field>

            <Field
              id="repository-url"
              label="Repository URL"
              error={errors.repositoryUrl}
            >
              <input
                id="repository-url"
                type="url"
                value={repositoryUrl}
                onChange={(event) => setRepositoryUrl(event.target.value)}
                className={fieldClass}
                placeholder="https://github.com/example/project"
                aria-invalid={Boolean(errors.repositoryUrl)}
              />
            </Field>

            <Field
              id="website-url"
              label="Website URL"
              error={errors.websiteUrl}
            >
              <input
                id="website-url"
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                className={fieldClass}
                placeholder="https://example.com"
                aria-invalid={Boolean(errors.websiteUrl)}
              />
            </Field>
          </div>

          <Field id="description" label="Description">
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={fieldClass}
              rows={3}
              placeholder="Project description"
            />
          </Field>

          <section
            aria-labelledby="audit-environments-heading"
            className="border-t border-line pt-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3
                  id="audit-environments-heading"
                  className="text-base font-semibold text-chalk"
                >
                  Audit Environments
                </h3>
                <p className="mt-1 text-xs text-mist">
                  Configure one or more branches to audit.
                </p>
              </div>
            </div>

            {errors.auditConfig && (
              <p className="mt-3 text-sm text-signal-fail" role="alert">
                {errors.auditConfig}
              </p>
            )}

            <div className="mt-4 space-y-4">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  ref={
                    index === rows.length - 1 ? latestEnvironmentRef : undefined
                  }
                  className="rounded-2xl border border-line bg-panel2/40 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-chalk">
                      Environment {index + 1}
                    </h4>

                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEnvironment(row.id)}
                        disabled={loading}
                        className={btnSecondaryClass}
                        aria-label={`Remove environment ${index + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field
                      id={`env-${row.id}`}
                      label="Environment"
                      helper="Which deployment environment does this branch represent?"
                      error={errors[`${row.id}.envType`]}
                    >
                      <select
                        id={`env-${row.id}`}
                        value={row.envType}
                        onChange={(event) =>
                          updateRow(row.id, "envType", event.target.value)
                        }
                        className={fieldClass}
                        aria-invalid={Boolean(errors[`${row.id}.envType`])}
                      >
                        {environments.map((environment) => (
                          <option
                            key={environment.value}
                            value={environment.value}
                          >
                            {environment.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      id={`branch-${row.id}`}
                      label="Branch"
                      helper="Git branch that should be audited"
                      error={errors[`${row.id}.branch`]}
                    >
                      <input
                        id={`branch-${row.id}`}
                        required
                        value={row.branch}
                        onChange={(event) =>
                          updateRow(row.id, "branch", event.target.value)
                        }
                        className={fieldClass}
                        placeholder="main"
                        aria-invalid={Boolean(errors[`${row.id}.branch`])}
                      />
                    </Field>

                    <Field
                      id={`schedule-${row.id}`}
                      label="Schedule"
                      helper="How often should audits run?"
                      error={errors[`${row.id}.schedule`]}
                    >
                      <select
                        id={`schedule-${row.id}`}
                        value={row.schedule}
                        onChange={(event) =>
                          updateRow(row.id, "schedule", event.target.value)
                        }
                        className={fieldClass}
                      >
                        {schedules.map((schedule) => (
                          <option key={schedule} value={schedule}>
                            {schedule}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      id={`coverage-${row.id}`}
                      label="Minimum coverage"
                      helper="Audit fails when test coverage is below this percentage"
                      error={errors[`${row.id}.minCoverageThreshold`]}
                    >
                      <input
                        id={`coverage-${row.id}`}
                        type="number"
                        min={0}
                        max={100}
                        value={row.minCoverageThreshold}
                        onChange={(event) =>
                          updateRow(
                            row.id,
                            "minCoverageThreshold",
                            event.target.value,
                          )
                        }
                        className={fieldClass}
                        aria-invalid={Boolean(
                          errors[`${row.id}.minCoverageThreshold`],
                        )}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={addEnvironment}
                disabled={loading || rows.length === environments.length}
                className={btnSecondaryClass}
              >
                Add environment
              </button>
            </div>
          </section>

          {apiError && (
            <div className={errorBoxClass} role="alert">
              {apiError}
            </div>
          )}

          {success && (
            <div
              className="rounded-xl border border-signal-pass/20 bg-signal-pass/10 px-3 py-2 text-sm text-signal-pass"
              role="status"
            >
              Project created successfully.
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className={btnSecondaryClass}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className={btnPrimaryClass}
            >
              {loading ? "Creating project..." : "Create project"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Field({
  id,
  label,
  helper,
  error,
  children,
}: {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-chalk"
      >
        {label}
      </label>

      {children}

      {helper && !error && <p className="mt-1 text-xs text-mist">{helper}</p>}

      {error && (
        <p className="mt-1 text-xs text-signal-fail" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
