"use client";

import { useMemo, useState } from "react";
import SeverityBadge from "@/components/SeverityBadge";
import Modal from "@/components/Modal";
import type { Finding, Severity } from "@/lib/types";
import { motion, useReducedMotion } from "framer-motion";
import { humanizeFileLabel } from "@/lib/business-copy";
import {
  btnGhostClass,
  cardClass,
  chipActiveClass,
  chipClass,
  chipIdleClass,
  emptyStateClass,
} from "@/lib/ui";
import { listContainer, listItem } from "@/components/PageEnter";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export default function FindingsPanel({ findings }: { findings: Finding[] }) {
  const [activeSeverities, setActiveSeverities] = useState<Set<Severity>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Finding | null>(null);
  const [copied, setCopied] = useState(false);
  const reduced = useReducedMotion();

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) c[f.severity]++;
    return c;
  }, [findings]);

  const visible = useMemo(() => {
    if (activeSeverities.size === 0) return findings;
    return findings.filter((f) => activeSeverities.has(f.severity));
  }, [findings, activeSeverities]);

  const byCategory = useMemo(() => {
    return visible.reduce<Record<string, Finding[]>>((acc, f) => {
      (acc[f.category] ??= []).push(f);
      return acc;
    }, {});
  }, [visible]);

  function toggleSeverity(s: Severity) {
    setActiveSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function toggleCollapsed(category: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  async function copyFinding(f: Finding) {
    const text = `${f.title}\n${f.detail}${
      f.recommendation ? `\nWhat to do: ${f.recommendation}` : ""
    }`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable — nothing to recover, fail silently.
    }
  }

  if (findings.length === 0) {
    return (
      <div className={`${emptyStateClass} text-signal-pass`}>
        No issues that need attention were found in this run.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {SEVERITY_ORDER.filter((s) => counts[s] > 0).map((s) => {
          const active = activeSeverities.has(s);
          return (
            <button
              key={s}
              onClick={() => toggleSeverity(s)}
              className={`${chipClass} ${
                active ? chipActiveClass : chipIdleClass
              }`}
            >
              {s} · {counts[s]}
            </button>
          );
        })}
        {activeSeverities.size > 0 && (
          <button
            onClick={() => setActiveSeverities(new Set())}
            className="text-[11px] font-mono text-mist hover:text-chalk underline underline-offset-2 ml-1"
          >
            clear
          </button>
        )}
        <span className="text-[11px] font-mono text-mist ml-auto">
          {visible.length} of {findings.length} shown
        </span>
      </div>

      {visible.length === 0 ? (
        <div className={emptyStateClass}>
          No findings match the selected severity filter.
        </div>
      ) : (
        <motion.div
          className="space-y-4"
          variants={reduced ? undefined : listContainer}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          {Object.entries(byCategory).map(([category, categoryFindings]) => {
            const isCollapsed = collapsed.has(category);
            return (
              <motion.div key={category} className={`${cardClass} overflow-hidden`} variants={reduced ? undefined : listItem}>
                <button
                  onClick={() => toggleCollapsed(category)}
                  className="w-full px-5 py-2.5 bg-panel2/40 border-b border-line text-sm font-medium flex items-center justify-between hover:bg-panel2/70 transition-colors"
                >
                  <span>
                    {category} <span className="text-mist font-mono text-xs">({categoryFindings.length})</span>
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`text-mist transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-line">
                    {categoryFindings.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelected(f)}
                        className="w-full text-left px-5 py-3 flex items-start justify-between gap-4 hover:bg-panel2/40 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{f.title}</span>
                            <SeverityBadge severity={f.severity} />
                          </div>
                          <div className="text-sm text-mist">{f.detail || f.title}</div>
                          {f.file && (
                            <div className="text-xs text-mist mt-1">
                              Area: {humanizeFileLabel(f.file)}
                            </div>
                          )}
                          {f.recommendation ? (
                            <div className="text-xs text-signal-info mt-1.5">→ {f.recommendation}</div>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title} widthClass="max-w-lg">
        {selected && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <SeverityBadge severity={selected.severity} />
              <span className="text-xs text-mist uppercase tracking-wider">{selected.category}</span>
            </div>
            <div className="text-sm mb-3">{selected.detail || selected.title}</div>
            {selected.file && (
              <div className="text-xs text-mist bg-panel2 border border-line rounded-xl px-3 py-2 mb-3">
                Area: {humanizeFileLabel(selected.file)}
              </div>
            )}
            {selected.recommendation ? (
              <div className="border-l-2 border-signal-info/40 pl-3 text-sm text-signal-info mb-4">
                {selected.recommendation}
              </div>
            ) : null}
            <button
              onClick={() => copyFinding(selected)}
              className={btnGhostClass}
            >
              {copied ? "Copied" : "Copy finding"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
