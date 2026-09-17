"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import ApiKeyReveal from "@/components/ApiKeyReveal";
import { createApiKeyAction, regenerateApiKeyAction } from "@/app/dashboard/actions";
import { btnGhostClass, btnPrimaryClass, btnSecondaryClass, errorBoxClass, fieldClass } from "@/lib/ui";

type Mode = "regenerate" | "additional";

export default function CreateApiKeyButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("regenerate");
  const [name, setName] = useState(`${projectName} CI Key`);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ plainKey: string; message: string } | null>(null);

  const isRotate = mode === "regenerate";

  function reset() {
    setMode("regenerate");
    setName(`${projectName} CI Key`);
    setError(null);
    setCreated(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = isRotate
      ? await regenerateApiKeyAction(projectId, name)
      : await createApiKeyAction(projectId, name);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCreated({ plainKey: result.data.plainKey, message: result.data.message });
  }

  function close() {
    setOpen(false);
    reset();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className={btnGhostClass}
      >
        Rotate API key
      </button>
      <Modal
        open={open}
        onClose={close}
        title={isRotate ? "Rotate API key" : "Add additional API key"}
        subtitle={
          isRotate
            ? "Deactivates existing keys for this project and issues a new one."
            : "Creates another active key without rotating the current one."
        }
        widthClass="max-w-md"
        id="modal-api-key"
      >
        {created ? (
          <ApiKeyReveal
            plainKey={created.plainKey}
            message={created.message}
            onDone={close}
          />
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <p className="text-sm text-mist">
              {isRotate
                ? "Update CI secrets immediately — old keys stop working after rotation."
                : "Prefer rotate unless you need a second key (for example a backup pipeline)."}
            </p>
            <div>
              <label className="block text-sm font-medium text-chalk mb-1.5">
                Key name {isRotate ? "(optional)" : ""}
              </label>
              <input
                required={!isRotate}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldClass}
                placeholder={`${projectName} CI Key`}
              />
            </div>
            {error && <div className={errorBoxClass}>{error}</div>}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode(isRotate ? "additional" : "regenerate");
                  setError(null);
                }}
                className="text-xs text-mist hover:text-chalk underline-offset-2 hover:underline"
              >
                {isRotate ? "Create additional key instead" : "Rotate existing key instead"}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={close} className={btnSecondaryClass}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className={btnPrimaryClass}>
                  {loading ? "Generating…" : isRotate ? "Rotate key" : "Generate key"}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
