"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { createUserAction } from "@/app/dashboard/actions";
import PasswordField from "@/components/PasswordField";
import type { UserRole } from "@/lib/api-types";
import { btnPrimaryClass, btnSecondaryClass, errorBoxClass, fieldClass } from "@/lib/ui";

const inputClass = fieldClass;

export default function CreateUserButton({
  clients = [],
  defaultClientId,
}: {
  clients?: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("client");
  const [linkExisting, setLinkExisting] = useState(!!defaultClientId);
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ email: string; clientId: string | null } | null>(null);

  const lockedToClient = Boolean(defaultClientId);

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRole("client");
    setLinkExisting(!!defaultClientId);
    setClientId(defaultClientId ?? "");
    setError(null);
    setCreated(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createUserAction({
      name,
      email,
      password,
      role,
      clientId: role === "client" && (lockedToClient || linkExisting) ? clientId || defaultClientId : undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCreated({ email: result.data.email, clientId: result.data.clientId });
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className={btnSecondaryClass}
      >
        Create user
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Create user"
        widthClass="max-w-lg"
      >
        {created ? (
          <div className="space-y-3">
            <p className="text-sm">
              Created <span className="font-mono text-chalk">{created.email}</span>
              {created.clientId ? (
                <>
                  {" "}
                  for client <span className="font-mono text-chalk">{created.clientId}</span>
                </>
              ) : null}
              .
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className={btnPrimaryClass}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3.5">
            {!lockedToClient && (
              <div>
                <label className="block text-sm font-medium text-chalk mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className={inputClass}
                >
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-chalk mb-1">Name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Enter User Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-chalk mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="Enter User Email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-chalk mb-1">Password</label>
              <PasswordField
                required
                value={password}
                onChange={setPassword}
                placeholder="Client@123"
                show={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
              />
            </div>

            {role === "client" && !lockedToClient && (
              <>
                <label className="flex items-center gap-2 text-xs text-mist pt-1">
                  <input
                    type="checkbox"
                    checked={linkExisting}
                    onChange={(e) => setLinkExisting(e.target.checked)}
                  />
                  Link to an existing client
                </label>
                {linkExisting ? (
                  <div>
                    <label className="block text-sm font-medium text-chalk mb-1">Client</label>
                    <select
                      required
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select client…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs text-mist">
                    If no client is selected, the API creates a client organization from this email domain.
                  </p>
                )}
              </>
            )}

            {role === "client" && lockedToClient && (
              <p className="text-xs text-mist">This user will be linked to the current client.</p>
            )}

            {error && <div className={errorBoxClass}>{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className={btnSecondaryClass}
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} className={btnPrimaryClass}>
                {loading ? "Creating…" : "Create user"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
