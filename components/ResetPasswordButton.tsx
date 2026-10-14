"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { resetPasswordAction } from "@/app/dashboard/actions";
import PasswordField from "@/components/PasswordField";
import { btnPrimaryClass, btnSecondaryClass, errorBoxClass, fieldClass } from "@/lib/ui";

export default function ResetPasswordButton({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [doneEmail, setDoneEmail] = useState<string | null>(null);

  function reset() {
    setEmail(defaultEmail);
    setPassword("");
    setConfirm("");
    setShowPassword(false);
    setShowConfirm(false);
    setError(null);
    setDoneEmail(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await resetPasswordAction({ email, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDoneEmail(result.data.email);
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
        Reset password
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Reset password"
        subtitle="Sets a new password for an existing account."
        widthClass="max-w-lg"
        id="modal-reset-password"
      >
        {doneEmail ? (
          <div className="space-y-3">
            <p className="text-sm">
              Password updated for <span className="font-mono text-chalk">{doneEmail}</span>.
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
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-chalk mb-1">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
                placeholder="user@company.com"
              />
            </div>
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-chalk mb-1">
                New password
              </label>
              <PasswordField
                id="reset-password"
                required
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
              />
            </div>
            <div>
              <label htmlFor="reset-confirm" className="block text-sm font-medium text-chalk mb-1">
                Confirm password
              </label>
              <PasswordField
                id="reset-confirm"
                required
                value={confirm}
                onChange={setConfirm}
                show={showConfirm}
                onToggleShow={() => setShowConfirm((v) => !v)}
              />
            </div>
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
                {loading ? "Saving…" : "Update password"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
