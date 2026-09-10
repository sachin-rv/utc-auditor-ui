"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { createProjectAction } from "@/app/dashboard/actions";
import { btnPrimaryClass, btnSecondaryClass, errorBoxClass, fieldClass } from "@/lib/ui";

const inputClass = fieldClass;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CreateProjectButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [minCoverage, setMinCoverage] = useState("80");

  const [auditConfig, setAuditConfig] = useState(
    () => [
      { envType: "development", branch: "main", schedule: "daily", minCoverageThreshold: 80 },
    ] as { envType: string; branch: string; schedule?: string; minCoverageThreshold?: number }[]
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate auditConfig: at least one, unique envType and branch
    if (!auditConfig || auditConfig.length === 0) {
      setError("At least one environment/branch configuration is required.");
      setLoading(false);
      return;
    }
    const envSet = new Set<string>();
    const branchSet = new Set<string>();
    for (const a of auditConfig) {
      if (!a.envType || !a.branch) {
        setError("Each audit config must include env type and branch.");
        setLoading(false);
        return;
      }
      if (envSet.has(a.envType)) {
        setError(`Duplicate env type: ${a.envType}`);
        setLoading(false);
        return;
      }
      if (branchSet.has(a.branch)) {
        setError(`Duplicate branch: ${a.branch}`);
        setLoading(false);
        return;
      }
      envSet.add(a.envType);
      branchSet.add(a.branch);
    }

    const result = await createProjectAction(clientId, {
      name,
      slug,
      repositoryUrl: repositoryUrl || undefined,
      websiteUrl: websiteUrl || undefined,
      description: description || undefined,
      auditConfig: auditConfig.map((a) => ({
        envType: a.envType,
        branch: a.branch,
        schedule: a.schedule || undefined,
        minCoverageThreshold: Number(a.minCoverageThreshold ?? minCoverage ?? 80),
      })),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setName("");
    setSlug("");
    // reset audit config
    setAuditConfig([{ envType: "development", branch: "main", schedule: "daily", minCoverageThreshold: 80 }]);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={btnPrimaryClass}
      >
        Add project
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add project" widthClass="max-w-lg">
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">Name</label>
            <input
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(slugify(e.target.value));
              }}
              className={inputClass}
              placeholder="Subscription Service"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">
              Repository URL
            </label>
            <input
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">
              Website URL
            </label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={inputClass}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">Environments & branches</label>
            <div className="space-y-2">
              {auditConfig.map((entry, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto] gap-3 items-start">
                  <div className="grid grid-cols-4 gap-2">
                    <select
                      value={entry.envType}
                      onChange={(e) => {
                        const copy = [...auditConfig];
                        copy[idx] = { ...copy[idx], envType: e.target.value };
                        setAuditConfig(copy);
                      }}
                      className={inputClass}
                    >
                      <option value="development">development</option>
                      <option value="qa">qa</option>
                      <option value="staging">staging</option>
                      <option value="production">production</option>
                    </select>
                    <input
                      value={entry.branch}
                      onChange={(e) => {
                        const copy = [...auditConfig];
                        copy[idx] = { ...copy[idx], branch: e.target.value };
                        setAuditConfig(copy);
                      }}
                      className={inputClass}
                      placeholder="branch"
                    />
                    <select
                      value={entry.schedule}
                      onChange={(e) => {
                        const copy = [...auditConfig];
                        copy[idx] = { ...copy[idx], schedule: e.target.value };
                        setAuditConfig(copy);
                      }}
                      className={inputClass}
                    >
                      <option value="daily">daily</option>
                      <option value="weekly">weekly</option>
                      <option value="manual">manual</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={String(entry.minCoverageThreshold ?? minCoverage)}
                      onChange={(e) => {
                        const copy = [...auditConfig];
                        copy[idx] = { ...copy[idx], minCoverageThreshold: Number(e.target.value) };
                        setAuditConfig(copy);
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      className="text-xs text-red-400"
                      onClick={() => setAuditConfig(auditConfig.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() =>
                  setAuditConfig([
                    ...auditConfig,
                    { envType: "development", branch: "", schedule: "daily", minCoverageThreshold: 80 },
                  ])
                }
                className="text-sm text-mist"
              >
                + Add environment
              </button>
            </div>
          </div>
          {error && <div className={errorBoxClass}>{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={btnSecondaryClass}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={btnPrimaryClass}>
              {loading ? "Adding…" : "Add project"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
