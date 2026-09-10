"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClass = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  widthClass?: string;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const dialog = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            onClick={onClose}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          />
          <motion.div
            className={`relative w-full ${widthClass} min-w-0 bg-panel border border-line rounded-2xl md:rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/40 max-h-[85vh] overflow-y-auto overflow-x-hidden scrollbar-hidden`}
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {(title || subtitle) && (
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-line sticky top-0 bg-panel z-10 rounded-t-2xl md:rounded-t-3xl">
                <div className="pr-4 min-w-0">
                  {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
                  {subtitle ? <p className="text-xs text-mist mt-0.5">{subtitle}</p> : null}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-mist hover:text-chalk hover:bg-panel2 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="p-5 min-w-0 overflow-x-hidden">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(dialog, document.body);
}
