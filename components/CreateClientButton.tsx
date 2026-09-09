"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { createClientAction } from "@/app/dashboard/actions";
import PasswordField from "@/components/PasswordField";
import { btnPrimaryClass, btnSecondaryClass, errorBoxClass, fieldClass } from "@/lib/ui";

const inputClass = fieldClass;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CreateClientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [withUser, setWithUser] = useState(true);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setSlug("");
    setContactEmail("");
    setWithUser(true);
    setUserName("");
    setUserEmail("");
    setUserPassword("");
    setShowPassword(false);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createClientAction({
      name,
      slug,
      contactEmail,
      user: withUser ? { name: userName, email: userEmail, password: userPassword } : undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={btnPrimaryClass}
      >
        Create client
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create client" widthClass="max-w-lg">
        <form onSubmit={onSubmit} className="space-y-3.5">
          <Field label="Organization name">
            <input
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(slugify(e.target.value));
              }}
              className={inputClass}
              placeholder="Enter your Organization Name"
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClass}
              placeholder="contact@ipsy.com"
            />
          </Field>

          <label className="flex items-center gap-2 text-xs text-mist pt-1">
            <input type="checkbox" checked={withUser} onChange={(e) => setWithUser(e.target.checked)} />
            Also create the first client user
          </label>

          {withUser && (
            <div className="grid sm:grid-cols-2 gap-x-3 gap-y-3.5 border border-line rounded-2xl p-3.5">
              <Field label="User name">
                <input required={withUser} value={userName} onChange={(e) => setUserName(e.target.value)} className={inputClass} />
              </Field>
              <Field label="User email">
                <input
                  type="email"
                  required={withUser}
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Password">
                  <PasswordField
                    required={withUser}
                    value={userPassword}
                    onChange={setUserPassword}
                    show={showPassword}
                    onToggleShow={() => setShowPassword((v) => !v)}
                  />
                </Field>
              </div>
            </div>
          )}

          {error && <div className={errorBoxClass}>{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={btnSecondaryClass}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={btnPrimaryClass}>
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-chalk mb-1">{label}</label>
      {children}
    </div>
  );
}
