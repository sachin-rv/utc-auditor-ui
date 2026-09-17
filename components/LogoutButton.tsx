"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { btnGhostClass, btnPrimaryClass, btnSecondaryClass } from "@/lib/ui";

export default function LogoutButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function doLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setConfirming(true)} className={btnGhostClass}>
        Sign out
      </button>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Sign out?" widthClass="max-w-xs" id="modal-logout">
        <p className="text-sm text-mist mb-5">You'll need to sign back in to view the audit console.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirming(false)} className={btnSecondaryClass}>
            Cancel
          </button>
          <button
            onClick={doLogout}
            disabled={loading}
            className="inline-flex items-center justify-center font-semibold text-sm rounded-full px-4 py-2 bg-signal-fail text-onaccent hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </Modal>
    </>
  );
}
