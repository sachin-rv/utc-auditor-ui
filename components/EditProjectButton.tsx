"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { updateProjectAction } from "@/app/dashboard/actions";
import { btnPrimaryClass, btnSecondaryClass, errorBoxClass, fieldClass } from "@/lib/ui";
import type { ApiProject } from "@/lib/api-types";

const inputClass = fieldClass;

export default function EditProjectButton({ clientId, project }: { clientId: string; project: ApiProject }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name ?? "");
  const [repositoryUrl, setRepositoryUrl] = useState(project.repositoryUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState((project as any).websiteUrl ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState(project.status ?? "active");
  const [minCoverage, setMinCoverage] = useState(String((project.auditConfig && (project.auditConfig as any).minCoverageThreshold) ?? 80));

  const [auditConfig, setAuditConfig] = useState(() => {
    // try to initialize from project.auditConfig if it's an array or object
    const raw: any = (project as any).auditConfig;
    if (Array.isArray(raw) && raw.length > 0) return raw.map((r: any) => ({ envType: r.envType ?? "development", branch: r.branch ?? "", schedule: r.schedule ?? "daily", minCoverageThreshold: r.minCoverageThreshold ?? 80 }));
    if (raw && typeof raw === "object") return [{ envType: raw.envType ?? "development", branch: raw.branch ?? (project.branch ?? ""), schedule: raw.schedule ?? "daily", minCoverageThreshold: raw.minCoverageThreshold ?? 80 }];
    return [{ envType: "development", branch: project.branch ?? "", schedule: "daily", minCoverageThreshold: 80 }];
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // basic validation
    if (!name) {
      setError("Name is required.");
      setLoading(false);
      return;
    }

    if (!auditConfig || auditConfig.length === 0) {
      setError("At least one environment/branch configuration is required.");
      setLoading(false);
      return;
    }

    // ensure uniqueness
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

    const payload: any = {
      name,
      repositoryUrl: repositoryUrl || undefined,
      websiteUrl: websiteUrl || undefined,
      description: description || undefined,
      status: status || undefined,
      auditConfig: auditConfig.map((a) => ({ envType: a.envType, branch: a.branch, schedule: a.schedule || undefined, minCoverageThreshold: Number(a.minCoverageThreshold ?? minCoverage ?? 80) })),
    };

    try {
      const res = await updateProjectAction(project.id, payload);
      setLoading(false);
      if (!res.ok) {
        setError(res.error ?? "Failed to update project.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setLoading(false);
      setError(e?.message ?? String(e));
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnSecondaryClass}>
        Edit
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit project" widthClass="max-w-lg">
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">Repository URL</label>
            <input value={repositoryUrl} onChange={(e) => setRepositoryUrl(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">Website URL</label>
            <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">Environments & branches</label>
            <div className="space-y-2">
              {auditConfig.map((entry: any, idx: number) => (
                <div key={idx} className="grid grid-cols-[1fr_auto] gap-3 items-start">
                  <div className="grid grid-cols-4 gap-2">
                    <select value={entry.envType} onChange={(e) => { const copy = [...auditConfig]; copy[idx] = { ...copy[idx], envType: e.target.value }; setAuditConfig(copy); }} className={inputClass}>
                      <option value="development">development</option>
                      <option value="qa">qa</option>
                      <option value="staging">staging</option>
                      <option value="production">production</option>
                    </select>
                    <input value={entry.branch} onChange={(e) => { const copy = [...auditConfig]; copy[idx] = { ...copy[idx], branch: e.target.value }; setAuditConfig(copy); }} className={inputClass} placeholder="branch" />
                    <select value={entry.schedule} onChange={(e) => { const copy = [...auditConfig]; copy[idx] = { ...copy[idx], schedule: e.target.value }; setAuditConfig(copy); }} className={inputClass}>
                      <option value="daily">daily</option>
                      <option value="weekly">weekly</option>
                      <option value="manual">manual</option>
                    </select>
                    <input type="number" min={0} max={100} value={String(entry.minCoverageThreshold ?? minCoverage)} onChange={(e) => { const copy = [...auditConfig]; copy[idx] = { ...copy[idx], minCoverageThreshold: Number(e.target.value) }; setAuditConfig(copy); }} className={inputClass} />
                  </div>
                  <div>
                    <button type="button" className="text-xs text-red-400" onClick={() => setAuditConfig(auditConfig.filter((_: any, i: number) => i !== idx))}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <button type="button" onClick={() => setAuditConfig([...auditConfig, { envType: "development", branch: "", schedule: "daily", minCoverageThreshold: 80 }])} className="text-sm text-mist">+ Add environment</button>
            </div>
          </div>

          {error && <div className={errorBoxClass}>{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={btnSecondaryClass}>Cancel</button>
            <button type="submit" disabled={loading} className={btnPrimaryClass}>{loading ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
