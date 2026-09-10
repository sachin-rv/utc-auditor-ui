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
  const [branch, setBranch] = useState("main");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("daily");
  const [minCoverage, setMinCoverage] = useState("80");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createProjectAction(clientId, {
      name,
      slug,
      repositoryUrl: repositoryUrl || undefined,
      branch: branch || undefined,
      description: description || undefined,
      schedule: schedule || undefined,
      minCoverageThreshold: minCoverage ? Number(minCoverage) : undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setName("");
    setSlug("");
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-chalk mb-1.5">Branch</label>
              <input value={branch} onChange={(e) => setBranch(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-chalk mb-1.5">Schedule</label>
              <select value={schedule} onChange={(e) => setSchedule(e.target.value)} className={inputClass}>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="manual">manual</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-chalk mb-1.5">Min coverage threshold</label>
            <input
              type="number"
              min={0}
              max={100}
              value={minCoverage}
              onChange={(e) => setMinCoverage(e.target.value)}
              className={inputClass}
            />
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
